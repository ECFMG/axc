"""Replaceable synchronous adapters. No adapter may retry internally."""

import hashlib
import json
import math
import os
import re
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from common import encoded, estimate, measure, require, token_count, usage


def validate_response(response):
    """Check the adapter envelope; malformed model tool arguments remain a task error."""
    require(isinstance(response, dict), "Adapter response must be an object")
    require(isinstance(response.get("status"), str) and isinstance(response.get("text"), str),
            "Adapter status and text must be strings")
    items = response.get("items")
    require(isinstance(items, list) and all(isinstance(item, dict) and isinstance(item.get("type"), str) for item in items),
            "Adapter items must be typed objects")
    for item in items:
        if item["type"] == "function_call":
            require(all(isinstance(item.get(key), str) for key in ("name", "call_id", "arguments")),
                    "Invalid tool-call envelope")


class ModelError(RuntimeError):
    def __init__(self, message, retryable=False, usage=None):
        super().__init__(message)
        self.retryable = retryable
        self.usage = usage


class TeachingHTTPAdapter:
    """Use the legacy teaching HTTP contract inside the same cancellable worker."""
    name = "teaching-http"

    def post(self, arguments):
        from harness import api_post
        return api_post(*arguments)


class OpenAIAdapter:
    name = "openai-responses"

    def __init__(self, timeout_seconds=60):
        require(bool(os.environ.get("OPENAI_API_KEY")), "Set OPENAI_API_KEY, or use --adapter mock")
        require(type(timeout_seconds) in (int, float) and math.isfinite(timeout_seconds) and timeout_seconds > 0,
                "HTTP timeout must be a positive finite number")
        self.timeout_seconds = timeout_seconds

    def post(self, path, payload):
        request = Request("https://api.openai.com/v1/" + path, data=encoded(payload).encode(),
                          headers={"Content-Type": "application/json",
                                   "Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]})
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                return json.load(response)
        except HTTPError as exc:
            counts = None
            try:
                body = json.load(exc)
                if isinstance(body, dict) and body.get("usage") is not None:
                    measured = measure(body)
                    counts = {key: measured[key] for key in ("input_tokens", "output_tokens", "total_tokens", "cached_tokens", "reasoning_tokens")}
                    counts["source"] = "provider"
            except (ValueError, TypeError, KeyError, AttributeError, OSError):
                pass
            raise ModelError("HTTP %s; request id %s" % (exc.code, exc.headers.get("x-request-id", "unknown")),
                             exc.code in (408, 429, 500, 502, 503, 504), counts) from None
        except (URLError, OSError, ValueError) as exc:
            raise ModelError("Transport/decoding failure: " + type(exc).__name__, True) from None

    def count(self, request):
        body = {key: request[key] for key in ("model", "input", "tools")}
        return {"tokens": token_count(self.post("responses/input_tokens", body).get("input_tokens")),
                "source": "provider_count"}

    def generate(self, request):
        response = self.post("responses", {**request, "store": False,
                                          "include": ["reasoning.encrypted_content"]})
        if response.get("usage") is not None:
            measured = measure(response)
            counts = {key: measured[key] for key in
                      ("input_tokens", "output_tokens", "total_tokens", "cached_tokens", "reasoning_tokens")}
            counts["source"] = "provider"
            text = measured["output"]
        else:
            text = "".join(p["text"] for item in response.get("output", []) if item.get("type") == "message"
                           for p in item.get("content", []) if p.get("type") == "output_text")
            counts = usage(estimate({k: request[k] for k in ("input", "tools")}),
                           estimate(response.get("output", [])))
        return {"items": response.get("output", []), "text": text, "usage": counts,
                "status": response.get("status", "unknown"), "model": response.get("model"),
                "response_id": response.get("id")}


class MockAdapter:
    """A deterministic record reader, not an LLM and not a semantic evaluator.

    Reads only submitted messages. Never sees task expectations or fixture objects.
    Simulates a full input-cache hit only for identical requests in one cache scope.
    """
    name = "mock-record-reader-v1"

    def __init__(self):
        self.cache = set()

    def count(self, request):
        return {"tokens": estimate({k: request[k] for k in ("input", "tools")}),
                "source": "synthetic_estimate"}

    def generate(self, request):
        messages = request["input"]
        current = [m["content"] for m in messages if m.get("role") == "user"][-1]
        match = re.search(r"Requested fields: ([\w., ]+)", current)
        keys = [k.strip() for k in match.group(1).split(",")] if match else []
        values, references = {}, []
        # Low-priority source data first, then assistant history, then user instructions.
        for role in (None, "assistant", "user", "developer", "system"):
            for message in messages:
                if message.get("role") != role:
                    continue
                text = message.get("output", "") if role is None else message.get("content", "")
                if not isinstance(text, str):
                    continue
                references.extend(re.findall(r"\[ref=([^\]]+)\]", text))
                for key, raw in re.findall(r"^(?:\d+\| )?([a-z][\w.]*)=(.+)$", text, re.MULTILINE):
                    try:
                        values[key] = json.loads(raw)
                    except ValueError:
                        values[key] = raw
        missing = [key for key in keys if key not in values]
        previous = [m for m in messages if m.get("type") == "function_call" and m.get("name") == "read_detail"]
        tried = {(json.loads(m["arguments"])["ref"], json.loads(m["arguments"])["query"]) for m in previous}
        target = next(((ref, key) for key in missing for ref in dict.fromkeys(references)
                       if (ref, key) not in tried), None)
        bounded = any("Omitted source handles remain searchable" in m.get("output", "") for m in messages)
        if bounded:
            target = next((("catalog", key) for key in missing if ("catalog", key) not in tried), None)
            if target is None:
                target = next((("chunk:" + ref, key) for key in missing for ref in reversed(list(dict.fromkeys(references)))
                               if ("chunk:" + ref, key) not in tried), None)
        if target:
            items = [{"type": "function_call", "name": "read_detail", "call_id": "detail_%s" % len(previous),
                      "arguments": encoded(dict(ref=target[0], query=target[1], start=0, limit=4096 if bounded and target[0].startswith("chunk:") else 10))}]
            text = ""
        else:
            text = encoded({key: values.get(key) for key in keys})
            items = [{"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": text}]}]
        count = self.count(request)["tokens"]
        fingerprint = hashlib.sha256(encoded(request).encode()).hexdigest()
        cached = count if fingerprint in self.cache else 0
        self.cache.add(fingerprint)
        out = estimate(items)
        cap = request["max_output_tokens"]
        status = "completed" if out <= cap else "incomplete"
        if status == "incomplete":
            items, text = [], ""
        return dict(items=items, text=text, usage=usage(count, min(out, cap), cached, "synthetic_estimate"),
                    status=status, model=request["model"], response_id=None)
