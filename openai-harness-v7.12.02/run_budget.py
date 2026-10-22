"""One durable, fail-closed token and call budget shared by all run actors."""

from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import tempfile
import time
import uuid


class BudgetExceeded(RuntimeError):
    pass


def _integer(value, name, positive=False):
    if type(value) is not int or value < int(positive):
        raise ValueError(name + " must be a " + ("positive" if positive else "nonnegative") + " integer")
    return value


def _name(value, name):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(name + " must be a nonempty string")
    return value


def _detail(counts, primary, alias, parent):
    values = [counts[key] for key in (primary, alias) if counts.get(key) is not None]
    if not values:
        return None
    if any(_integer(value, primary) > parent or value != values[0] for value in values):
        raise ValueError("Invalid " + primary)
    return values[0]


def _usage(value):
    """Only explicit counters are accepted; a preflight estimate is never usage."""
    try:
        if not isinstance(value, dict):
            return None
        source = value.get("source", "provider")
        if source not in ("provider", "estimated", "synthetic_estimate"):
            return None
        incoming = _integer(value["input_tokens"], "input_tokens")
        outgoing = _integer(value["output_tokens"], "output_tokens")
        total = incoming + outgoing
        if "total_tokens" in value and _integer(value["total_tokens"], "total_tokens") != total:
            return None
        cached = _detail(value, "cached_tokens", "cached_input_tokens", incoming)
        reasoning = _detail(value, "reasoning_output_tokens", "reasoning_tokens", outgoing)
        return dict(input_tokens=incoming, output_tokens=outgoing, total_tokens=total,
                    cached_tokens=cached, reasoning_output_tokens=reasoning, source=source)
    except (KeyError, TypeError, ValueError):
        return None


