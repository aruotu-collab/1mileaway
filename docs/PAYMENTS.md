# Payments

Professionals get two months free with **no card**, then a monthly listing subscription to keep Call now. There is no prepaid wallet and no per-lead invoice.

Claim / join starts an app trial only. Stripe is not contacted until they click Subscribe.

If they subscribe while the trial still has at least 48 hours left, Checkout collects a card and sets `trial_end` to the existing trial date, so the first $29 charge is when the two months end. If the trial has already ended, Checkout charges immediately.

One Stripe Price is used in every country: **$29 USD / month** (`SUBSCRIPTION_AMOUNT_MINOR=2900`, `SUBSCRIPTION_CURRENCY=USD`, `STRIPE_PRICE_ID`).

Stripe Checkout (`mode: subscription`) is used when `STRIPE_SECRET_KEY` is set. Otherwise `/pay/mock/[id]` activates the same records the webhook would.

Webhook: `POST /api/webhooks/stripe` on `checkout.session.completed`, `invoice.paid` (paid invoices only), `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted`. Cron `/api/cron/subscriptions` ends expired trials that have no Stripe card on file.
