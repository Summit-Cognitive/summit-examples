"""Minimal Summit Cognitive Decision Receipt client — standard library only.

    export SUMMIT_API_KEY=sk_decrec_...
    python evaluate.py

Docs: https://docs.summitcognitive.ai
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

BASE = os.environ.get("SUMMIT_BASE", "https://decrec.summitcognitive.ai")


def _post(path: str, payload: dict[str, Any], api_key: str | None = None) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            **({"X-API-Key": api_key} if api_key else {}),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # 400 validation, 401 bad key, 429 rate limit — the body explains which.
        raise RuntimeError(f"{error.code} {error.reason}: {error.read().decode()}") from error


def signup(email: str) -> str:
    """Issue a free-tier API key (100 requests/hour)."""
    return _post("/v1/signup", {"email": email})["api_key"]


def evaluate(api_key: str, claim: dict[str, Any]) -> dict[str, Any]:
    """Submit a claim and receive a signed Decision Receipt."""
    return _post("/v1/evaluate", claim, api_key)


def verify(receipt: dict[str, Any]) -> dict[str, Any]:
    """Check a receipt's signature and hash chain. No API key required —
    a record you can only check with the issuer's permission is not
    independently verifiable."""
    return _post("/v1/verify", receipt)


def main() -> None:
    api_key = os.environ.get("SUMMIT_API_KEY")
    if not api_key:
        email = os.environ.get("SIGNUP_EMAIL")
        if not email:
            raise SystemExit("Set SUMMIT_API_KEY, or SIGNUP_EMAIL to request one.")
        api_key = signup(email)
        print(f"Issued key: {api_key[:14]}...")

    result = evaluate(
        api_key,
        {
            "claim_id": f"python-example-{int(time.time())}",
            "entity": "repo:example/service",
            "claim": "Pull request #1 is safe to merge to main.",
            "expected_replay_match": True,
            "action": {"type": "merge", "repo": "example/service", "pull_request": 1},
            "sources": [
                {"type": "ci", "name": "github-actions", "conclusion": "success"},
                {"type": "code-review", "reviewer": "reviewer@example.com", "state": "approved"},
                {"type": "test", "suite": "unit", "passed": 412, "failed": 0},
            ],
        },
    )

    policy = result["policy"]
    receipt = result["receipt"]

    print(f"verdict       : {policy['verdict']}")
    print(f"reason        : {policy.get('reason', '-')}")
    print(f"replay passed : {result['replay'].get('passed')}")
    print(f"receipt       : {receipt['receipt_id']}")
    print(f"admissibility : {receipt.get('admissibility', {}).get('status')}")

    # Policy verdict and admissibility answer different questions. A decision
    # can be ALLOWED by policy and still fail admissibility — most often
    # because it did not replay deterministically.
    print(f"verification  : {verify(receipt)}")


if __name__ == "__main__":
    main()
