# 52.log · Spec (v2, no backend)

## 1. What it is

A public, live portfolio for the challenge "52 paid MVPs in 52 weeks". Each product
lives in its own GitHub repo under `KavamiDev`. Milestone commits in those repos (init,
progress, cut, ship, verdict) flow automatically into this site, which shows:

- a night-sky hero, a 52-week contribution grid, a commit-style log grouped by week,
  an About sidebar with live counters, a portfolio of projects (click → the project's
  live site), and a "Connect the dots" constellation where each shipped week lights a star.

Proof is the point: entries come from real commits with real SHAs and timestamps.

There is **no backend and no database**. The git history is the data. A GitHub Action
fetches commits through the GitHub API at build time and produces a static site.

## 2. Which repos show up: the `52log` topic (opt-in)

- Only repos owned by `KavamiDev` **with the GitHub topic `52log`** are read.
- A repo without the topic never appears, whatever its commits say (e.g. `interfonIA`).
- Removing the topic removes the repo at the next build.
- The repo's **Website** field (`homepage` in the API) is the project's live URL, used
  by the portfolio card. Empty → the card has no link.
- The repo's **description** is the project's tagline.

## 3. Commit convention

Only commits whose subject matches the convention appear. Everything else
(`fix typo`, `wip`) is ignored and does not trigger a build.

```
<type>(#<week>): <subject>

<optional body>

<Optional-Trailer>: <value>
```

