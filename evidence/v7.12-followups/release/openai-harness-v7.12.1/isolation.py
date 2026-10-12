"""Optional persistent worker with a parent-enforced deadline. No remote cancellation claim."""

import multiprocessing
import threading
import time

from model_adapters import ModelError, MockAdapter


def worker(connection, adapter):
    try:
        while True:
            operation, payload, timeout = connection.recv()
            if operation == "close":
                return
            adapter.timeout_seconds = timeout
            try:
                if operation == "read_detail":
                    from context import read_detail
                    result = read_detail(*payload)
                else:
                    result = getattr(adapter, operation)(payload)
                connection.send(("ok", result))
            except Exception as exc:
                if operation == "read_detail" and isinstance(exc, (ValueError, KeyError, TypeError)):
                    connection.send(("tool_error", str(exc)))
                else:
                    connection.send(("error", str(exc) if isinstance(exc, ModelError) else type(exc).__name__,
                                     getattr(exc, "retryable", False), getattr(exc, "usage", None)))
    except (EOFError, BrokenPipeError):
        pass
    finally:
        connection.close()


class IsolatedAdapter:
    """Owns adapter state in one spawn worker, preserving cache across requests."""

    def __init__(self, adapter):
        self.adapter = adapter
        self.name = adapter.name
        self.is_mock = isinstance(adapter, MockAdapter)
        self.timeout_seconds = 60
        self.process = None
        self.connection = None
        self.stopped = False

    def __enter__(self):
        return self

    def __exit__(self, *unused):
        self.close()

    def close(self):
        self.stopped = True
        if self.process is not None:
            if self.process.is_alive():
                self.process.terminate()
            self.process.join(0.2)
            if self.process.is_alive():
                self.process.kill()
                self.process.join(0.2)
        if self.connection is not None:
            self.connection.close()

    def call(self, operation, payload):
        if self.stopped:
            raise ModelError("Isolated worker already stopped; no further calls allowed")
        deadline = time.monotonic() + self.timeout_seconds
        if self.process is None:
            context = multiprocessing.get_context("spawn")
            self.connection, child = context.Pipe()
            self.process = context.Process(target=worker, args=(child, self.adapter), daemon=True)
            try:
                self.process.start()
            except Exception as exc:
                self.process = None
                self.close()
                raise ModelError("Cannot start isolated adapter: " + type(exc).__name__) from None
            finally:
                child.close()
        # Neither sending nor receiving a large payload may block deadline checks.
        completed, messages, errors = threading.Event(), [], []

        def exchange():
            try:
                self.connection.send((operation, payload, self.timeout_seconds))
                messages.append(self.connection.recv())
            except Exception as exc:
                errors.append(type(exc).__name__)
            finally:
                completed.set()

        transfer = threading.Thread(target=exchange, daemon=True)
        transfer.start()
        try:
            if not completed.wait(max(0, deadline - time.monotonic())):
                self.close()
                raise ModelError("Hard timeout: local worker terminated; remote usage may remain unknown")
        finally:
            transfer.join(0.2)
        if errors:
            self.close()
            raise ModelError("Isolated request transfer failed: " + errors[0])
        message = messages[0]
        if message[0] == "tool_error":
            raise ValueError(message[1])
        if message[0] == "error":
            raise ModelError(message[1], message[2], message[3])
        return message[1]

    def count(self, request):
        return self.call("count", request)

    def generate(self, request):
        return self.call("generate", request)

    def read_detail(self, *arguments):
        return self.call("read_detail", arguments)
