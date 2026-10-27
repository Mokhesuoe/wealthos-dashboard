# WealthOS — Delivery Roadmap and Job Register
**Baseline:** 27 October 2026 | **Classification:** execution plan, not proof of completion
**Objective:** establish an operationally trustworthy, secure research and capital-creation decision platform. Long-run aspiration: M1 billion; no projection of guaranteed returns.

## Live production diagnostics — 27 October 2026, before U.S. equity session

Read-only database verification through Supabase:
- Latest completed market ingestion: **2026-10-26 19:55:00 UTC** (21:55 Lesotho); **3 successes, 0 failures, 3 data-eligible**. Recent sessions contain 78 completed runs and 30 scheduled skips since 24 October (counts reflect current records).
- Latest completed feature refresh: **2026-10-26 20:02:00 UTC** (22:02 Lesotho); **3 considered, 3 ready**.
- Most recent recorded ingestion: **2026-10-26 21:55:00 UTC**, skipped for `outside_regular_us_session`, as expected.
- PostgreSQL cron confirms active `wealthos-market-ingest` (`*/5 13-21 * * 1-5`) and `wealthos-feature-refresh` (`2-57/5 13-21 * * 1-5`); schedules are UTC hour windows with the Edge Function enforcing actual NY market time.
- It is currently before the 27 October U.S. opening session. **Today's fresh-session ingestion remains unverified; do not claim success until 27 October records exist.**
- This clears the hypothesis that the displayed closed-market skip proves provider failure. It does not establish fresh valuations, event-risk snapshots or model predictive success.

**WO-01:** Previous live-session ingestion verified; current-session monitoring remains OPEN. **WO-02:** Previous session 3/3 features verified; current-session repeat remains OPEN.

## Verified milestones
- Public static GitHub Pages frontend hosted at https://mokhesuoe.github.io/wealthos-dashboard/
- User screenshots on 27 October 2026: login -> MFA/TOTP challenge -> authenticated AAL2 research dashboard.
- Dashboard displays Opportunity Decision Cards, v0.5 return priors, Capital Intelligence v0.5, Capital Creation Studio v0.6, evidence v0.7, allocation v0.8.
- User screenshot of GitHub Actions: release checks and deploy workflow green on f39e60e.
- Research remains non-executable; live execution locked.

## Delivery definitions
P0 = critical readiness; P1 = research and wealth-creation operating capability; P2 = scale/optimisation.
Statuses: OBSERVED (point-in-time user evidence), SOURCE PRESENT (source inspected), OPEN (not yet demonstrated), BLOCKED (dependent on earlier job).
Do not treat screenshot counts or source presence as proof of current backend state.

| ID | Priority | Job | Specific deliverable / acceptance criterion | Dependency | Status |
| --- | --- | --- | --- | --- | --- |
| WO-01 | P0 | Diagnose skipped latest ingest | Trace cron -> edge function -> provider response -> eligibility / freshness / logging for AAPL, SPY, QQQ. Produce run IDs, timestamp, error reasons and safe remediation. Require two-source verified fresh records for >=3 symbols in a live market session. | Controlled service logs | OPEN |
| WO-02 | P0 | Restore verified features | Confirm ingestion record references, deterministic feature builds and timestamps. >=3 fresh eligible features on first viable live session; preserve fail-closed states when markets closed. | WO-01 | BLOCKED |
| WO-03 | P0 | Backend security negative cases | Test with approved non-member, authenticated AAL1, authenticated AAL2 member, signed-out client; verify direct select/API access to research tables and zero disclosure under non-member/AAL1. Record redacted responses; never place tokens/passwords in tickets. | Authorized test identities | OPEN |
| WO-04 | P0 | Capital v0.5-v0.8 acceptance | Independent financial examples covering debt, gains tax, distribution tax, contribution constraints, liquidity haircuts, working capital, downside funding shares, evidence freshness, overflow and CSV. Reconcile exported CSV to inputs to cents where applicable. | Browser UAT and test fixtures | OPEN |
| WO-05 | P0 | Multi-device UI/security smoke | Desktop/mobile, login/logout/session expiry, keyboard navigation, asset loading, no unexpected browser console errors. | WO-03 | OPEN |
| WO-06 | P1 | Fresh valuation & event risk | Create current source-qualified snapshots with reviewable provenance; never show stale snapshots as live. | WO-01/02 | BLOCKED |
| WO-07 | P1 | Research acceptance v0.4 | Re-run fresh-session cards and record gate evidence and failures explicitly. | WO-02/06 | BLOCKED |
| WO-08 | P1 | Forward return outcomes | Maintain time-stamped paper decisions; score matured horizons against benchmark and transaction costs; track sample sizes, missing observations, regime sensitivity, survivorship/look-ahead checks. No eligibility promotion merely from historical backtests. | WO-01, passage of actual horizons | OPEN |
| WO-09 | P1 | Candidate commercial opportunities | Intake and rank real ventures: sales demand, unit economics, required capital, sustainable cash distributions, tax/regulatory permissions, competing offers, founder operating capacity, break-even, downside and diligence documents. At least 3 *sourced* candidate cases, not generated revenue claims. | Sourced operational data and independent verification | OPEN |
| WO-10 | P1 | WealthOS capital-to-business integration | Link accepted venture cases into v0.5 wealth trajectory without double-counting equity and owner distributions; preserve manual approval and session-local privacy. | WO-04/09 | BLOCKED |
| WO-11 | P2 | Repeated operations watch | Monitor failed cron, missing symbols, stale evidence, overdue outcome scoring, exceptions, and expiry of attestations; deliver a dashboard and targeted alerts without transmitting credentials. | WO-01/06/08 | OPEN |
| WO-12 | P2 | Controlled private-origin design | Evaluate authenticated hosting, backend RLS, data sensitivity, observability and recovery; avoid claiming GitHub Pages is origin-private. Do not publish or move services without explicit approval. | Security architecture | OPEN |

