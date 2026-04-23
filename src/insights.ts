import type {
  AgeCoverageQuarter,
  DashboardData,
  JurisdictionQuarter,
  MlsTier,
  NationalQuarter,
  PremiumMultiYearObservation,
  PremiumTierData,
  TierQuarter,
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
const GROWTH_AGE_GROUPS: { label: string; bands: string[]; decisionMaker: boolean }[] = [
  { label: "Under 25", bands: ["0-4", "5-9", "10-14", "15-19", "20-24"], decisionMaker: false },
  { label: "25–34", bands: ["25-29", "30-34"], decisionMaker: true },
  { label: "35–49", bands: ["35-39", "40-44", "45-49"], decisionMaker: true },
  { label: "50–64", bands: ["50-54", "55-59", "60-64"], decisionMaker: true },
  { label: "65 and over", bands: ["65-69", "70-74", "75-79", "80+"], decisionMaker: true },
];

export type AgeGrowthRow = {
  label: string;
  /** True for cohorts counted as coverage decision-makers (25+). */
  decisionMaker: boolean;
  /** Net new insured lives in the cohort since baseline. */
  netNew: number;
  /** Cohort's share of total net growth, in percent (signed, may be >100 or <0 when other cohorts shrink). */
  growthSharePct: number | null;
  /** Cohort's share of the decision-age adult population at the latest quarter, in percent. */
  populationSharePct: number | null;
  /** (growthSharePct − populationSharePct) in percentage points. Positive = over-indexing. Null for non-decision-makers. */
  overIndexPp: number | null;
  /** Coverage rate at baseline and latest (0–1). */
  coverageRateThen: number | null;
  coverageRateNow: number | null;
  /** Coverage-rate change (pp). */
  coverageDeltaPp: number | null;
};

export function computeNetNewByAgeGroup(
  ageQuarters: AgeCoverageQuarter[],
  baselineQuarter: string,
  latestQuarter: string,
): {
  rows: AgeGrowthRow[];
  totalGrowth: number;
  /** Net growth attributable to decision-age adults (25+), in persons. */
  decisionAgeGrowth: number;
  /** 25–34's share of decision-age net growth, in percent. The primary demographics-as-a-driver headline number. */
  youngDecisionMakerGrowthSharePct: number | null;
  /** 25–34's share of the decision-age adult population at the latest quarter, in percent. */
  youngDecisionMakerPopulationSharePct: number | null;
  /** Net of the two above, in pp. Negative = under-indexing relative to population weight. */
  youngDecisionMakerOverIndexPp: number | null;
} {
  const qThen = ageQuarters.find((q) => q.quarter === baselineQuarter);
  const qNow = ageQuarters.find((q) => q.quarter === latestQuarter);
  if (!qThen || !qNow) {
    return {
      rows: [],
      totalGrowth: 0,
      decisionAgeGrowth: 0,
      youngDecisionMakerGrowthSharePct: null,
      youngDecisionMakerPopulationSharePct: null,
      youngDecisionMakerOverIndexPp: null,
    };
  }

  function sumInsured(q: AgeCoverageQuarter, bands: string[]) {
    let s = 0;
    for (const b of bands) {
      const cell = q.bands[b];
      if (cell) s += cell.insured_persons;
    }
    return s;
  }

  function sumPopulation(q: AgeCoverageQuarter, bands: string[]) {
    let s = 0;
    for (const b of bands) {
      const cell = q.bands[b];
      if (cell) s += cell.population;
    }
    return s;
  }

  // Population denominator = decision-age adults (25+) at latest quarter.
  const decisionAgePopulationNow = GROWTH_AGE_GROUPS
    .filter((g) => g.decisionMaker)
    .reduce((s, g) => s + sumPopulation(qNow, g.bands), 0);

  let totalGrowth = 0;
  let decisionAgeGrowth = 0;

  const raw = GROWTH_AGE_GROUPS.map((g) => {
    const then = sumInsured(qThen, g.bands);
    const now = sumInsured(qNow, g.bands);
    const popThen = sumPopulation(qThen, g.bands);
    const popNow = sumPopulation(qNow, g.bands);
    const netNew = now - then;
    totalGrowth += netNew;
    if (g.decisionMaker) decisionAgeGrowth += netNew;
    const coverageRateThen = popThen > 0 ? then / popThen : null;
    const coverageRateNow = popNow > 0 ? now / popNow : null;
    const coverageDeltaPp =
      coverageRateNow != null && coverageRateThen != null
        ? (coverageRateNow - coverageRateThen) * 100
        : null;
    return {
      group: g,
      netNew,
      popNow,
      coverageRateThen,
      coverageRateNow,
      coverageDeltaPp,
    };
  });

  const rows: AgeGrowthRow[] = raw.map((r) => {
    const growthSharePct =
      r.group.decisionMaker && decisionAgeGrowth !== 0
        ? (r.netNew / decisionAgeGrowth) * 100
        : null;
    const populationSharePct =
      r.group.decisionMaker && decisionAgePopulationNow > 0
        ? (r.popNow / decisionAgePopulationNow) * 100
        : null;
    const overIndexPp =
      growthSharePct != null && populationSharePct != null
        ? growthSharePct - populationSharePct
        : null;
    return {
      label: r.group.label,
      decisionMaker: r.group.decisionMaker,
      netNew: r.netNew,
      growthSharePct,
      populationSharePct,
      overIndexPp,
      coverageRateThen: r.coverageRateThen,
      coverageRateNow: r.coverageRateNow,
      coverageDeltaPp: r.coverageDeltaPp,
    };
  });

  const young = rows.find((r) => r.label === "25–34");

  return {
    rows,
    totalGrowth,
    decisionAgeGrowth,
    youngDecisionMakerGrowthSharePct: young?.growthSharePct ?? null,
    youngDecisionMakerPopulationSharePct: young?.populationSharePct ?? null,
    youngDecisionMakerOverIndexPp: young?.overIndexPp ?? null,
  };
}

export type AgeYoyCohortKey =
  | "under25"
  | "a25_34"
  | "a35_49"
  | "a50_64"
  | "o65";

/**
 * Decision-age cohorts used by the YoY growth-in-covered-persons view. Under-25
 * is included for completeness but represents dependants on family policies
 * rather than independent buyers.
 */
export const AGE_YOY_GROUPS: {
  key: AgeYoyCohortKey;
  label: string;
  bands: string[];
  decisionMaker: boolean;
}[] = [
  {
    key: "under25",
    label: "Under 25",
    bands: ["0-4", "5-9", "10-14", "15-19", "20-24"],
    decisionMaker: false,
  },
  {
    key: "a25_34",
    label: "25–34",
    bands: ["25-29", "30-34"],
    decisionMaker: true,
  },
  {
    key: "a35_49",
    label: "35–49",
    bands: ["35-39", "40-44", "45-49"],
    decisionMaker: true,
  },
  {
    key: "a50_64",
    label: "50–64",
    bands: ["50-54", "55-59", "60-64"],
    decisionMaker: true,
  },
  {
    key: "o65",
    label: "65 and over",
    bands: ["65-69", "70-74", "75-79", "80+"],
    decisionMaker: true,
  },
];

export type AgeYoyRow = { quarter: string } & {
  [K in AgeYoyCohortKey]: number | null;
};

/**
 * Trailing-4-quarter year-on-year percent change in insured persons per age
 * cohort, returned as decimals (e.g. 0.021 = 2.1%). Earliest 4 quarters have
 * nulls because the YoY baseline is unavailable.
 */
export function computeAgeYoyGrowthSeries(ageQuarters: AgeCoverageQuarter[]): AgeYoyRow[] {
  const sorted = [...ageQuarters].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const sumInsured = (q: AgeCoverageQuarter, bands: string[]) => {
    let s = 0;
    for (const b of bands) {
      const cell = q.bands[b];
      if (cell) s += cell.insured_persons;
    }
    return s;
  };
  const out: AgeYoyRow[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const q = sorted[i];
    const prior = i >= 4 ? sorted[i - 4] : null;
    const row = { quarter: q.quarter } as AgeYoyRow;
    for (const g of AGE_YOY_GROUPS) {
      row[g.key] = null;
    }
    if (prior) {
      for (const g of AGE_YOY_GROUPS) {
        const now = sumInsured(q, g.bands);
        const then = sumInsured(prior, g.bands);
        row[g.key] = then > 0 ? (now - then) / then : null;
      }
    }
    out.push(row);
  }
  return out;
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

/* ------------------------------------------------------------------ *
 * Tangential-insight helpers (PED, LHC-31, MLS, extras gap series)
 * ------------------------------------------------------------------ */

export type GoldElasticity = {
  /** % change in Gold insured persons, baseline -> latest (e.g. -17.9). */
  deltaQuantityPct: number | null;
  /** % change in Gold premium index, sourced from the 5y CHOICE observation. */
  deltaPricePct: number | null;
  /** % change in industry-weighted-average premium over the same window. */
  industryAvgPct: number | null;
  /** Own-price elasticity: ΔQ% / ΔP%. Negative = demand falls as price rises. */
  elasticity: number | null;
  /** Gold premium-revenue index: (1 + ΔQ%) * (1 + ΔP%). 1.00 = unchanged revenue. */
  revenueIndex: number | null;
  /** Which 5y observation drove this (for footnoting). */
  observation: PremiumMultiYearObservation | null;
  goldPersonsThen: number | null;
  goldPersonsNow: number | null;
};

/**
 * Back-of-envelope own-price elasticity of demand for Gold hospital cover
 * over the 5-year window that CHOICE/DoH both publish data on (Jan 2021 -> Apr 2025).
 * Uses Gold insured_persons from tier_quarterly anchored on the closest available quarters.
 *
 * NOTE: this is an aggregate partial correlation, not a causal identification;
 * it is confounded by the 2019 reform tail, COVID and demographic shift.
 */
export function computeGoldElasticity(
  tierSeries: TierQuarter[],
  premium: PremiumTierData | null,
): GoldElasticity {
  const obs =
    premium?.multi_year_observations.find((o) => o.id === "gold_vs_industry_5y") ?? null;

  // For the quantity change, use the tier series we have: 2020-06-30 (stable-tier baseline) -> latest.
  // This is the tightest pair inside the published window that the dashboard already shows.
  const sorted = [...tierSeries].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const then = sorted.find((t) => t.quarter >= BASELINE_QUARTER);
  const latest = sorted.at(-1);
  const qThen = then?.insured_persons.gold ?? null;
  const qNow = latest?.insured_persons.gold ?? null;
  const deltaQuantityPct =
    qThen != null && qNow != null && qThen > 0 ? ((qNow - qThen) / qThen) * 100 : null;

  const deltaPricePct = obs?.cumulative_pct ?? null;
  const industryAvgPct = obs?.industry_avg_pct ?? null;

  const elasticity =
    deltaQuantityPct != null && deltaPricePct != null && deltaPricePct !== 0
      ? deltaQuantityPct / deltaPricePct
      : null;

  const revenueIndex =
    deltaQuantityPct != null && deltaPricePct != null
      ? (1 + deltaQuantityPct / 100) * (1 + deltaPricePct / 100)
      : null;

  return {
    deltaQuantityPct,
    deltaPricePct,
    industryAvgPct,
    elasticity,
    revenueIndex,
    observation: obs,
    goldPersonsThen: qThen,
    goldPersonsNow: qNow,
  };
}

export type Lhc31BandRow = {
  band: string;
  coverageThen: number | null;
  coverageNow: number | null;
  coverageDeltaPp: number | null;
  populationNow: number | null;
  insuredNow: number | null;
  /** If the baseline coverage rate had held, implied insured = pop_now * coverage_then. */
  impliedInsuredAtThenRate: number | null;
  /** impliedInsuredAtThenRate - insured_now. Positive = shortfall vs held rate. */
  shortfallPersons: number | null;
};

/**
 * For each band (default 25-29, 30-34, 35-39) compute the coverage rate at baseline
 * vs latest and the counterfactual "persons missing vs baseline rate".
 * This is the core of the LHC-31 puzzle narrative.
 */
export function computeLhc31Shortfall(
  ageQuarters: AgeCoverageQuarter[],
  baselineQuarter: string,
  latestQuarter: string,
  bands: string[] = ["25-29", "30-34", "35-39"],
): Lhc31BandRow[] {
  const qThen = ageQuarters.find((q) => q.quarter === baselineQuarter);
  const qNow = ageQuarters.find((q) => q.quarter === latestQuarter);
  return bands.map((band) => {
    const cellThen = qThen?.bands[band];
    const cellNow = qNow?.bands[band];
    const coverageThen = cellThen ? cellThen.coverage_rate : null;
    const coverageNow = cellNow ? cellNow.coverage_rate : null;
    const populationNow = cellNow ? cellNow.population : null;
    const insuredNow = cellNow ? cellNow.insured_persons : null;
    const implied =
      populationNow != null && coverageThen != null ? populationNow * coverageThen : null;
    const shortfall =
      implied != null && insuredNow != null ? implied - insuredNow : null;
    const coverageDeltaPp =
      coverageThen != null && coverageNow != null ? (coverageNow - coverageThen) * 100 : null;
    return {
      band,
      coverageThen,
      coverageNow,
      coverageDeltaPp,
      populationNow,
      insuredNow,
      impliedInsuredAtThenRate: implied,
      shortfallPersons: shortfall,
    };
  });
}

/**
 * Build the quarterly coverage-rate trajectory for a set of age bands.
 * Used by the LHC-31 panel's small-multiples.
 */
export function computeCoverageRateSeriesByBand(
  ageQuarters: AgeCoverageQuarter[],
  bands: string[],
): { quarter: string; rates: Record<string, number | null> }[] {
  const sorted = [...ageQuarters].sort((a, b) => a.quarter.localeCompare(b.quarter));
  return sorted.map((q) => {
    const rates: Record<string, number | null> = {};
    for (const b of bands) {
      const cell = q.bands[b];
      rates[b] = cell ? cell.coverage_rate : null;
    }
    return { quarter: q.quarter, rates };
  });
}

export type MlsBreakeven = {
  /** Income (AUD) at which MLS payable equals the representative Basic premium. */
  breakevenIncomeAud: number | null;
  /** The tier that the breakeven sits in. */
  breakevenTierLabel: string | null;
};

/**
 * For a flat representative Basic-policy premium, find the income at which
 * MLS payable first equals or exceeds the premium (i.e. Basic becomes the cheaper option).
 * Uses the piecewise MLS rate table.
 */
export function computeMlsBreakeven(
  tiers: MlsTier[],
  basicPremiumAud: number,
): MlsBreakeven {
  // Skip the base (rate 0) tier; find the first tier whose MLS at tier.min >= premium,
  // else solve the flat equation inside the tier: MLS = rate * income -> income = premium / rate.
  for (const t of tiers) {
    if (t.rate <= 0) continue;
    const incomeAtMin = t.min;
    const mlsAtMin = incomeAtMin * t.rate;
    if (mlsAtMin >= basicPremiumAud) {
      return { breakevenIncomeAud: incomeAtMin, breakevenTierLabel: t.label };
    }
    // solve inside this tier
    const solved = basicPremiumAud / t.rate;
    if (t.max == null || solved <= t.max) {
      return { breakevenIncomeAud: Math.round(solved), breakevenTierLabel: t.label };
    }
  }
  return { breakevenIncomeAud: null, breakevenTierLabel: null };
}

/**
 * Discrete income samples for charting MLS $ cost vs flat Basic premium.
 * The MLS is piecewise-constant rate on income; cost = income * rate (zero in base tier).
 */
export function buildMlsCurve(
  tiers: MlsTier[],
  minIncome: number,
  maxIncome: number,
  step: number = 1000,
): { income: number; mlsAud: number; tierLabel: string }[] {
  const rows: { income: number; mlsAud: number; tierLabel: string }[] = [];
  const rateAt = (income: number): { rate: number; label: string } => {
    for (const t of tiers) {
      const lo = t.min;
      const hi = t.max ?? Number.POSITIVE_INFINITY;
      if (income >= lo && income <= hi) return { rate: t.rate, label: t.label };
    }
    const last = tiers[tiers.length - 1];
    return { rate: last.rate, label: last.label };
  };
  for (let inc = minIncome; inc <= maxIncome; inc += step) {
    const { rate, label } = rateAt(inc);
    rows.push({ income: inc, mlsAud: inc * rate, tierLabel: label });
  }
  return rows;
}

export type BasicTierGrowth = {
  personsThen: number | null;
  personsNow: number | null;
  pctChange: number | null;
  shareThen: number | null;
  shareNow: number | null;
  totalPctChange: number | null;
};

/**
 * Basic tier growth since baseline vs total hospital cover growth.
 * The MLS panel uses this to show the observed "Basic floor" consistent with the tax-arithmetic.
 */
export function computeBasicTierGrowth(
  tierSeries: TierQuarter[],
  baselineQuarter: string,
): BasicTierGrowth {
  const sorted = [...tierSeries].sort((a, b) => a.quarter.localeCompare(b.quarter));
  const then = sorted.find((t) => t.quarter >= baselineQuarter);
  const latest = sorted.at(-1);
  const personsThen = then?.insured_persons.basic ?? null;
  const personsNow = latest?.insured_persons.basic ?? null;
  const shareThen = then?.share.basic ?? null;
  const shareNow = latest?.share.basic ?? null;
  const totalThen = then?.total_insured_persons ?? null;
  const totalNow = latest?.total_insured_persons ?? null;
  const pctChange =
    personsThen != null && personsNow != null && personsThen > 0
      ? ((personsNow - personsThen) / personsThen) * 100
      : null;
  const totalPctChange =
    totalThen != null && totalNow != null && totalThen > 0
      ? ((totalNow - totalThen) / totalThen) * 100
      : null;
  return { personsThen, personsNow, pctChange, shareThen, shareNow, totalPctChange };
}

export type ExtrasGapPoint = {
  quarter: string;
  /** Hospital-share pp delta since baseline (e.g. 1.94). */
  hospitalPp: number | null;
  /** Extras-share pp delta since baseline. */
  extrasPp: number | null;
  /** extrasPp - hospitalPp. */
  gapPp: number | null;
};

/**
 * Quarterly pp-delta trajectory of hospital and extras share-of-population
 * relative to the baseline quarter, plus the extras-minus-hospital gap.
 */
export function computeExtrasHospitalGapSeries(
  national: NationalQuarter[],
  baselineQuarter: string,
): ExtrasGapPoint[] {
  const base = getNationalAtQuarter(national, baselineQuarter);
  const baseH = base?.hospitalShare ?? null;
  const baseE = base?.extrasShare ?? null;
  return [...national]
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
    .map((q) => {
      const h = q.hospital_treatment.share_of_population ?? null;
      const e = q.general_treatment.share_of_population ?? null;
      const hPp = h != null && baseH != null ? (h - baseH) * 100 : null;
      const ePp = e != null && baseE != null ? (e - baseE) * 100 : null;
      const gap = hPp != null && ePp != null ? ePp - hPp : null;
      return { quarter: q.quarter, hospitalPp: hPp, extrasPp: ePp, gapPp: gap };
    });
}
