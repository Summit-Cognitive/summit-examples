# Summit Cognitive — examples

Copy-pasteable recipes for the [Decision Receipt API](https://docs.summitcognitive.ai). Every example runs against the live service at `https://decrec.summitcognitive.ai`.

```
curl/         Shell recipes — signup, evaluate, verify, simulate, ledger
python/       Minimal client, standard library only
typescript/   Minimal client, fetch only
```

## Get a key

Read endpoints (`/health`, `/v1/status`, `/v1/verify`, `/v1/keys/server`, `/v1/ledger/stats`) need no authentication. Write endpoints need an API key:

```bash
export API_KEY=$(curl -s https://decrec.summitcognitive.ai/v1/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}' | jq -r .api_key)
```

Free tier is 100 requests/hour. Pass the key as `X-API-Key: $API_KEY` or `Authorization: Bearer $API_KEY`.

## The canonical path

Evaluate a claim, pull the receipt out, verify it:

```bash
./curl/quickstart.sh
```

That script does three things — issues a claim with evidence attached, reads back the policy verdict and replay determination, and verifies the resulting receipt's signature. If it prints a verdict and a passing verification, your integration works.

## What you get back

| Field | Meaning |
| --- | --- |
| `policy.verdict` | `ALLOWED` · `BLOCKED` · `ESCALATED` |
| `replay.passed` | Whether the same inputs reproduce the same outcome |
| `receipt.receipt_id` | Handle for the ledger and verification endpoints |
| `receipt.admissibility.status` | `ACCEPTED` · `NON_DETERMINISTIC` · `REJECTED` |

Policy verdict and admissibility status are different questions. A decision can be authorized by policy and still not be admissible — most often because it did not replay deterministically.

## Related

- **Schemas and worked documents** — [decision-receipt-spec](https://github.com/Summit-Cognitive/decision-receipt-spec)
- **Full recipe list** — [docs.summitcognitive.ai/guides/examples](https://docs.summitcognitive.ai/guides/examples)
- **API reference** — [docs.summitcognitive.ai/api/reference](https://docs.summitcognitive.ai/api/reference)

## License

[CC BY 4.0](LICENSE) — use these snippets in your own code freely.

---

<sub><a href="https://github.com/Summit-Cognitive">Summit Cognitive</a> · <a href="https://summitcognitive.ai">summitcognitive.ai</a> · brian@summitcognitive.ai</sub>
