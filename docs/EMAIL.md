# Email

Resend is the production adapter. Without `RESEND_API_KEY`, messages are stored as `mocked` and listed in Admin → Emails. Magic-link payloads include the token in mock mode so local sign-in works.

Verified sending domain: `1mileaway.com`. Set `RESEND_FROM_EMAIL` to `1mileaway <hello@1mileaway.com>`.

Templates: magic link, claim invite, trial started, inbound call (with running call count), mid-trial check-in, trial ending, trial ended analysis, subscribe-from-demand, subscription started, availability follow-up.

Cron `/api/cron/subscriptions` sends the mid-trial and ending analysis, then ends expired trials.
