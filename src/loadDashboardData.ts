import type { DashboardData, PolicyConstants, PremiumTierData } from "./types";

const DASHBOARD_FILE = "dashboard.json";
const PREMIUM_FILE = "premium_tiers.json";
const POLICY_FILE = "policy_constants.json";

export type DashboardBundle = {
  dashboard: DashboardData;
  premium: PremiumTierData | null;
  policy: PolicyConstants | null;
};

function dataUrl(file: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${base.endsWith("/") ? "" : "/"}data/${file}`;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const url = dataUrl(DASHBOARD_FILE);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load data (${res.status}): ${url}`);
  }
  return (await res.json()) as DashboardData;
}

export async function loadPremiumTierData(): Promise<PremiumTierData | null> {
  const url = dataUrl(PREMIUM_FILE);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Premium data not loaded (${res.status}): ${url}`);
    return null;
  }
  return (await res.json()) as PremiumTierData;
}

export async function loadPolicyConstants(): Promise<PolicyConstants | null> {
  const url = dataUrl(POLICY_FILE);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Policy constants not loaded (${res.status}): ${url}`);
    return null;
  }
  return (await res.json()) as PolicyConstants;
}

export async function loadDashboardBundle(): Promise<DashboardBundle> {
  const [dashboard, premium, policy] = await Promise.all([
    loadDashboardData(),
    loadPremiumTierData(),
    loadPolicyConstants(),
  ]);
  return { dashboard, premium, policy };
}
