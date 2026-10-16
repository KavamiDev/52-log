# 52.log

Public build log for **52 paid products in 52 weeks**.
Live: https://kavamidev.github.io/52-log/

The site has no backend. A GitHub Action reads milestone commits from every `KavamiDev`
repo tagged with the **`52log`** topic, builds a static site and deploys it to GitHub Pages.
Repos without the topic are never read.

## Commit convention

Only commits whose subject follows this format show up. Everything else is ignored.

```
<type>(#<week>): <subject, max 72 chars>

<optional body>

<Trailer>: <value>
```

| type | when | trailers (last paragraph) |
|---|---|---|
| `init` | Monday, the idea. **Week required**: `init(#03): …` | `Name`, `For`, `Problem`, `Hypothesis`, `Scope`, `Price` |
| `progress` | during the week | |
| `cut` | Thursday night, scope frozen | |
| `ship` | Sunday, it is live | `Demo`, `Video`, `Price: 5 EUR`, `Hours: 7` |
| `verdict` | 30 days after ship | `Visitors`, `Signups`, `Paying`, `Revenue: 15 EUR`, `Lesson` |

Other commits of a repo inherit the week of its `init`.

```
ship(#01): Invoice Buddy is live

Demo: https://invoice-buddy.pages.dev
Price: 5 EUR
Hours: 7
```

From any repo, load the reminder and the guard:

```bash
git config commit.template /path/to/52-log/scripts/commit-template.txt
git config core.hooksPath /path/to/52-log/templates/project/.githooks
```

The `commit-msg` hook rejects a malformed milestone (`ship(#1):`, `init:` without week,
subject over 72 chars). Normal commits are never blocked.

## New project in one command

```bash
scripts/new-project.sh invoice-buddy 01 "Invoice Buddy"
```

It creates `~/Desktop/invoice-buddy` from `templates/project/`, the public repo
`KavamiDev/invoice-buddy` with the `52log` topic, the Cloudflare Pages project, fills the
repo Website field and sets the secrets. Then it prints the `init(#01)` commit for you to
make and push. From there:

- every push to `main` deploys `public/` (or `$DEPLOY_DIR`, after `bun run build` if any)
  to Cloudflare Pages (`deploy.yml`),
- every push containing a milestone pings this repo, which rebuilds in ~2 minutes
  (`notify-52log.yml`).

`DRY_RUN=1` prints the remote commands without running them.

## Develop

```bash
bun install
bun run dev      # http://localhost:4321/52-log/ (dev fixture without GH_TOKEN)
bun run test     # Vitest
bun run check    # astro check
bun run build    # fetch + static build into dist/
```

Put `GH_TOKEN=…` in `.env` (gitignored) to build from real data locally.

## One-time setup

### 1. Tokens

| token | where it is created | access | stored in |
|---|---|---|---|
| `GH_TOKEN` | GitHub › Settings › Developer settings › Fine-grained tokens | All repositories · Contents **read** · Metadata read | `52-log` repo secret, local `.env` |
| `LOG_DISPATCH_TOKEN` | same | Only `KavamiDev/52-log` · Contents **read and write** (needed for `repository_dispatch`) | `~/.52log.env`, copied to each project repo by the script |
| `CLOUDFLARE_API_TOKEN` | Cloudflare › My Profile › API Tokens › Create › "Cloudflare Pages: Edit" | your account | `~/.52log.env`, copied by the script |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard, right column of Workers & Pages | | `~/.52log.env`, set as a repo variable |

`~/.52log.env`:

```
LOG_DISPATCH_TOKEN=github_pat_…
CLOUDFLARE_API_TOKEN=…
CLOUDFLARE_ACCOUNT_ID=…
```

Then `chmod 600 ~/.52log.env` and `gh auth login` once.

### 2. This repo

1. Create the public repo `KavamiDev/52-log` and push this folder.
2. Add the topic **`52log`** to it (it is product #00, it must show up).
3. Settings › Pages › Source: **GitHub Actions**.
4. Settings › Secrets and variables › Actions › New secret `GH_TOKEN`.
5. `git config core.hooksPath templates/project/.githooks` and
   `git config commit.template scripts/commit-template.txt` here too.

## Production checklist

- [ ] `bun run test`, `bun run check`, `bun run build` pass locally.
- [ ] `GH_TOKEN` secret set; Pages source is GitHub Actions.
- [ ] Repo has the `52log` topic and its Website field is `https://kavamidev.github.io/52-log/`.
- [ ] First `build` run is green and the page shows **no** "DEV FIXTURE" banner.
- [ ] `init(#00)` commit is visible on the site; SHA links to GitHub.
- [ ] A repo without the topic (e.g. `interfonIA`) does not appear.
- [ ] Lighthouse accessibility ≥ 95 on `/`.
- [ ] Open Graph preview OK (`public/og.png`), 404 page works.
- [ ] Custom domain (optional): set it in Settings › Pages, then change `site` and remove
      `base` in `astro.config.mjs`.
- [ ] `ship(#00): 52.log is live` with its trailers. The site logs its own launch.

## Cost

GitHub Actions and Pages (public repo), Cloudflare Pages free plan (commercial use allowed):
**0 €/month**. A custom domain is about 10 €/year.

Spec: `docs/SPEC.md` · Later: `docs/LATER.md` · Design: `design/mockup.dc.html`
