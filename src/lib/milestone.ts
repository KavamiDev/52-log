import type { ParsedMilestone, MilestoneType } from "./types";

const SUBJECT = /^(init|progress|cut|ship|verdict)(?:\(#(\d{2})\))?:\s+(.{1,72})$/;
const PREFIX = /^(init|progress|cut|ship|verdict)(\(|:)/;
const TRAILER = /^([A-Za-z][A-Za-z0-9-]*):\s+(.+)$/;

/** Error message for a malformed milestone, null for valid milestones and normal commits. */
export function validateMilestone(message: string): string | null {
  const subject = message.replace(/\r\n/g, "\n").split("\n")[0].trim();
  if (!PREFIX.test(subject)) return null;
  const week = subject.match(/^\w+\(([^)]*)\)/)?.[1];
  if (week !== undefined && (!/^#\d{2}$/.test(week) || Number(week.slice(1)) > 51))
    return "week must be (#00) to (#51)";
  const m = subject.match(SUBJECT);
  if (!m) {
    const text = subject.match(/^[^:]*:\s+(.*)$/)?.[1] ?? "";
    return text.length > 72 ? "subject is max 72 chars" : "format is type(#NN): subject";
  }
  if (m[1] === "init" && m[2] === undefined) return "init needs a week: init(#NN): subject";
  return null;
}

export function parseMilestone(message: string): ParsedMilestone | null {
  const lines = message.replace(/\r\n/g, "\n").split("\n");
  const subjectLine = lines[0].trim();
  if (validateMilestone(subjectLine) !== null) return null;
  const m = subjectLine.match(SUBJECT);
  if (!m) return null;

  const paragraphs = lines.slice(1).join("\n").trim().split(/\n\s*\n/).filter(Boolean);
  const last = paragraphs.at(-1)?.split("\n") ?? [];
  let trailers: Record<string, string> = {};
  if (last.length && last.every((l) => TRAILER.test(l.trim()))) {
    trailers = Object.fromEntries(last.map((l) => l.trim().match(TRAILER)!.slice(1, 3)));
    paragraphs.pop();
  }

  return {
    type: m[1] as MilestoneType,
    week: m[2] === undefined ? null : Number(m[2]),
    subject: m[3].trim(),
    body: paragraphs.join("\n\n"),
    trailers,
  };
}

/** "15,50 EUR" → 15.5, "€12" → 12. */
export function parseAmount(value: string | undefined): number | undefined {
  const n = value?.replace(/\s/g, "").replace(",", ".").match(/\d+(\.\d+)?/)?.[0];
  return n === undefined ? undefined : Number(n);
}
