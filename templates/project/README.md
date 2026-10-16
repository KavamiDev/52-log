# __NAME__

Week __WEEK__ of [52.log](https://kavamidev.github.io/52-log/): one paid product a week.

## Milestone commits

Only these appear on 52.log (the `commit-msg` hook checks them):

```
init(#__WEEK__): <idea>        trailers: Name / For / Problem / Hypothesis / Scope / Price
progress: <what works>
cut: <what leaves V1>
ship: <it is live>            trailers: Demo / Video / Price: 5 EUR / Hours: 7
verdict: <numbers>            trailers: Visitors / Signups / Paying / Revenue: 15 EUR / Lesson
```

Trailers go in the last paragraph, one `Key: value` per line.

## Deploy

Hosting is chosen per project. With Cloudflare Pages: set the repo variable
`CLOUDFLARE_ACCOUNT_ID` and the secret `CLOUDFLARE_API_TOKEN`, and every push to `main`
deploys `public/` (or `$DEPLOY_DIR`, after `bun run build` if any). Without them,
`deploy.yml` stays idle. Put the live URL in the repo Website field so 52.log links to it.
