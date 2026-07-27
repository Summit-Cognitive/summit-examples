/**
 * Minimal Summit Cognitive Decision Receipt client — fetch only, no dependencies.
 *
 *   SUMMIT_API_KEY=sk_decrec_... npx tsx evaluate.ts
 *
 * Docs: https://docs.summitcognitive.ai
 */

const BASE = process.env.SUMMIT_BASE ?? "https://decrec.summitcognitive.ai";

export type Verdict = "ALLOWED" | "BLOCKED" | "ESCALATED";
export type Admissibility = "ACCEPTED" | "NON_DETERMINISTIC" | "REJECTED";

export interface ClaimInput {
  claim_id: string;
  entity: string;
  claim: string;
  /** At least one evidence source is required — a decision with no evidence is not evaluable. */
  sources: Array<Record<string, unknown>>;
  expected_replay_match?: boolean;
  action?: Record<string, unknown>;
  decision_rights?: Array<Record<string, unknown>>;
  policyConfig?: Record<string, unknown>;
}

export interface EvaluateResponse {
  policy: { verdict: Verdict; reason?: string; rules?: unknown[] };
  replay: { passed?: boolean; replay_hash?: string };
  receipt: {
    receipt_id: string;
    admissibility?: { status: Admissibility };
    attestations?: unknown[];
  };
}

async function post<T>(path: string, body: unknown, apiKey?: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // 400 validation, 401 bad key, 429 rate limit — the body explains which.
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json() as Promise<T>;
}

/** Issue a free-tier API key (100 requests/hour). */
export const signup = (email: string) =>
  post<{ api_key: string }>("/v1/signup", { email }).then((r) => r.api_key);

/** Submit a claim and receive a signed Decision Receipt. */
export const evaluate = (apiKey: string, claim: ClaimInput) =>
  post<EvaluateResponse>("/v1/evaluate", claim, apiKey);

/**
 * Check a receipt's signature and hash chain. No API key required — a record
 * you can only check with the issuer's permission is not independently verifiable.
 */
export const verify = (receipt: EvaluateResponse["receipt"]) =>
  post<Record<string, unknown>>("/v1/verify", receipt);

async function main() {
  const apiKey =
    process.env.SUMMIT_API_KEY ??
    (await signup(
      process.env.SIGNUP_EMAIL ??
        (() => {
          throw new Error("Set SUMMIT_API_KEY, or SIGNUP_EMAIL to request one.");
        })(),
    ));

  const result = await evaluate(apiKey, {
    claim_id: `ts-example-${Date.now()}`,
    entity: "repo:example/service",
    claim: "Pull request #1 is safe to merge to main.",
    expected_replay_match: true,
    action: { type: "merge", repo: "example/service", pull_request: 1 },
    sources: [
      { type: "ci", name: "github-actions", conclusion: "success" },
      { type: "code-review", reviewer: "reviewer@example.com", state: "approved" },
      { type: "test", suite: "unit", passed: 412, failed: 0 },
    ],
  });

  console.table({
    verdict: result.policy.verdict,
    reason: result.policy.reason ?? "-",
    replayPassed: result.replay.passed,
    receiptId: result.receipt.receipt_id,
    // Policy verdict and admissibility answer different questions: a decision
    // can be ALLOWED and still fail admissibility if it did not replay.
    admissibility: result.receipt.admissibility?.status,
  });

  console.log("verification:", await verify(result.receipt));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
