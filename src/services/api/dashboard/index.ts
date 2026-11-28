import { webHttp } from "@/services";
import type { DashboardDTO } from "./types";

export type * from "./types";

export async function getDashboard() {
  const { data } = await webHttp.get<DashboardDTO>("/dashboard");
  return data;
}
