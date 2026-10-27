# WealthOS v0.8 — Release acceptance gate

**Status: NOT VERIFIED / DO NOT LABEL PRODUCTION-READY.** This file is an operator checklist, not an assertion that a deployment exists or that tests passed.

## 1. Automated source checks (blocking)
Run from the repository root using Node.js 22:

```bash
node tests/dashboard-release-check.cjs
node tests/capital-creation-v06.test.cjs
node tests/capital-evidence-v07.test.cjs
node tests/capital-allocation-v08.test.cjs
```

Require all four commands to exit 0 with recorded output. Also require the GitHub Actions workflow **WealthOS Dashboard Release Checks** to show a successful run on the exact release commit. An empty PR-workflow API response is NOT a passing result.

## 2. Deployment (blocking)

- Obtain and record the exact deployed URL and deployed commit/version from the hosting provider.
- Check that the URL is reachable from an external browser over HTTPS and loads `index.html` plus `capital-v05.js`, `capital-creation-v06.js`, `capital-evidence-v07.js`, `capital-allocation-v08.js` without 404s.
- Do not equate a public GitHub source repository, a guessed GitHub Pages path or an unauthenticated login screen with a **private** deployment. Review the hosting access model.
- Verify authorised account + MFA AAL2; a valid password without MFA must not reveal research; an authenticated account absent from `wealthos_access` must not reveal research.
- Confirm no privileged Supabase secrets in any distributed files. Review backend table permissions/RLS with an authorised backend administrator.
- Test logout and browser reload; ensure app research panel is hidden until access checks succeed.

## 3. Capital modules (blocking)

- v0.5: run zero/negative returns, debt amortisation, tax and haircut assumptions, impossibly large numbers and missing inputs. Confirm rejected scenarios display no stale numbers. Check CSV values against inputs independently.
- v0.6: review opportunity assumptions, cash deficits, ownership share and separation of distributions from equity valuation.
- v0.7: ensure evidence references are *claims*, not verified proof; unverified documentation must not confer approvals.
- v0.8: validate concentrated funding, liquidity floor, support reserve and cash-shortfall cases; no outcome permits an order or transfer.
- Run keyboard-only and mobile-width smoke tests and check browser console for errors.

## 4. Release decision and operational ownership

| Gate | Current evidence | Decision |
| --- | --- | --- |
| Files present in source | GitHub repository inspection | Confirmed |
| All tests pass locally | No execution log captured in this release review | OPEN |
| GitHub Actions green on release SHA | Not independently observed | OPEN |
| Hosted URL reachable and assets load | Not independently observed | OPEN |
| AAL2 / membership / backend RLS integration | No end-to-end test evidence | OPEN |
| Financial scenario sign-off | No independent sign-off | OPEN |
| Live capital execution | Must remain blocked | LOCKED |

**Release rule:** Do not set PRODUCTION READY until every OPEN gate has a verifiable date, accountable reviewer, evidence link and PASS outcome. No public deployment, privileged key publication, broker connection or live trade may be performed under this checklist.
