# 1mileaway

Find a professional nearby who is genuinely available and ready to help.

This is a country-first marketplace: listings, availability, and a monthly subscription. Customers ring the professional’s own number. There is no prepaid wallet and no per-lead bill.

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
- Subscribed plumber: `kira@demo.1mileaway.com`
- Two-month trial plumber: `lee@demo.1mileaway.com`
- Claimed, not subscribed: `pat@demo.1mileaway.com`

Set `DEV_MAGIC_BYPASS=1` to sign in immediately after submitting an email (local only).

## Stack

Next.js App Router, TypeScript, Tailwind, Prisma/SQLite locally (Postgres/Supabase in production), Vitest. Stripe, Resend and Supabase Auth are adapters: when keys are missing, mock mode keeps the product testable. Customers call the professional’s phone directly — there is no Twilio or tracking number in between.

## Core model

1. Professionals claim a listing with their own work email and phone number.
2. They get two months free with Call now on.
3. Each customer tap emails them and is counted in their account.
4. After the trial they pay monthly to keep Call now, using those numbers to decide.
5. Unclaimed listings get “Ask them to take this job” instead of a phone number.

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
