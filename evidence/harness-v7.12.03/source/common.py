"""Shared validation, usage parsing, serialization, and atomic JSON writes."""


import hashlib
import json
import math
import tempfile
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def token_count(value):
    require(type(value) is int and value >= 0, "Token counts must be nonnegative integers")
    return value


def validate_usage(counts):
    """Validate a replaceable adapter's normalized counts before charging them."""
    if counts is None:
        return None
    require(isinstance(counts, dict), "Usage must be an object or null")
    require({"input_tokens", "output_tokens", "total_tokens", "cached_tokens", "source"} <= counts.keys(),
            "Missing normalized usage fields")
    for key in ("input_tokens", "output_tokens", "total_tokens"):
        token_count(counts[key])
    require(counts["total_tokens"] == counts["input_tokens"] + counts["output_tokens"], "Inconsistent total token usage")
    for field, parent in (("cached_tokens", "input_tokens"), ("reasoning_tokens", "output_tokens")):
        value = counts.get(field)
        require(value is None or token_count(value) <= counts[parent], "Invalid " + field)
    require(counts["source"] in ("provider", "estimated", "synthetic_estimate"), "Invalid usage source")
    return counts


def measure(response):
    usage = response.get("usage")
    require(isinstance(usage, dict), "Response has no measured usage; stopping")
    result = {k: token_count(usage.get(k)) for k in ("input_tokens", "output_tokens", "total_tokens")}
    require(result["total_tokens"] == result["input_tokens"] + result["output_tokens"],
            "Inconsistent total token usage")
    for detail, field, parent in [("input_tokens_details", "cached_tokens", "input_tokens"),
                                   ("output_tokens_details", "reasoning_tokens", "output_tokens")]:
        value = (usage.get(detail) or {}).get(field)
        result[field] = None if value is None else token_count(value)
        require(value is None or value <= result[parent], "Invalid " + field)
    result["output"] = "".join(part["text"] for item in response.get("output", [])
                               if item.get("type") == "message" for part in item.get("content", [])
                               if part.get("type") == "output_text")
    result["status"] = response.get("status", "unknown")
    result["response_id"] = response.get("id")
    result["model"] = response.get("model")
    return result


def save(path, report):
    # A fresh output path is claimed by main before requests begin.
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                     prefix=".token-harness-", delete=False) as handle:
        temporary = Path(handle.name)
        try:
            json.dump(report, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.close()
            temporary.replace(path)
        finally:
            if temporary.exists():
                temporary.unlink()


def encoded(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def append_json(path, value):
    with path.open("a", encoding="utf-8") as handle:
        handle.write(encoded(value) + "\n")


def read_journal(path):
    """A killed append may leave one incomplete final line, never a valid row."""
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.endswith("\n"):
                break
            yield json.loads(line)


def estimate(value):
    """Byte heuristic, NOT a tokenizer. Never label this provider usage."""
    return math.ceil(len((value if isinstance(value, str) else encoded(value)).encode()) / 4)


def usage(input_tokens, output_tokens, cached_tokens=None, source="estimated"):
    result = dict(input_tokens=token_count(input_tokens), output_tokens=token_count(output_tokens),
                  total_tokens=input_tokens + output_tokens, cached_tokens=cached_tokens,
                  reasoning_tokens=None, source=source)
    if cached_tokens is not None:
        require(0 <= token_count(cached_tokens) <= input_tokens, "Invalid cached token count")
    return result


def digest(value):
    return hashlib.sha256(encoded(value).encode()).hexdigest()


def positive(value):
    return type(value) is int and value > 0
