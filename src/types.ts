export type TreatmentBlock = {
  insured_persons: number | null;
  share_of_population: number | null;
  population_denominator: number | null;
};

export type NationalQuarter = {
  quarter: string;
  hospital_treatment: TreatmentBlock;
  general_treatment: TreatmentBlock;
};

export type JurisdictionQuarter = {
  quarter: string;
  jurisdictions: Record<
    string,
    {
      share_of_population: number | null;
      insured_persons: number | null;
      population_denominator: number | null;
    }
  >;
};

export type AgeCoverageBand = {
  insured_persons: number;
  population: number;
  coverage_rate: number;
};

export type AgeCoverageQuarter = {
  quarter: string;
  bands: Record<string, AgeCoverageBand>;
};

export type TierKey = "gold" | "silver" | "bronze" | "basic" | "other";

export type TierBlock = Record<TierKey, number | null>;

export type TierQuarter = {
  quarter: string;
  insured_persons: TierBlock;
  share: TierBlock;
  total_insured_persons: number | null;
  grand_total_published: number | null;
};

export type Reconciliation = {
  passed: boolean;
  metric: string;
  expected: number | null;
  actual: number | null;
  abs_diff: number | null;
  tolerance: number;
  message: string;
};

export type TierReconciliation = {
  metric: string;
  quarters_compared: number;
  worst_relative_diff: number;
  worst_quarter: string | null;
  apra_at_worst: number | null;
  doh_tier_sum_at_worst: number | null;
  tolerance: number;
  passed: boolean;
};

export type PremiumIndustryRow = {
  effective: string;
  increase_pct: number;
};

export type PremiumTierRound = {
  effective: string;
  label: string;
  industry_avg_pct: number;
  gold: number;
  silver: number;
  bronze: number;
  basic: number;
  source: string;
};

export type PremiumMultiYearObservation = {
  id: string;
  window_label: string;
  tier: "gold" | "silver" | "bronze" | "basic";
  cumulative_pct?: number;
  by_fund?: Record<string, number>;
  industry_avg_pct: number;
  source: string;
  note: string;
};

export type PremiumTierData = {
  meta: {
    last_reviewed: string;
    sources: string[];
    notes: string;
  };
  industry_average_pct: PremiumIndustryRow[];
  tier_rounds: PremiumTierRound[];
  multi_year_observations: PremiumMultiYearObservation[];
};

export type DashboardData = {
  meta: {
    data_as_of: string | null;
    series_start_iso: string;
    etl_build_time_utc: string;
    source_file: string;
    apra_methodology_change_iso: string;
    tier_reform_effective_iso: string;
    pop_denominator_note: string;
    hospital_vs_general_note: string;
    tier_note?: string;
    age_source_note?: string;
    sources: string[];
  };
  reconciliation: Reconciliation;
  tier_reconciliation?: TierReconciliation;
  national_quarterly: NationalQuarter[];
  jurisdiction_quarterly: JurisdictionQuarter[];
  age_coverage_quarterly?: AgeCoverageQuarter[];
  tier_quarterly?: TierQuarter[];
};
