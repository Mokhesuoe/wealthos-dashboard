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
