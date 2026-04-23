import type {
  AgeCoverageQuarter,
  DashboardData,
  JurisdictionQuarter,
  NationalQuarter,
} from "./types";

/** Post-reform stable tier window baseline (Legacy → 0). */
export const BASELINE_QUARTER = "2020-06-30";

export type NationalSnapshot = {
  quarter: string;
  hospitalPersons: number | null;
  hospitalShare: number | null;
  extrasPersons: number | null;
  extrasShare: number | null;
};

export function getNationalAtQuarter(
  national: NationalQuarter[],
  quarterIso: string,
): NationalSnapshot | null {
  const row = national.find((n) => n.quarter === quarterIso);
  if (!row) return null;
  return {
    quarter: row.quarter,
    hospitalPersons: row.hospital_treatment.insured_persons,
    hospitalShare: row.hospital_treatment.share_of_population,
    extrasPersons: row.general_treatment.insured_persons,
    extrasShare: row.general_treatment.share_of_population,
  };
}

export function deltaPersons(now: number | null, then: number | null): number | null {
  if (now == null || then == null) return null;
  return now - then;
}

export function deltaPp(now: number | null, then: number | null): number | null {
  if (now == null || then == null) return null;
  return (now - then) * 100;
}

export function pctChange(now: number | null, then: number | null): number | null {
  if (now == null || then == null || then === 0) return null;
  return ((now - then) / then) * 100;
}

export type TierInsight = {
  goldShareNow: number | null;
  goldShareThen: number | null;
  goldDeltaPp: number | null;
  silverBronzeShareNow: number | null;
  silverBronzeShareThen: number | null;
  silverBronzeDeltaPp: number | null;
  bronzeShareNow: number | null;
  bronzeShareThen: number | null;
};

export function computeTierInsight(data: DashboardData): TierInsight {
  const tier = data.tier_quarterly ?? [];
  const then = tier.find((t) => t.quarter >= BASELINE_QUARTER);
  const latest = tier.at(-1);
  const gNow = latest?.share.gold ?? null;
  const gThen = then?.share.gold ?? null;
  const sNow = latest?.share.silver ?? null;
  const bNow = latest?.share.bronze ?? null;
  const sThen = then?.share.silver ?? null;
  const bThen = then?.share.bronze ?? null;
  const sbNow =
    sNow != null && bNow != null ? sNow + bNow : null;
  const sbThen =
    sThen != null && bThen != null ? sThen + bThen : null;
  return {
    goldShareNow: gNow,
    goldShareThen: gThen,
    goldDeltaPp: deltaPp(gNow, gThen),
    silverBronzeShareNow: sbNow,
    silverBronzeShareThen: sbThen,
    silverBronzeDeltaPp: deltaPp(sbNow, sbThen),
    bronzeShareNow: bNow,
    bronzeShareThen: bThen,
  };
}

export type StateMover = {
  key: string;
  shareNow: number | null;
  shareThen: number | null;
  deltaPp: number | null;
};

export function computeStateMovers(
  jurisdiction: JurisdictionQuarter[],
  baselineQuarter: string,
  latestQuarter: string,
): StateMover[] {
  const at = (q: string) =>
    jurisdiction.find((j) => j.quarter === q)?.jurisdictions ?? {};
  const jThen = at(baselineQuarter);
  const jNow = at(latestQuarter);
  const keys = new Set([...Object.keys(jThen), ...Object.keys(jNow)]);
  keys.delete("AUST");
  const rows: StateMover[] = [];
  for (const k of keys) {
    const shareNow = jNow[k]?.share_of_population ?? null;
    const shareThen = jThen[k]?.share_of_population ?? null;
    rows.push({
      key: k,
      shareNow,
      shareThen,
      deltaPp: deltaPp(shareNow, shareThen),
    });
  }
  return rows.sort((a, b) => (b.deltaPp ?? -999) - (a.deltaPp ?? -999));
}

/** Age bands for growth decomposition (matches GrowthByAgeChart display). */
const GROWTH_AGE_GROUPS: { label: string; bands: string[] }[] = [
  { label: "Under 25", bands: ["0-4", "5-9", "10-14", "15-19", "20-24"] },
  { label: "25–34", bands: ["25-29", "30-34"] },
  { label: "35–49", bands: ["35-39", "40-44", "45-49"] },
  { label: "50–64", bands: ["50-54", "55-59", "60-64"] },
  { label: "65 and over", bands: ["65-69", "70-74", "75-79", "80+"] },
];

export type AgeGrowthRow = {
  label: string;
  netNew: number;
  shareOfTotal: number;
};

export function computeNetNewByAgeGroup(
  ageQuarters: AgeCoverageQuarter[],
  baselineQuarter: string,
  latestQuarter: string,
): { rows: AgeGrowthRow[]; totalGrowth: number; under35SharePct: number | null } {
  const qThen = ageQuarters.find((q) => q.quarter === baselineQuarter);
  const qNow = ageQuarters.find((q) => q.quarter === latestQuarter);
  if (!qThen || !qNow) {
    return { rows: [], totalGrowth: 0, under35SharePct: null };
  }

  function sumInsured(q: AgeCoverageQuarter, bands: string[]) {
    let s = 0;
    for (const b of bands) {
      const cell = q.bands[b];
      if (cell) s += cell.insured_persons;
    }
    return s;
  }

  const rows: AgeGrowthRow[] = [];
  let totalGrowth = 0;
  for (const g of GROWTH_AGE_GROUPS) {
    const then = sumInsured(qThen, g.bands);
    const now = sumInsured(qNow, g.bands);
    const netNew = now - then;
    totalGrowth += netNew;
    rows.push({ label: g.label, netNew, shareOfTotal: 0 });
  }

  const absTotal = rows.reduce((a, r) => a + Math.max(0, r.netNew), 0);
  for (const r of rows) {
    r.shareOfTotal = absTotal > 0 ? (Math.max(0, r.netNew) / absTotal) * 100 : 0;
  }

  const under35Labels = new Set(["Under 25", "25–34"]);
  let under35Net = 0;
  for (const r of rows) {
    if (under35Labels.has(r.label)) under35Net += r.netNew;
  }
  const under35SharePct =
    totalGrowth !== 0 ? (under35Net / totalGrowth) * 100 : null;

  return { rows, totalGrowth, under35SharePct };
}

export function computeExtrasVsHospitalPpDivergence(
  national: NationalQuarter[],
  baselineQuarter: string,
  latestQuarter: string,
): { hospitalPp: number | null; extrasPp: number | null; diffPp: number | null } {
  const then = getNationalAtQuarter(national, baselineQuarter);
  const now = getNationalAtQuarter(national, latestQuarter);
  const hPp = deltaPp(now?.hospitalShare ?? null, then?.hospitalShare ?? null);
  const ePp = deltaPp(now?.extrasShare ?? null, then?.extrasShare ?? null);
  const diff =
    hPp != null && ePp != null ? ePp - hPp : null;
  return { hospitalPp: hPp, extrasPp: ePp, diffPp: diff };
}