- `type` is one of `init | progress | cut | ship | verdict`
- `#<week>` is two digits (`#00` to `#51`). **Required on `init`**, optional elsewhere
  (other commits inherit the week of the repo's `init`).
- Subject max 72 chars. Author login must be `KavamiDev`.
- Trailers are standard git trailers (`Key: value`, last paragraph). Known keys:

| type | trailers |
|---|---|
| init | `Name`, `For`, `Problem`, `Hypothesis`, `Scope`, `Price` |
| ship | `Demo` (url), `Video` (url), `Price` (e.g. `5 EUR`), `Hours` (number) |
| verdict | `Visitors`, `Signups`, `Paying`, `Revenue` (e.g. `15 EUR`), `Lesson` |

Product name: `Name` trailer of the `init`, else `names` in `src/site.config.ts`
(e.g. `52-log` → `52.log`), else the repo name title-cased (`invoice-buddy` → `Invoice Buddy`).

Subject regex:
`^(init|progress|cut|ship|verdict)(?:\(#(\d{2})\))?:\s+(.{1,72})$`

Clean commits are enforced in every project repo by a `commit-msg` hook (see 8):
a subject that starts with a milestone type but is malformed is rejected.
Normal commits are never blocked.

## 4. Data pipeline (`scripts/fetch-log.ts`, runs before `astro build`)

1. List repos of `KavamiDev` (`GET /user/repos` with token, so private repos work),
   keep those with topic `52log`.
2. For each, list commits on the default branch (paginated), keep author `KavamiDev`.
3. Parse each message with `parseMilestone`. Drop non-matching.
4. Build products + milestones, compute derived values (5), write `src/data/log.json`.
5. Token: `GH_TOKEN`, fine-grained, read-only (Metadata + Contents) on all repos.
   Stored only in GitHub Actions secrets. Never shipped to the client.
6. If the fetch fails in CI, the build fails: the previous deploy stays online.
   Never fall back to fixture data in production.
7. Local dev: `src/data/fixture.json` (clearly fake, `[PLACEHOLDER]` values), used only
   when `GH_TOKEN` is absent and `NODE_ENV !== "production"`.

Private repo: its milestones show, but the SHA is plain text (no link) and the body is hidden.

## 5. Derived values (pure functions in `src/lib/`, unit tested)

- `weekOf(date)`: weeks since Monday 2026-10-12 00:00 Indian/Reunion (UTC+4), floored.
- `currentWeek(now)`: same, clamped 0..51.
- Product status: `shipped` if it has a `ship` milestone, `in_progress` if it has any
  milestone and its week is current, `skipped` if its week is past with no `ship`,
  else `planned`.
- Product fields: latest `ship` trailers fill price/demo/video/hours, latest `verdict`
  trailers fill verdict.
- Counters: shipped count, current streak (consecutive shipped weeks ending at the last
  finished week, or the current one if shipped), total revenue (sum of verdict `Revenue`),
  current week.
- Activity grid: 364 days from 2026-10-12, level = milestones that day (0,1,2,3,4+).
- Constellation: 52 fixed star positions (the mockup's `<polyline>`), lit when the
  week's product is `shipped`, current week glows.

## 6. Pages

- `/` · the whole mockup: header, hero, tabs (anchors), activity grid, log grouped by
  week (newest week first, milestones oldest to newest inside a week), About sidebar
  with counters and rules, revenue box, portfolio, constellation, footer.
- `/w/[week]` · one week: product, status, all milestones with bodies and trailers,
  demo/video links, price, verdict. Generated for every week that has a product.
- `404` in the same style.

Rendering rules:
- SHA shows 7 chars, links to the commit when the repo is public.
- Relative dates ("committed 2 days ago") under 7 days, else "on Oct 15". Computed in
  the browser by a tiny inline script (static HTML would go stale), with the absolute
  date as server-rendered fallback.
- Current week with no `ship` yet shows a muted "ship: due Sunday <date>" row.
- The mockup's "Week 01" example block is **not** rendered: no placeholder data anywhere.
- Empty states are honest: "Nothing sold yet." No fake numbers.
- Social links come from `src/site.config.ts` (`github: "KavamiDev"`, `x: ""`).
  An empty value hides its button.
- Meta: title, description, static Open Graph image.
- Responsive: sidebar stacks under the log below ~900px, activity grid scrolls
  horizontally in its box, hero text scales with `clamp()`.

## 7. Build and deploy

The site lives in `KavamiDev/52-log`, deployed on **GitHub Pages** by
`.github/workflows/build.yml`. Triggers:

- `push` on `main` of this repo,
- `repository_dispatch` type `milestone` (sent by project repos, see 8),
- `schedule` once a day (safety net, and later Stripe refresh),
- `workflow_dispatch` (manual).

`concurrency: { group: pages, cancel-in-progress: true }` so bursts build once.
Expected volume: ~20–40 builds/month. Cost: 0 €.

## 8. Project template and `/nouveau-projet`

`templates/project/` holds what every new product repo gets:

- `.githooks/commit-msg`: rejects malformed milestones, same rules as `validateMilestone`
  (a parity test runs the shell hook against the TS function). `.gitmessage` is copied
  from `scripts/commit-template.txt`.
- `.github/workflows/notify-52log.yml`: on push to the default branch, if a pushed commit
  matches the convention, send `repository_dispatch` (`milestone`) to `KavamiDev/52-log`
  with secret `LOG_DISPATCH_TOKEN`. Otherwise nothing.
- `.github/workflows/deploy.yml`: on push to the default branch, `bun run build` if any,
  then `wrangler pages deploy $DEPLOY_DIR` (default `public`) to Cloudflare Pages.
- `public/index.html` placeholder, `README.md`, `.gitignore`.

`scripts/new-project.sh <slug> <week> ["Name"]` (later wrapped by a
`/nouveau-projet` shortcut), secrets read from `.env` (or `~/.52log.env`), Cloudflare keys optional:

1. Copy the template into `~/Desktop/<slug>`, `git init -b main`, set `core.hooksPath`
   and `commit.template`.
2. `gh repo create KavamiDev/<slug> --public` + topic `52log`.
3. If Cloudflare keys are set: `wrangler pages project create <slug>`, set the repo Website
   field to its URL. Otherwise hosting is skipped and `deploy.yml` stays idle.
4. Set `LOG_DISPATCH_TOKEN`, `CLOUDFLARE_API_TOKEN` secrets and `CLOUDFLARE_ACCOUNT_ID` variable.
5. Print the suggested `init(#NN)` commit. The user commits and pushes themself.

`DRY_RUN=1` prints remote commands without running them.
Products are hosted on **Cloudflare** (Vercel Hobby forbids commercial use).

## 9. Out of V1 → `docs/LATER.md`

## 10. Done means

- A real `init(#00)` commit in this repo appears on the deployed site within ~2 minutes.
- `bun run check` and `bun run test` pass. Parsers and week math have tests, including
  a commit with no convention, a malformed milestone, a private repo, a repo without
  the topic and a week boundary in Indian/Reunion.
- Lighthouse accessibility 95+ on `/`.
- Then commit `ship(#00): 52.log is live` with its trailers. The site logs its own launch.
