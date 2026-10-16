import { site } from "../site.config";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const OFFSET = 4 * 3_600_000; // Indian/Reunion is UTC+4, no DST
/** Monday 2026-10-12 00:00 Reunion, in ms. */
export const WEEK0 = Date.parse(`${site.week0}T00:00:00Z`) - OFFSET;

export const weekOf = (t: number) => Math.floor((t - WEEK0) / WEEK);
export const currentWeek = (now: number) => Math.min(51, Math.max(0, weekOf(now)));
export const weekStart = (week: number) => WEEK0 + week * WEEK;
/** Last ms of the week's Sunday, Reunion time. */
export const dueSunday = (week: number) => weekStart(week + 1) - 1;
export const dayIndex = (t: number) => Math.floor((t - WEEK0) / DAY);
