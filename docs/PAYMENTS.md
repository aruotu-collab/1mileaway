# Payments

Professionals get two months free, then a monthly subscription to keep Call now. There is no prepaid wallet and no per-lead invoice.

During the trial, every Call now is emailed and logged. At the end we email the call count so they can decide whether to pay.

Stripe Checkout (`mode: subscription`) is used when `STRIPE_SECRET_KEY` is set. Otherwise `/pay/mock/[id]` activates the same records the webhook would.

Webhook: `POST /api/webhooks/stripe` on `checkout.session.completed` for kind `subscription`. Default price is £29 / month (`SUBSCRIPTION_AMOUNT_MINOR`). Cron `/api/cron/subscriptions` ends expired trials.
