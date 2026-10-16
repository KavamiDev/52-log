#!/bin/sh
# Creates a new 52.log project: local folder, GitHub repo (topic 52log), Cloudflare Pages project, secrets.
# Usage: scripts/new-project.sh <slug> <week> ["Product Name"]
# Secrets are read from ~/.52log.env: LOG_DISPATCH_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
# DRY_RUN=1 prints the remote commands instead of running them. DEST_DIR overrides ~/Desktop.
set -eu

OWNER=KavamiDev
KIT=$(cd "$(dirname "$0")/.." && pwd)

slug=${1:-}; week=${2:-}
[ -n "$slug" ] && [ -n "$week" ] || { echo "usage: $0 <slug> <week> [\"Product Name\"]" >&2; exit 1; }
echo "$slug" | grep -Eq '^[a-z0-9][a-z0-9-]{0,57}$' || { echo "slug: lowercase letters, digits, dashes" >&2; exit 1; }
echo "$week" | grep -Eq '^[0-9]{2}$' && [ "$week" -le 51 ] || { echo "week: 00 to 51" >&2; exit 1; }
name=${3:-$(echo "$slug" | awk -F- '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)} 1')}

dest=${DEST_DIR:-$HOME/Desktop}/$slug
[ ! -e "$dest" ] || { echo "$dest already exists" >&2; exit 1; }

run() { if [ "${DRY_RUN:-}" = 1 ]; then echo "[dry-run] $*"; else "$@"; fi; }

if [ "${DRY_RUN:-}" != 1 ]; then
  [ -f "$HOME/.52log.env" ] && . "$HOME/.52log.env"
  : "${LOG_DISPATCH_TOKEN:?missing in ~/.52log.env}" "${CLOUDFLARE_API_TOKEN:?missing in ~/.52log.env}" "${CLOUDFLARE_ACCOUNT_ID:?missing in ~/.52log.env}"
  export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
  gh auth status >/dev/null 2>&1 || { echo "run: gh auth login" >&2; exit 1; }
fi

echo "→ $dest"
cp -R "$KIT/templates/project" "$dest"
cp "$KIT/scripts/commit-template.txt" "$dest/.gitmessage"
for f in "$dest/README.md"; do
  sed -i.bak -e "s|__NAME__|$name|g" -e "s|__WEEK__|$week|g" -e "s|__SLUG__|$slug|g" "$f" && rm "$f.bak"
done
cd "$dest"
git init -q -b main
git config core.hooksPath .githooks
git config commit.template .gitmessage

echo "→ GitHub repo $OWNER/$slug"
run gh repo create "$OWNER/$slug" --public --source . --remote origin
run gh repo edit "$OWNER/$slug" --add-topic 52log

echo "→ Cloudflare Pages project"
url="https://$slug.pages.dev"
if [ "${DRY_RUN:-}" = 1 ]; then
  run bunx wrangler pages project create "$slug" --production-branch main
else
  out=$(bunx wrangler pages project create "$slug" --production-branch main 2>&1) || { echo "$out" >&2; exit 1; }
  url=$(echo "$out" | grep -Eo 'https://[a-z0-9.-]+\.pages\.dev' | head -n 1 || echo "$url")
fi
run gh repo edit "$OWNER/$slug" --homepage "$url"

echo "→ Secrets and variables"
if [ "${DRY_RUN:-}" = 1 ]; then
  echo "[dry-run] gh secret set LOG_DISPATCH_TOKEN / CLOUDFLARE_API_TOKEN, gh variable set CLOUDFLARE_ACCOUNT_ID"
else
  printf %s "$LOG_DISPATCH_TOKEN" | gh secret set LOG_DISPATCH_TOKEN -R "$OWNER/$slug"
  printf %s "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R "$OWNER/$slug"
  gh variable set CLOUDFLARE_ACCOUNT_ID -R "$OWNER/$slug" -b "$CLOUDFLARE_ACCOUNT_ID"
fi

cat <<MSG

Done. $name will live at $url
Commit and push when ready (this is the first entry on 52.log):

  cd $dest
  git add -A
  git commit -m "init(#$week): $name" -m "For: 
Problem: 
Hypothesis: 
Scope: 
Price: "
  git push -u origin main
MSG
