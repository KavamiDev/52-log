# Later (not V1)

## V2
- **Stripe revenue per project.** One Stripe account, each Stripe Product tagged with
  metadata `repo: <slug>`. The daily build reads payments with a read-only restricted key
  (`STRIPE_KEY` in Actions secrets), groups by repo, shows real revenue on cards and in
  "Revenue by product". Verdict trailers keep visitors, signups and lesson.

## Later
- X account link (field `x` in `src/site.config.ts`, empty for now).
- Auto-post on X when a `ship` commit lands (check X API free-tier quotas first).
- Products, Revenue and RSS pages.
- Light theme, dynamic OG image per week, analytics per product.
- Admin UI (probably never: the topic + commits are the admin).
