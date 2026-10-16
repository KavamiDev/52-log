// The build output of scripts/fetch-log.ts. Its shape is guaranteed by buildLog, not by the JSON contents.
import data from "../data/log.json";
import type { LogData } from "./build-log";

export const log = data as unknown as LogData;
