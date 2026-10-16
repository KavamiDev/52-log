import { parseMilestone } from "./milestone";
import type { Milestone, Product } from "./types";

export interface RepoInfo {
  fullName: string; // owner/name
  name: string;
  isPrivate: boolean;
  topics: string[];
  homepage: string | null;
  description: string | null;
}

export interface CommitInfo {
  sha: string;
  message: string;
  date: string; // ISO
  authorLogin: string | null;
  url: string;
}

export interface LogData {
  generatedAt: number;
  fixture?: true; // dev only, never in production
  products: Product[];
}

const titleCase = (slug: string) =>
  slug.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export function buildLog(input: {
  owner: string;
  topic: string;
  repos: RepoInfo[];
  commits: Record<string, CommitInfo[]>;
  generatedAt: number;
}): LogData {
  const products: Product[] = [];

  for (const repo of input.repos) {
    if (!repo.topics.includes(input.topic)) continue;

    const seen = new Set<string>();
    const parsed = (input.commits[repo.fullName] ?? [])
      .filter((c) => c.authorLogin === input.owner && !seen.has(c.sha) && seen.add(c.sha))
      .map((c) => ({ c, m: parseMilestone(c.message) }))
      .filter((x): x is { c: CommitInfo; m: NonNullable<typeof x.m> } => x.m !== null)
      .sort((a, b) => Date.parse(a.c.date) - Date.parse(b.c.date));

    const init = parsed.find((x) => x.m.type === "init");
    const repoWeek = init?.m.week ?? parsed.find((x) => x.m.week !== null)?.m.week;
    if (repoWeek == null) continue;

    const milestones: Milestone[] = parsed.map(({ c, m }) => ({
      ...m,
      week: m.week ?? repoWeek,
      body: repo.isPrivate ? "" : m.body,
      sha: c.sha,
      repo: repo.fullName,
      committedAt: Date.parse(c.date),
      url: repo.isPrivate ? null : c.url,
    }));

    products.push({
      week: repoWeek,
      slug: repo.name,
      name: init?.m.trailers.Name ?? titleCase(repo.name),
      repo: repo.fullName,
      isPublic: !repo.isPrivate,
      homepage: repo.homepage || null,
      description: repo.description || null,
      milestones,
    });
  }

  products.sort((a, b) => a.week - b.week);
  return { generatedAt: input.generatedAt, products };
}
