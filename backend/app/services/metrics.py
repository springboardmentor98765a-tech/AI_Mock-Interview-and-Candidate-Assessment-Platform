"""
Real request telemetry.

Every number this module reports is measured from an actual request that this
process served — nothing is estimated. Latency is wall-clock time around the
route handler.

Deliberately in-memory: writing a row per request would add database load to
every single call and skew the very latency it is measuring. The trade-off is
that counters reset when the process restarts, so the API reports
`window_start` and callers must present the figures as "since <that time>"
rather than as all-time totals.

Requests are keyed by the matched *route template* (`/api/interviews/{id}`),
not the raw path, so ids do not explode the key space.
"""

import threading
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List


class _EndpointStat:
    __slots__ = ("count", "errors", "total_ms", "max_ms")

    def __init__(self) -> None:
        self.count = 0
        self.errors = 0
        self.total_ms = 0.0
        self.max_ms = 0.0


class MetricsStore:
    # Cap the number of distinct keys so an unmatched-path flood cannot grow
    # memory without bound.
    MAX_KEYS = 500

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_endpoint: Dict[str, _EndpointStat] = defaultdict(_EndpointStat)
        self._latencies: List[float] = []  # for percentiles
        self._max_latencies = 5000
        self.window_start = datetime.now(timezone.utc)

    def record(self, method: str, route: str, status_code: int, duration_ms: float) -> None:
        key = f"{method} {route}"
        with self._lock:
            if key not in self._by_endpoint and len(self._by_endpoint) >= self.MAX_KEYS:
                key = f"{method} <other>"

            stat = self._by_endpoint[key]
            stat.count += 1
            stat.total_ms += duration_ms
            stat.max_ms = max(stat.max_ms, duration_ms)
            if status_code >= 400:
                stat.errors += 1

            self._latencies.append(duration_ms)
            if len(self._latencies) > self._max_latencies:
                # keep the most recent window
                del self._latencies[: len(self._latencies) - self._max_latencies]

    def snapshot(self) -> dict:
        with self._lock:
            endpoints = [
                {
                    "endpoint": key,
                    "requests": stat.count,
                    "errors": stat.errors,
                    "avg_ms": round(stat.total_ms / stat.count, 1) if stat.count else 0.0,
                    "max_ms": round(stat.max_ms, 1),
                    "error_rate": round(stat.errors / stat.count * 100, 2) if stat.count else 0.0,
                }
                for key, stat in self._by_endpoint.items()
            ]
            latencies = sorted(self._latencies)
            total = sum(s["requests"] for s in endpoints)
            errors = sum(s["errors"] for s in endpoints)

        def pct(p: float) -> float:
            if not latencies:
                return 0.0
            index = min(int(len(latencies) * p), len(latencies) - 1)
            return round(latencies[index], 1)

        endpoints.sort(key=lambda s: s["requests"], reverse=True)

        return {
            "window_start": self.window_start.isoformat(),
            "total_requests": total,
            "total_errors": errors,
            "error_rate": round(errors / total * 100, 2) if total else 0.0,
            "avg_latency_ms": round(sum(latencies) / len(latencies), 1) if latencies else 0.0,
            "p95_latency_ms": pct(0.95),
            "p99_latency_ms": pct(0.99),
            "endpoints": endpoints,
        }

    def reset(self) -> None:
        with self._lock:
            self._by_endpoint.clear()
            self._latencies.clear()
            self.window_start = datetime.now(timezone.utc)


metrics = MetricsStore()


def route_template(request) -> str:
    """
    The matched route pattern, e.g. `/api/interviews/{interview_id}`.

    Falls back to `<unmatched>` for 404s so unknown paths collapse into one key
    instead of one per probe.
    """
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    return path or "<unmatched>"


async def timing_middleware(request, call_next):
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        # An unhandled exception is still a real request that took real time.
        duration_ms = (time.perf_counter() - started) * 1000
        metrics.record(request.method, route_template(request), 500, duration_ms)
        raise

    duration_ms = (time.perf_counter() - started) * 1000
    metrics.record(request.method, route_template(request), response.status_code, duration_ms)
    response.headers["X-Response-Time-ms"] = f"{duration_ms:.1f}"
    return response
