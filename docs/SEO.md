# SEO

Landing pages get canonical URLs and generated titles. A page is indexable only when it has enough real listings (default: 3 listings from 2 businesses) or an admin override.

`sitemap.ts` includes only indexable profession × location routes. `robots.ts` blocks `/admin`, `/professional`, `/api`, and `/call`.

## Google Analytics 4

1. In [Google Analytics](https://analytics.google.com/), create a GA4 property for `1mileaway.com`.
2. Copy the Measurement ID (`G-…`).
3. On Vercel, set `NEXT_PUBLIC_GA_MEASUREMENT_ID` and redeploy.

The tag only loads on the Vercel production deployment, so localhost and preview URLs do not pollute the numbers. Set `NEXT_PUBLIC_GA_DEBUG=1` if you need to test it locally.

## Google Search Console

1. In [Search Console](https://search.google.com/search-console), add a URL-prefix property for `https://1mileaway.com`.
2. Choose HTML tag verification. Copy only the `content` value from:

   `<meta name="google-site-verification" content="TOKEN_HERE" />`

3. On Vercel, set `GOOGLE_SITE_VERIFICATION` to that token and redeploy.
4. Click Verify, then submit the sitemap: `https://1mileaway.com/sitemap.xml`.
