# Payments

No prepaid wallet. After the free trial, the next qualified lead creates one outstanding balance. Stripe Checkout is used when `STRIPE_SECRET_KEY` is set. Otherwise `/pay/mock/[id]` settles the same records the webhook would.

Webhook: `POST /api/webhooks/stripe` on `checkout.session.completed`. Settlement is idempotent. The professional is then asked to reconfirm availability.
