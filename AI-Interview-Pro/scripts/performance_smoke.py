#!/usr/bin/env python3
"""Small dependency-free API latency smoke test for Module 10."""
import argparse
import concurrent.futures
import json
import statistics
import time
import urllib.request


def request(url: str, timeout: float) -> tuple[float, int]:
    started = time.perf_counter()
    with urllib.request.urlopen(url, timeout=timeout) as response:
        response.read()
        status = response.status
    return (time.perf_counter() - started) * 1000, status


def percentile(values, percentage):
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((len(ordered) - 1) * percentage))
    return round(ordered[index], 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000/health/ready")
    parser.add_argument("--requests", type=int, default=40)
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument("--timeout", type=float, default=5)
    parser.add_argument("--max-p95-ms", type=float, default=500)
    args = parser.parse_args()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        results = list(pool.map(lambda _: request(args.url, args.timeout), range(args.requests)))
    latencies = [latency for latency, status in results if status == 200]
    report = {
        "url": args.url,
        "requests": args.requests,
        "concurrency": args.concurrency,
        "successful": len(latencies),
        "mean_ms": round(statistics.mean(latencies), 2) if latencies else None,
        "p50_ms": percentile(latencies, .50) if latencies else None,
        "p95_ms": percentile(latencies, .95) if latencies else None,
        "threshold_ms": args.max_p95_ms,
    }
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if len(latencies) == args.requests and report["p95_ms"] <= args.max_p95_ms else 1)


if __name__ == "__main__":
    main()