## Execution order

### Release stabilisation — first
1. Obtain a timestamped diagnostic of latest market-ingest cron and data-eligibility decisions. Closed-market skips may be correct; distinguish expected skips from failed ingestion.
2. Execute the WO-03 negative-path security matrix using test users, including direct API calls against sample research tables.
3. Run financial scenario and export QA in WO-04; capture reproducible evidence and defects.
4. Record the four-module desktop and mobile smoke test.

### Research viability — next
5. Restore eligible two-source features in the next live trading session, without changing thresholds merely to make a green dashboard.
6. Generate reliable valuation/event-risk snapshots and fresh-session cards. Validate old snapshot freshness.
7. Accumulate and score forward decisions; publish calibration, benchmark and failure statistics. 200 pending outcomes is not 200 scored validations.

### Meaningful wealth-creation capability — thereafter
8. Source three genuine business opportunities with customer evidence and operating assumptions; reject opportunities with undocumented demand or unsupported returns.
9. Perform downside, cash-flow and capital commitment evaluation, including tax, FX, dilution, funding constraints and concentration; obtain independent review.
10. Link only accepted inputs and measured results to WealthOS capital feasibility; explicitly label hypotheses and uncertainty.

## Evidence ledger — 27 October 2026 screenshots
- Latest ingestion: SKIPPED, 0 eligible. Features: SKIPPED, 0/0 ready.
- Evidence: completed, 7 macro/11 SEC. Fundamentals: completed, 11 issuers/4,070 facts.
- Valuation: awaiting. Event risk: awaiting. v0.4 gate: armed.
- Research priors: 3 (unvalidated); paper decisions: 3; scored forward outcomes: 0, pending: 200.
- Strategy lab screenshot: strategy 12.09% against benchmark 16.90%; not promotion eligible.
- Default capital case: M5,000 monthly contributions, 8% return over 20y -> nominal M2,844,995; required monthly contribution to M1b M1,757,472. Hypothetical, not a forecast.

## Non-negotiable release rules
- No trading/broker execution, transfer permission or auto-invest approvals.
- Research data cannot be exposed before backend membership/AAL2 validation; a public frontend must not embed secret credentials.
- Data freshness, provenance, auditability and independent financial verification supersede visual success.
- Project completion claims must name exactly which functional outcomes have passed. M1b remains an unvalidated aspirational target.

## Live-session diagnostic addendum — 27 October 2026 (15:35–15:37 Lesotho)

Read-only production SQL confirmed **two** successful scheduled ingestions at 13:30 and 13:35 UTC; each recorded 3 successes, 0 failures, 3 data-eligible. At 13:35 UTC the AAPL/SPY/QQQ quality results had two independent sources, status VERIFIED, no provider errors, trade_eligible=false.

The corresponding 13:37 UTC feature job completed but recorded **0 of 3 ready**, not a failed job. Inspection of `market_features` showed **sample_count=1** for AAPL, SPY and QQQ at 13:35 UTC, and `features.price_15m=null`; at 13:30 UTC the sample count was zero. This establishes insufficient opening-session history as the *immediate reason* the visible features were not ready at that moment. Do not weaken the rolling sample history gate. Confirm the expected warm-up outcome by examining feature runs and individual feature rows later in the same regular session. An actual progression to 3/3 is **not yet verified for 27 October**.

**Next verification SQL (read-only):** `select started_at,status,instruments_considered,instruments_ready from public.feature_runs where started_at::date='2026-10-27' order by started_at desc limit 12;` Check `market_features.sample_count`, `feature_ready`, and 15-minute-price presence for each symbol. If readiness remains 0/3 after sufficient same-session observations, investigate feature-refresh source, lookback horizon, and quality threshold, while preserving fail-closed research policy.

## 27 October 2026 — v0.4 acceptance process root cause (verified read-only)

The cron job `wealthos-v04-acceptance-watch` is active, scheduled `*/5 14-20 * * 1-5` UTC. Its recorded executions on 27 October through 16:20 UTC succeeded. However, its command calls `private.try_accept_opportunity_card_v04()`, a function explicitly implementing **first live-session acceptance**.

The function immediately returns the previously passed run ID whenever `research_acceptance_runs.acceptance_name='opportunity_card_v04_first_live_session'` with `status='passed'`. Thus the 22 October 2026 historic pass is intentionally reused and new per-session acceptance rows are NOT inserted. A successful cron invocation proves its SQL ran; it does NOT prove today's data and cards have passed a fresh gate.

**Recommended follow-up, not yet implemented:** design a separate, non-executing recurring daily/session research-quality monitor (distinct acceptance name and audit trail), with the following conditions and evidence: 3 fresh data-eligible AAPL/SPY/QQQ market features, 3 independently traceable current valuation snapshots, 3 v0.4 research cards, confidence and evidence reliability >=60, referenced official event-risk snapshot no older than 72 hours, all trade_eligible=false; record failed and skipped evaluations with timestamps and reason codes. Ensure it never changes strategy promotion or live capital permissions. Review DB migration and policies, tests, schedulers and failure-mode observability prior to enabling any new cron.

**Near-term dashboard behavior:** display the historic first-session pass as HISTORICAL PASSED, never current-session acceptance. Existing screenshots show the historical status correctly. A recurring gate should be a *separate* displayed measure.
