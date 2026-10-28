# WealthOS Dashboard — Intraday Session Quality Disclosure v0.1

**Date:** 28 October 2026  
**Backend issue:** https://github.com/Mokhesuoe/wealth-markets-os/issues/36  
**Change type:** Browser presentation + deterministic tests, **not** a post-close backend certification or change to trading.

## The misleading state corrected

Before this change, the dashboard could display **SESSION PASSED** for a row from \`research_session_quality_runs\` dated today in New York. The database cron is \`30 16 * * 1-5\` (16:30 UTC, normally 12:30 EDT), so the stored row is an **intraday research readiness observation**. It cannot certify the closing session at 16:00 New York time.

A green or unqualified session PASS can lead a user to believe provider quality, quote freshness, valuation updates and evidence remained good through the close. That conclusion does not follow from an intraday evaluation. Research quality is not trading permission.

## What changes

The existing card is titled **Intraday session research quality · NOT FINAL**. The status is now one of:

- \`INTRADAY PASSED\`, \`INTRADAY FAILED\`, or \`INTRADAY UNKNOWN\` when the row's NY session date is current.
- \`HISTORICAL INTRADAY PASSED/FAILED/UNKNOWN\` when the row belongs to another NY calendar day.
- \`QUERY ERROR\`, \`NO VISIBLE INTRADAY CHECK\` or \`SESSION DATE / TIME UNVERIFIED\` when the row is missing, unreadable, or the timestamp contradicts the declared session date.
- \`UNEXPECTED TRADE ELIGIBILITY\` or \`TRADE LOCK UNVERIFIED\` when the row reports \`trade_eligible=true\` or lacks explicit \`false\`.

The metadata **always** includes:

> FINAL SESSION NOT CERTIFIED · intraday research only · not investment approval

The code only reads the existing RLS-protected session-quality row via the existing Supabase authenticated session and displays text via \`textContent\`. It adds no queries, database writes, keys, order APIs, broker connections or trading configurations. It never computes a final-session PASS from intraday records.

## Verification

\`session-quality-v01.js\` exports a dependency-free, pure JavaScript function. \`tests/session-quality-v01.test.cjs\` covers current/historical passes, failed checks, stale/mismatched timestamps, missing data, NULL/true trade flags, and NY DST conversion. The main release test asserts the browser card routes through this function and the security test scans the new asset for privileged keys.

Both existing GitHub release-check and Pages workflows are updated to test the new module. On an approved merge to \`main\`, the existing Pages CI pipeline will publish it automatically and verify the new script over HTTPS. **No direct/manual deployment is initiated by the PR.** The published interface has not changed until CI completes its ordinary deployment.

## Still needed: genuinely certified post-close result

The backend source-only research-gate and evidence receipt tools were merged in PRs #37, #39 and #40. They are **not** production-scheduled and no authenticated, independently verified closing-session receipt is currently available to this browser.

A future separately approved integration should:
1. Receive a verified NYSE close/holiday/early-close schedule and attest the source.
2. Run the completed-session quality gate **after** the closing ingestion and feature/valuation/card refreshes finish.
3. Store a reviewer-accepted, immutable receipt in a secure backend location with correct RLS/MFA controls.
4. Render a distinct **Final Session Certification** card, explicitly identifying NOT CERTIFIED, PASS or FAILED, evidence digest, timestamp and reason codes.
5. Include downtime/visibility/error handling, verify that the user cannot promote an intraday PASS to FINAL, and test all paths with an AAL2 user and other denied principals.

Any new backend table, API, scheduler, service identity, dashboard release, privilege adjustment or trading change requires separate authorization and verified acceptance.

**LIVE CAPITAL LOCKED.**
