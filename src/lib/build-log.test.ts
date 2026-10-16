import { describe, expect, it } from "vitest";
import { buildLog, type RepoInfo, type CommitInfo } from "./build-log";

const repo = (name: string, over: Partial<RepoInfo> = {}): RepoInfo => ({
  fullName: `KavamiDev/${name}`, name, isPrivate: false, topics: ["52log"],
  homepage: `https://${name}.pages.dev`, description: `${name} tagline`, ...over,
});
let n = 0;
const commit = (message: string, date: string, over: Partial<CommitInfo> = {}): CommitInfo => ({
  sha: `abc${n++}def0123`, message, date, authorLogin: "KavamiDev", url: `https://github.com/x/commit/${n}`, ...over,
});

const build = (repos: RepoInfo[], commits: Record<string, CommitInfo[]>, names?: Record<string, string>) =>
  buildLog({ owner: "KavamiDev", topic: "52log", repos, commits, generatedAt: 0, names });

describe("buildLog", () => {
  it("builds a product from its init and keeps only convention commits", () => {
    const log = build([repo("invoice-buddy")], {
      "KavamiDev/invoice-buddy": [
        commit("init(#01): Invoice Buddy\n\nPrice: 5 EUR", "2026-10-19T05:00:00Z"),
        commit("fix typo", "2026-10-20T05:00:00Z"),
        commit("progress: auth works", "2026-10-21T05:00:00Z"),
      ],
    });
    expect(log.products).toHaveLength(1);
    const p = log.products[0];
    expect(p).toMatchObject({ week: 1, slug: "invoice-buddy", name: "Invoice Buddy", isPublic: true, homepage: "https://invoice-buddy.pages.dev" });
    expect(p.milestones.map((m) => [m.type, m.week])).toEqual([["init", 1], ["progress", 1]]);
  });

  it("never reads a repo without the topic", () => {
    const log = build([repo("interfonIA", { topics: [] })], {
      "KavamiDev/interfonIA": [commit("init(#02): secret thing", "2026-10-26T05:00:00Z")],
    });
    expect(log.products).toEqual([]);
  });

  it("ignores commits by other authors", () => {
    const log = build([repo("p")], {
      "KavamiDev/p": [
        commit("init(#01): P", "2026-10-19T05:00:00Z"),
        commit("ship: hijack", "2026-10-20T05:00:00Z", { authorLogin: "someone" }),
        commit("cut: no account", "2026-10-20T06:00:00Z", { authorLogin: null }),
      ],
    });
    expect(log.products[0].milestones.map((m) => m.type)).toEqual(["init"]);
  });

  it("hides body and commit link for private repos", () => {
    const log = build([repo("p", { isPrivate: true })], {
      "KavamiDev/p": [commit("init(#01): P\n\nsecret notes\n\nPrice: 5 EUR", "2026-10-19T05:00:00Z")],
    });
    const m = log.products[0].milestones[0];
    expect(log.products[0].isPublic).toBe(false);
    expect(m.url).toBeNull();
    expect(m.body).toBe("");
    expect(m.trailers).toEqual({ Price: "5 EUR" });
  });

  it("uses the Name trailer, sorts milestones and products", () => {
    const log = build([repo("zeta"), repo("alpha")], {
      "KavamiDev/zeta": [
        commit("ship: live", "2026-10-25T10:00:00Z"),
        commit("init(#01): Z\n\nName: Zeta Pro", "2026-10-19T05:00:00Z"),
      ],
      "KavamiDev/alpha": [commit("init(#00): A", "2026-10-15T05:00:00Z")],
    });
    expect(log.products.map((p) => [p.week, p.name])).toEqual([[0, "Alpha"], [1, "Zeta Pro"]]);
    expect(log.products[1].milestones.map((m) => m.type)).toEqual(["init", "ship"]);
  });

  it("drops a repo with no init and no explicit week", () => {
    const log = build([repo("p")], { "KavamiDev/p": [commit("progress: hi", "2026-10-19T05:00:00Z")] });
    expect(log.products).toEqual([]);
  });

  it("keeps an explicit week on a non-init commit", () => {
    const log = build([repo("p")], {
      "KavamiDev/p": [commit("init(#01): P", "2026-10-19T05:00:00Z"), commit("verdict(#01): numbers", "2026-11-20T05:00:00Z")],
    });
    expect(log.products[0].milestones.at(-1)?.week).toBe(1);
  });

  it("dedupes the same sha", () => {
    const c = commit("init(#01): P", "2026-10-19T05:00:00Z");
    const log = build([repo("p")], { "KavamiDev/p": [c, c] });
    expect(log.products[0].milestones).toHaveLength(1);
  });

  it("uses a configured name when the init has no Name trailer", () => {
    const log = build(
      [repo("52-log"), repo("named")],
      {
        "KavamiDev/52-log": [commit("init(#00): 52.log", "2026-10-16T05:00:00Z")],
        "KavamiDev/named": [commit("init(#01): N\n\nName: From Trailer", "2026-10-19T05:00:00Z")],
      },
      { "52-log": "52.log", named: "From Config" },
    );
    expect(log.products.map((p) => p.name)).toEqual(["52.log", "From Trailer"]);
  });
});
