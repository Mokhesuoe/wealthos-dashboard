# WealthOS Dashboard

Public static frontend shell for the private WealthOS research platform.

## Security boundary

This repository contains **no** provider API secrets, Supabase service-role keys, broker credentials, backend migrations, proprietary research algorithms, or investment data.

The dashboard uses:
- Supabase Auth
- explicit `wealthos_access` membership
- TOTP MFA / AAL2
- Supabase Row Level Security

The Supabase publishable browser key in `index.html` is intentionally public and is not a privileged credential.

## Execution posture

The dashboard is read-only. Live capital remains locked. Opportunity Cards remain `trade_eligible=false`.

Canonical private engine repository: not mirrored here.
