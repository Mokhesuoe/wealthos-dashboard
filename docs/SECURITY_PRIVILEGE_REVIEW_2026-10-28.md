# WealthOS production security verification — 28 October 2026

Status: READ-ONLY FINDINGS / REMEDIATION PROPOSED, NOT APPLIED.

## Verified metadata
- Supabase security advisor returned zero lint findings at inspection.
- public.research_acceptance_runs: RLS enabled; anon SELECT table privilege granted; authenticated INSERT/UPDATE/DELETE table privileges granted.
- public.research_session_quality_runs: RLS enabled; anon SELECT and authenticated INSERT/UPDATE/DELETE privileges revoked.
- Acceptance read policies include a restrictive AAL2 guard and active-member predicates; SQL policy inspection alone does not prove every role/JWT outcome.
- Quality read policy requires active wealthos_access membership and AAL2.

## Risk and interpretation
Table GRANT privileges do not bypass RLS by themselves. Unused grants nevertheless increase the attack surface and can create risk if policies change. Confirm no legitimate client writes rely on acceptance-run grants before revoking them. The table owner and privileged service roles may require distinct access; do not modify those roles indiscriminately.

## Proposed staging-first verification
1. Identify acceptance-run writer identities and all API/client dependencies.
2. In staging, test anon, authenticated non-member, authenticated AAL1, authenticated active-member AAL2 using actual isolated identities.
3. For each role, verify SELECT and attempted INSERT/UPDATE/DELETE using disposable records and rollback-safe fixtures.
4. Confirm backend acceptance writer still functions; capture sanitized request status, row counts, and RLS evidence.
5. Only after approval and staging evidence, propose revoking anon SELECT and authenticated write privileges from acceptance_runs; retest end-to-end.
6. Re-run security advisor and regression tests, recording actual run IDs and timestamps.

## Release rule
No PASS claims without execution evidence. Do not alter production grants, policies, secrets, or trade eligibility as part of this read-only review.
