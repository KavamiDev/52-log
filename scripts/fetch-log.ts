// Fetches milestone commits from KavamiDev repos tagged `52log` and writes src/data/log.json.
// Needs GH_TOKEN (fine-grained, read-only). Without it: dev fixture locally, hard failure in CI.
import { copyFileSync, writeFileSync } from "node:fs";
import { buildLog, type CommitInfo, type RepoInfo } from "../src/lib/build-log";
import { site } from "../src/site.config";

const OUT = new URL("../src/data/log.json", import.meta.url);
const FIXTURE = new URL("../src/data/fixture.json", import.meta.url);
const token = process.env.GH_TOKEN;

if (!token) {
  if (process.env.CI) {
    console.error("GH_TOKEN is missing in CI: refusing to build with fixture data.");
    process.exit(1);
  }
  copyFileSync(FIXTURE, OUT);
  console.log("fetch-log: no GH_TOKEN, using src/data/fixture.json (dev only)");
  process.exit(0);
}

async function getAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | null = `https://api.github.com${path}${path.includes("?") ? "&" : "?"}per_page=100`;
  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (res.status === 409) return out; // empty repo
    if (!res.ok) throw new Error(`GitHub ${res.status} on ${url}: ${await res.text()}`);
    out.push(...((await res.json()) as T[]));
    url = res.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1] ?? null;
  }
  return out;
}

type ApiRepo = { full_name: string; name: string; private: boolean; topics?: string[]; homepage: string | null; description: string | null; default_branch: string; owner: { login: string } };
type ApiCommit = { sha: string; html_url: string; author: { login: string } | null; commit: { message: string; committer: { date: string } } };

const apiRepos = (await getAll<ApiRepo>("/user/repos?affiliation=owner"))
  .filter((r) => r.owner.login === site.github && r.topics?.includes(site.topic));

const repos: RepoInfo[] = [];
const commits: Record<string, CommitInfo[]> = {};
for (const r of apiRepos) {
  repos.push({ fullName: r.full_name, name: r.name, isPrivate: r.private, topics: r.topics ?? [], homepage: r.homepage, description: r.description });
  const list = await getAll<ApiCommit>(`/repos/${r.full_name}/commits?sha=${encodeURIComponent(r.default_branch)}&author=${site.github}`);
  commits[r.full_name] = list.map((c) => ({
    sha: c.sha, message: c.commit.message, date: c.commit.committer.date, authorLogin: c.author?.login ?? null, url: c.html_url,
  }));
}

const log = buildLog({ owner: site.github, topic: site.topic, repos, commits, generatedAt: Date.now(), names: site.names });
writeFileSync(OUT, JSON.stringify(log, null, 2));
console.log(`fetch-log: ${repos.length} repo(s), ${log.products.reduce((n, p) => n + p.milestones.length, 0)} milestone(s)`);
