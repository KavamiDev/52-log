// Small formatting helpers shared by the pages.
import { site } from "../site.config";
import type { Milestone, Status } from "./types";

export const pad = (w: number) => String(w).padStart(2, "0");
export const href = (path = "") => `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
export const fmtDate = (t: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: site.timeZone, ...opts }).format(t);
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const statusLabel: Record<Status, { text: string; cls: string }> = {
  in_progress: { text: "in progress", cls: "l-wait" },
  shipped: { text: "shipped", cls: "l-ship" },
  skipped: { text: "skipped", cls: "l-cut" },
  planned: { text: "planned", cls: "l-muted" },
};

/** Body plus trailers, as the commit message reads. */
export const fullBody = (m: Milestone) =>
  [m.body, Object.entries(m.trailers).map(([k, v]) => `${k}: ${v}`).join("\n")].filter(Boolean).join("\n\n");

/** 52 fixed star positions, from the mockup's <polyline>. */
export const STARS: [number, number][] = (
  "44,58 115,30 211,34 269,50 363,63 435,48 502,41 596,64 657,27 750,59 815,37 893,31 983,30 979,118 905,113 836,107 741,127 658,123 580,105 520,118 435,116 367,130 287,124 195,107 139,134 43,100 47,183 137,199 193,203 284,184 345,192 446,167 528,193 599,191 688,205 745,198 837,176 911,180 989,192 988,270 906,268 815,270 765,246 670,252 587,249 505,270 450,273 346,241 270,242 194,244 127,244 33,254"
).split(" ").map((p) => p.split(",").map(Number) as [number, number]);
