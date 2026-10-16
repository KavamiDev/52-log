// The shell hook shipped in templates/project must agree with validateMilestone.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMilestone } from "./milestone";

const HOOK = new URL("../../templates/project/.githooks/commit-msg", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "hook-"));

function hookPasses(message: string): boolean {
  const file = join(dir, "MSG");
  writeFileSync(file, message);
  try {
    execFileSync("sh", [HOOK, file], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

describe("commit-msg hook", () => {
  it.each([
    "fix typo",
    "wip",
    "shipping the fix",
    "ship it",
    "init(#00): 52.log, a portfolio shaped like a commit log",
    "ship(#01): Invoice Buddy is live\n\nDemo: https://x.pages.dev\nPrice: 5 EUR",
    "progress: auth works",
    "verdict(#51): last one",
    `ship(#01): ${"x".repeat(72)}`,
    `ship(#01): ${"é".repeat(72)}`,
    "# comment line\nprogress: after a comment",
    "ship(#1): one digit",
    "ship(#52): out of range",
    "ship:no space",
    "init: no week",
    `ship(#01): ${"x".repeat(73)}`,
    "cut(#01) missing colon",
  ])("agrees with validateMilestone on %j", (msg) => {
    const expected = validateMilestone(msg.replace(/^#.*\n/gm, "")) === null;
    expect(hookPasses(msg)).toBe(expected);
  });
});
