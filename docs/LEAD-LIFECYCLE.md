# Lead lifecycle

A lead is created when a tracked call starts. Qualification happens when the call completes.

- Duration below `QUALIFIED_CALL_SECONDS` (default 45) → disqualified. Trial is not consumed.
- Duration at or above the threshold:
  - If trial remaining > 0 → `FREE_TRIAL`, decrement remaining.
  - Else if no open balance → `TRUST_LEAD`, snapshot price, create one outstanding balance, set `OUTSTANDING_LEAD`.
  - Else reject — a second unpaid lead cannot be created.

`qualifyCall` runs in a transaction so two simultaneous qualifications cannot create two open balances.
