# 1mileaway

Find a professional nearby who is genuinely available and ready to help.

This is a country-first marketplace: listings, availability, free-trial qualified leads, one trust lead, then settle-to-continue. There is no prepaid professional wallet.

## Local setup

```bash
npm install
copy .env.example .env
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) then `/gb/plumbers/catford`.

### Demo accounts

Request a magic link from `/login`. Without Resend, the latest local link is shown on the login page and stored under Admin → Emails.

- Super admin: `aruotu@gmail.com`
- Available plumber: `kira@demo.1mileaway.com`
- Trust-lead ready: `lee@demo.1mileaway.com`
- Outstanding lead: `pat@demo.1mileaway.com`

Set `DEV_MAGIC_BYPASS=1` to sign in immediately after submitting an email (local only).

## Stack

Next.js App Router, TypeScript, Tailwind, Prisma/SQLite locally (Postgres/Supabase in production), Vitest. Stripe, Resend and Supabase Auth are adapters: when keys are missing, mock mode keeps the product testable. Customers call the professional’s phone directly — there is no Twilio or tracking number in between.

## Core model

1. Free trial of qualified leads (default 5, configurable globally / country / profession / professional).
2. One unpaid trust lead after the trial.
3. Pay that lead in local currency to continue. Webhook (or mock checkout) is authoritative.
4. Missed or “not a job” confirmations do not consume the trial.
5. An outstanding lead pauses Available Now but does not delete the listing.

## Useful routes

- `/gb/plumbers/catford` and `/gb/plumbers/lewisham`
- `/gb/emergency-plumbers/catford`
- `/call/[id]` — rings the professional’s number directly
- `/professional` — I WANT WORK
- `/admin` — control centre
- `/api/webhooks/stripe` and `/api/webhooks/resend`

## Tests

```bash
npm test
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Lead lifecycle](docs/LEAD-LIFECYCLE.md)
- [Availability](docs/AVAILABILITY.md)
- [SEO](docs/SEO.md)
- [Payments](docs/PAYMENTS.md)
- [Email](docs/EMAIL.md)
- [Admin](docs/ADMIN.md)
