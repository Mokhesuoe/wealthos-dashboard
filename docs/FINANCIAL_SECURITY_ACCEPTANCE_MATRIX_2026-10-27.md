# WealthOS Financial & Security Acceptance Matrix — 27 October 2026

Status: TEST PLAN, not an acceptance certificate. Research-only; live capital remains locked.

| ID | Model/control | Independent expected result | Required evidence | State |
|---|---|---|---|---|
| F01 | v0.5 zero return | M100 initial + 12 x M10 = M220 | Node test and CSV parity | Existing automated arithmetic test; export parity pending |
| F02 | v0.5 debt | M1,000 liquid less M700 debt = M300 | Independent computation | Existing automated test |
| F03 | v0.5 distribution tax | 12 x (M100 personal + M100 distribution x 80%) = M2,160 | Test and CSV | Existing automated test; CSV pending |
| F04 | v0.5 APR | 12% APR with unpaid debt increases outstanding principal | Amortization schedule | Existing automated test; independent schedule pending |
| F05 | v0.5 cash shortage | No cash for required debt payment must fail closed | Test and UI warning | Existing automated test |
| F06 | v0.5 inflation | Real value = nominal / (1+inflation)^years | Independent worksheet | Pending |
| F07 | v0.5 liquidity haircut | M1,000 equity with 50% haircut = M500 liquidity adjusted | Test | Existing automated test |
| F08 | v0.5 CSV export | CSV rows, headers, amounts and periods equal UI model outputs | Parse generated CSV; no formula injection | Pending |
| F09 | v0.6 ownership dilution | Owner cash flow follows ownerSharePct, including 0% and 100% boundaries | Independent cash-flow schedule | Pending |
| F10 | v0.6 downside | Revenue decline, margin compression, cost inflation, maintenance capex, debt service and working capital | Independent monthly schedule | Pending |
| F11 | v0.8 capital allocation | Allocated owner funding <= available funding, concentration <= policy, minimum remaining liquidity | Independent allocation check | Partial existing automated tests; comprehensive acceptance pending |
| F12 | v0.8 evidence gating | Missing diligence or stale evidence must not imply investment approval | Negative tests | Partial existing tests; acceptance pending |
| S01 | Anon access | 0 rows for restricted valuation, event risk and acceptance data | Authenticated REST negative-path test | Pending |
| S02 | Authenticated non-member | 0 restricted rows | Dedicated non-member test identity | Pending |
| S03 | Member AAL1 | 0 restricted rows | Real AAL1 session test | Pending |
| S04 | Member AAL2 | Read permitted without privilege escalation | Real AAL2 session test | Snapshot diagnostics observed; formal test pending |
| S05 | Privileged write denial | Browser session cannot write research acceptance or trade eligibility | Authenticated negative-path test | Pending |
| S06 | Secret handling | No service role or secret credentials in frontend | Source/CI checks | Partial static checks |
| S07 | Quality-run isolation | Passing research check never grants trade eligibility | DB constraint and code tests | DB constraint exists; negative-path test pending |

## Acceptance rules
- A test is PASS only with reproducible logs and independently checked expected results.
- Never execute write/destructive negative-path tests against production financial data; use isolated test identities and rollback-safe staging.
- Keep AAL2 and membership enforced; do not weaken RLS to make tests pass.
- No automated strategy promotion, brokerage connection, live trade or promise of return.
- Release requires all critical financial and security rows PASS; otherwise document blockers and an explicit decision.
