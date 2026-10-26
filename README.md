# WealthOS Dashboard

Public static frontend shell for the private WealthOS research platform.

## Security boundary

This repository contains **no** provider API secrets, Supabase service-role keys, broker credentials, backend migrations, proprietary research algorithms, or investment data.

The dashboard uses:
- Supabase Auth
- explicit `wealthos_access` membership
- TOTP MFA / AAL2
- Supabase Row Level Security
- read-only access to research outputs

The Supabase publishable browser key in `index.html` is intentionally public and is not a privileged credential.

## Current research stack

The private WealthOS engine now includes:
- dual-provider live market verification
- macro, SEC and fundamental evidence
- valuation and official event-risk layers
- Opportunity Card v0.4 and formal acceptance gating
- v0.5 transparent expected-return research priors
- timestamped paper decisions and forward outcome scoring
- dual-provider historical daily data qualification
- historical feature generation
- Strategy Lab backtesting with explicit look-ahead controls and transaction-cost assumptions

## Execution posture

The dashboard is read-only. Live capital remains locked. Research cards, v0.5 priors, Strategy Lab outputs and paper decisions remain `trade_eligible=false`.

A research model or backtest is not promoted merely because it produces a positive return. Model validation, forward/out-of-sample evidence, transaction costs, FX, tax and portfolio-risk controls must be completed before any later governance decision about real-capital use.

Canonical private engine repository: not mirrored here.

## Capital Intelligence and release state (26 October 2026)

The authenticated dashboard source includes a **local-only Capital Intelligence** panel with projected liquid assets, business equity (excluding distributed cash), outstanding debt, contribution requirements, inflation-adjusted wealth and CSV export. It models deterministic hypothetical scenarios; it is **not** a forecast or live portfolio accounting. Tax, FX, debt servicing, illiquidity and ownership dilution require further modelling.

**Mandatory MFA enforcement:** the frontend requires AAL2 before showing private research. On 26 October 2026, the Supabase WealthOS project was also hardened with 36 `AS RESTRICTIVE FOR SELECT TO authenticated` AAL2 guard policies on research tables. The access-register self-read remains available for the pre-MFA membership check. A database-policy inventory and security-advisor check confirmed 36/36 guards and zero security-advisor findings. An actual low-AAL vs high-AAL authenticated API acceptance test is still required. The canonical SQL audit and verification query are recorded in the private engine repository at `audit/wealthos_mandatory_aal2_policy_2026_10_26.sql`.

**Financial correctness:** the calculator fails closed if projected nominal wealth, real wealth or required contributions become nonfinite; regression tests cover numerical overflow and extreme inflation assumptions.

**Verification / release gates:** run `node tests/dashboard-release-check.cjs` in the repository root and confirm GitHub Actions passes. An authenticated browser journey, live hosting address, API RLS tests under real JWT assurance levels, and deployment provenance remain **unverified**. Do **not** consider the app production accepted based only on GitHub commits or static tests.
