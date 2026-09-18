# Architecture

Public routes are country-first: `/{country}/{profession}/{location}`. Internal profession IDs (`plumber`) stay stable while slugs can vary by country.

Domain logic lives under `src/lib`:

- `auth` — magic-link sessions and server-side roles
- `availability` — statuses, expiry, email tokens
- `leads` — call log and join-from-demand enquiries
- `payments` — monthly subscription (Stripe or mock)
- `subscription` — two-month trial, call statistics, expiry emails
- `ranking` — recommended sort + admin explanation
- `seo` — indexability
- `locations` — marketplace queries

SQLite is the local database. The Prisma schema is portable to Supabase Postgres. RLS belongs on Postgres; local admin and professional routes are authorised in server code, never by email checks in the browser.

Money is integer minor units plus a currency code. There is no FX conversion.
