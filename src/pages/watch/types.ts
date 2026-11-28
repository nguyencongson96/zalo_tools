import type { watchFilters } from "@/constants/watch.constant";

export type WatchFilter = (typeof watchFilters)[number]["value"];
