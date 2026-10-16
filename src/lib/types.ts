export const TYPES = ["init", "progress", "cut", "ship", "verdict"] as const;
export type MilestoneType = (typeof TYPES)[number];

export interface ParsedMilestone {
  type: MilestoneType;
  week: number | null;
  subject: string;
  body: string;
  trailers: Record<string, string>;
}

export interface Milestone extends Omit<ParsedMilestone, "week"> {
  sha: string;
  repo: string; // owner/name
  week: number;
  committedAt: number; // ms
  url: string | null; // null when the repo is private
}

export type Status = "planned" | "in_progress" | "shipped" | "skipped";

export interface Product {
  week: number;
  slug: string;
  name: string;
  repo: string;
  isPublic: boolean;
  homepage: string | null;
  description: string | null;
  milestones: Milestone[];
}
