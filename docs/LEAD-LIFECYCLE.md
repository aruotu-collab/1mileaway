# Lead lifecycle

A lead is created when a customer taps Call now. That rings the professional’s own number directly. Qualification happens when the professional confirms it was a real job.

- Missed, wrong-number, or “not a job” confirmations → disqualified. Trial is not consumed.
- Confirmed real job:
  - If trial remaining > 0 → `FREE_TRIAL`, decrement remaining.
  - Else if no open balance → `TRUST_LEAD`, snapshot price, create one outstanding balance, set `OUTSTANDING_LEAD`.
  - Else reject — a second unpaid lead cannot be created.

`qualifyLead` runs in a transaction so two simultaneous qualifications cannot create two open balances.