class SharedBudget:
    def __init__(self, path, limit_tokens=None, max_calls=None):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock_path = self.path.with_name(self.path.name + ".lock")
        for name, value in (("limit_tokens", limit_tokens), ("max_calls", max_calls)):
            if value is not None:
                _integer(value, name, positive=True)
        with self._locked():
            if self.path.exists():
                state = self._read()
                for name, value in (("limit_tokens", limit_tokens), ("max_calls", max_calls)):
                    if value is not None and value != state[name]:
                        raise ValueError("Shared budget configuration differs: " + name)
            else:
                if limit_tokens is None or max_calls is None:
                    raise ValueError("First shared budget initialization requires positive token and call limits")
                self._write(dict(schema=1, limit_tokens=limit_tokens, max_calls=max_calls,
                                 calls=[], reservations={}, actors={}, denied_reservations=[],
                                 budget_exhausted=False))

    @contextmanager
    def _locked(self):
        # Lock a stable sidecar: the ledger itself is atomically replaced on writes.
        with self.lock_path.open("a", encoding="utf-8") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(handle, fcntl.LOCK_UN)

    def _read(self):
        with self.path.open(encoding="utf-8") as handle:
            state = json.load(handle)
        if state.get("schema") != 1:
            raise ValueError("Unsupported shared budget ledger")
        return state

    def _write(self, state):
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=self.path.parent,
                                             prefix=".shared-budget-", delete=False) as handle:
                temporary = Path(handle.name)
                json.dump(state, handle, indent=2, allow_nan=False)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.path)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()

    @staticmethod
    def _view(state):
        view = json.loads(json.dumps(state))
        calls = view["calls"] = sorted(view["calls"], key=lambda call: call["sequence"])
        reservations = view["reservations"]
        view["pending_reservations"] = list(reservations.values())
        view["measured_tokens"] = sum(call["total_tokens"] for call in calls if call["source"] == "provider")
        view["estimated_tokens"] = sum(call.get("estimated_usage", {}).get("total_tokens", 0) for call in calls)
        view["reserved_tokens"] = sum(row["reservation_tokens"] for row in reservations.values())
        view["unknown_usage"] = any(call["source"] == "unknown" for call in calls)
        view["budget_used_or_reserved"] = (view["measured_tokens"] + view["reserved_tokens"] +
                                          sum(call["reservation_tokens"] for call in calls if call["source"] == "unknown"))
        view["calls_used"] = len(calls) + len(reservations)
        for actor, details in view["actors"].items():
            actor_calls = [call for call in calls if call["actor"] == actor]
            details["measured_tokens"] = sum(call["total_tokens"] for call in actor_calls if call["source"] == "provider")
            settled = not any(row["actor"] == actor for row in reservations.values())
            final_completed = bool(actor_calls and actor_calls[-1]["status"] == "completed")
            details["complete"] = (details["closed"] and settled and
                                   (final_completed or (details["deterministic"] and not actor_calls)) and
                                   all(call["source"] == "provider" for call in actor_calls))
        view["complete"] = (bool(view["actors"]) and all(row["complete"] for row in view["actors"].values()) and
                            not reservations and not view["unknown_usage"] and not view["budget_exhausted"])
        return view

    def snapshot(self):
        with self._locked():
            return self._view(self._read())

    def register_actor(self, actor):
        _name(actor, "actor")
        with self._locked():
            state = self._read()
            state["actors"].setdefault(actor, dict(closed=False, deterministic=False))
            self._write(state)

    def protect_actor(self, actor, tokens, calls=1):
        """Keep declared capacity available for a later actor before dispatch."""
        _name(actor, "actor")
        _integer(tokens, "protected tokens", positive=True)
        _integer(calls, "protected calls", positive=True)
        with self._locked():
            state = self._read()
            reserve = dict(tokens=tokens, calls=calls)
            previous = state.setdefault("actor_reserves", {}).get(actor)
            if previous is not None and previous != reserve:
                raise ValueError("Actor reserve configuration differs: " + actor)
            if tokens >= state["limit_tokens"] or calls >= state["max_calls"]:
                raise ValueError("Actor reserve must leave primary token and call capacity")
            state["actor_reserves"][actor] = reserve
            self._write(state)

    @staticmethod
    def _protected(state, actor):
        tokens, calls = 0, 0
        for name, reserve in state.get("actor_reserves", {}).items():
            if name == actor or state["actors"].get(name, {}).get("closed"):
                continue
            used = [row for row in state["calls"] if row["actor"] == name]
            pending = [row for row in state["reservations"].values() if row["actor"] == name]
            tokens += max(0, reserve["tokens"] - sum(row["total_tokens"] or 0 for row in used)
                          - sum(row["reservation_tokens"] for row in pending))
            calls += max(0, reserve["calls"] - len(used) - len(pending))
        return tokens, calls

    def close_actor(self, actor, deterministic=False):
        _name(actor, "actor")
        if type(deterministic) is not bool:
            raise ValueError("deterministic must be a boolean")
        with self._locked():
            state = self._read()
            if actor not in state["actors"]:
                raise ValueError("Actor is not registered: " + actor)
            state["actors"][actor].update(closed=True, deterministic=deterministic)
            self._write(state)

    def reopen_actor(self, actor):
        """Invalidate a deterministic finalization when its output write fails."""
        _name(actor, "actor")
        with self._locked():
            state = self._read()
            if actor not in state["actors"]:
                raise ValueError("Actor is not registered: " + actor)
            state["actors"][actor].update(closed=False, deterministic=False)
            self._write(state)

    def reserve(self, actor, input_bound, max_output_tokens, purpose, metadata=None):
        _name(actor, "actor")
        _name(purpose, "purpose")
        _integer(input_bound, "input_bound")
        _integer(max_output_tokens, "max_output_tokens", positive=True)
        if metadata is not None and not isinstance(metadata, dict):
            raise ValueError("metadata must be an object")
        metadata = json.loads(json.dumps(metadata or {}, allow_nan=False))
        reason = None
        with self._locked():
            state = self._read()
            details = state["actors"].setdefault(actor, dict(closed=False, deterministic=False))
            if details["closed"]:
                raise ValueError("Actor is already closed: " + actor)
            view = self._view(state)
            bound = input_bound + max_output_tokens
            protected_tokens, protected_calls = self._protected(state, actor)
            if view["unknown_usage"]:
                reason = "Shared budget blocked by unknown provider usage"
            elif state["budget_exhausted"]:
                reason = "Shared run budget is exhausted"
            elif view["calls_used"] + protected_calls >= state["max_calls"]:
                reason = "Shared run call budget exhausted before generation"
            elif view["budget_used_or_reserved"] + bound + protected_tokens > state["limit_tokens"]:
                reason = "Shared run token budget exhausted before generation"
            if reason:
                # Reviewer headroom denies this actor, not the remaining global pool.
                protected_denial = ((protected_tokens or protected_calls) and
                    view["calls_used"] < state["max_calls"] and
                    view["budget_used_or_reserved"] < state["limit_tokens"] and
                    not view["unknown_usage"] and not state["budget_exhausted"])
                if not protected_denial:
                    state["budget_exhausted"] = True
                state["denied_reservations"].append(dict(actor=actor, purpose=purpose, input_bound=input_bound,
                                                          max_output_tokens=max_output_tokens, reason=reason,
                                                          metadata=metadata))
                reservation_id = None
            else:
                reservation_id = uuid.uuid4().hex
                state["reservations"][reservation_id] = dict(reservation_id=reservation_id, actor=actor,
                    purpose=purpose, input_bound=input_bound, max_output_tokens=max_output_tokens,
                    reservation_tokens=bound, sequence=view["calls_used"] + 1, metadata=metadata)
            self._write(state)
        if reason:
            raise BudgetExceeded(reason)
        return reservation_id

    def settle(self, reservation_id, usage, model=None, status="completed", latency_ms=None):
        _name(status, "status")
        if model is not None and not isinstance(model, str):
            raise ValueError("model must be a string or null")
        if latency_ms is not None and (type(latency_ms) not in (int, float) or not 0 <= latency_ms < float('inf')):
            raise ValueError("latency_ms must be finite and nonnegative or null")
        counts = _usage(usage)
        with self._locked():
            state = self._read()
            previous = next((call for call in state["calls"] if call["reservation_id"] == reservation_id), None)
            if previous:
                if previous["settlement"] != dict(usage=counts, model=model, status=status, latency_ms=latency_ms):
                    raise ValueError("Conflicting duplicate budget settlement")
                return {key: value for key, value in previous.items() if key != "settlement"}
            if reservation_id not in state["reservations"]:
                raise ValueError("Unknown budget reservation")
            reservation = state["reservations"].pop(reservation_id)
            known = counts is not None and counts["source"] == "provider"
            record = {**reservation, "model": model, "status": status, "source": "provider" if known else "unknown",
                      "input_tokens": counts["input_tokens"] if known else None,
                      "output_tokens": counts["output_tokens"] if known else None,
                      "total_tokens": counts["total_tokens"] if known else None,
                      "cached_tokens": counts["cached_tokens"] if known else None,
                      "reasoning_output_tokens": counts["reasoning_output_tokens"] if known else None,
                      "cache_reset": reservation["metadata"].get("cache_reset"),
                      "latency_ms": latency_ms,
                      "settlement": dict(usage=counts, model=model, status=status, latency_ms=latency_ms)}
            if counts is not None and not known:
                record["estimated_usage"] = counts
            record["reservation_exceeded"] = bool(known and (counts["input_tokens"] > reservation["input_bound"] or
                                                              counts["output_tokens"] > reservation["max_output_tokens"]))
            if record["reservation_exceeded"]:
                state["budget_exhausted"] = True
            state["calls"].append(record)
            self._write(state)
            return {key: value for key, value in record.items() if key != "settlement"}

    def dispatch(self, adapter, request, actor, purpose, input_bound=None, metadata=None):
        """Dispatch one attempt. Retry policy belongs to the caller, using this method again."""
        model = request.get("model")
        if model is not None and not isinstance(model, str):
            raise ValueError("model must be a string or null")
        if input_bound is None:
            preflight = adapter.count(request)
            if not isinstance(preflight, dict):
                raise ValueError("Invalid adapter input count")
            input_bound = _integer(preflight.get("tokens"), "input_bound")
        reservation_id = self.reserve(actor, input_bound, request["max_output_tokens"], purpose, metadata)
        started = time.monotonic()
        try:
            response = adapter.generate(request)
        except BaseException as error:
            self.settle(reservation_id, getattr(error, "usage", None), model=model, status="failed",
                        latency_ms=1000 * (time.monotonic() - started))
            raise
        valid_response = (isinstance(response, dict) and isinstance(response.get("status"), str) and
                          bool(response["status"].strip()) and
                          (response.get("model") is None or isinstance(response["model"], str)))
        actual_model = response.get("model", model) if isinstance(response, dict) else model
        if actual_model is not None and not isinstance(actual_model, str):
            actual_model = model
        record = self.settle(reservation_id, response.get("usage") if isinstance(response, dict) else None,
                             model=actual_model,
                             status=response["status"] if valid_response else "invalid_response",
                             latency_ms=1000 * (time.monotonic() - started))
        if record["source"] == "unknown":
            raise ValueError("Provider response has no valid measured usage; shared budget blocked")
        if record["reservation_exceeded"]:
            raise BudgetExceeded("Provider usage exceeded its reservation; shared budget blocked")
        if not valid_response:
            raise ValueError("Invalid adapter response status")
        return response
