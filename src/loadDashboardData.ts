import type { DashboardData } from "./types";

const FILE = "dashboard.json";

export async function loadDashboardData(): Promise<DashboardData> {
  const base = import.meta.env.BASE_URL;
  const url = `${base}${base.endsWith("/") ? "" : "/"}data/${FILE}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load data (${res.status}): ${url}`);
  }
  return (await res.json()) as DashboardData;
}
