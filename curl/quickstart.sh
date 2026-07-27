#!/usr/bin/env bash
# Summit Cognitive — Decision Receipt API quickstart.
#
#   evaluate a claim -> read the verdict -> verify the receipt
#
# Requires: curl, jq
# Docs: https://docs.summitcognitive.ai

set -euo pipefail

BASE="${SUMMIT_BASE:-https://decrec.summitcognitive.ai}"

command -v jq >/dev/null || { echo "jq is required: https://jqlang.github.io/jq/" >&2; exit 1; }

# ---------------------------------------------------------------- 1. health
echo "==> Service health"
curl -fsS "$BASE/health" | jq .

# ------------------------------------------------------------------- 2. key
if [[ -z "${API_KEY:-}" ]]; then
  echo "==> No API_KEY set; requesting a free-tier key (100 req/hr)"
  : "${SIGNUP_EMAIL:?Set SIGNUP_EMAIL=you@example.com, or export API_KEY directly}"
  API_KEY=$(curl -fsS "$BASE/v1/signup" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SIGNUP_EMAIL\"}" | jq -r .api_key)
  echo "    issued: ${API_KEY:0:14}..."
fi

# -------------------------------------------------------------- 3. evaluate
echo "==> Evaluating a claim"
RESPONSE=$(curl -fsS "$BASE/v1/evaluate" \
  -H "X-API-Key: $API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "claim_id": "quickstart-'"$(date +%s)"'",
    "entity": "repo:example/service",
    "claim": "Pull request #1 is safe to merge to main.",
    "expected_replay_match": true,
    "action": { "type": "merge", "repo": "example/service", "pull_request": 1 },
    "sources": [
      { "type": "ci",          "name": "github-actions", "conclusion": "success" },
      { "type": "code-review", "reviewer": "reviewer@example.com", "state": "approved" },
      { "type": "test",        "suite": "unit", "passed": 412, "failed": 0 }
    ]
  }')

echo "$RESPONSE" | jq '{
  verdict:       .policy.verdict,
  reason:        .policy.reason,
  replay_passed: .replay.passed,
  receipt_id:    .receipt.receipt_id,
  admissibility: .receipt.admissibility.status
}'

# ---------------------------------------------------------------- 4. verify
echo "==> Verifying the receipt (no API key required)"
echo "$RESPONSE" | jq '.receipt' > /tmp/summit-receipt.json
curl -fsS "$BASE/v1/verify" \
  -H 'Content-Type: application/json' \
  -d @/tmp/summit-receipt.json | jq .

# ------------------------------------------------------- 5. the public key
echo "==> Ed25519 public key, for offline verification"
curl -fsS "$BASE/v1/keys/server"

echo
echo "Done. A receipt that verifies is proof about the record — not a warranty"
echo "that the answer was correct. Correctness stays a human judgement."
