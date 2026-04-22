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

export type AgeQuarter = {
  quarter: string;
  hospital_insured_by_age_band: Record<string, number>;
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

export type DashboardData = {
  meta: {
    data_as_of: string | null;
    etl_build_time_utc: string;
    source_file: string;
    apra_methodology_change_iso: string;
    pop_denominator_note: string;
    hospital_vs_general_note: string;
    tier_note: string;
    sources: string[];
  };
  reconciliation: Reconciliation;
  national_quarterly: NationalQuarter[];
  jurisdiction_quarterly: JurisdictionQuarter[];
  hospital_by_age_quarterly: AgeQuarter[];
};
