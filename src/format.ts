export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

/**
 * Compact signed count (e.g. +1.49M, −842k, +980) for tight KPI captions.
 * Uses 2 decimals for millions, 0 for thousands, raw for < 1,000.
 */
export function fmtCompactSigned(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "\u2212" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${abs.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

export function fmtPct(share: number | null | undefined): string {
  if (share == null || Number.isNaN(share)) return "—";
  return (share * 100).toLocaleString("en-AU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function shortQuarterLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const m = d.getUTCMonth();
  const y = d.getUTCFullYear();
  const q = Math.floor(m / 3) + 1;
  return `${y} Q${q}`;
}

export function yyyymmdd(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Render an Australian financial-year string with an en-dash.
 * Accepts either "2024-25" (hyphen, as published by the ATO) or
 * "2024–25" (already en-dashed) and normalises to "2024–25".
 */
export function fmtFinancialYear(fy: string | null | undefined): string {
  if (!fy) return "—";
  return fy.replace(/-/g, "\u2013");
}

/** Australian dollars, rounded, with A$ prefix for first-mention clarity. */
export function fmtAud(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `A$${n.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

/** Expanded jurisdiction labels for readability (APRA column keys). */
export const JURISDICTION_DISPLAY: Record<string, string> = {
  NSW_ACT: "New South Wales & ACT",
  VIC: "Victoria",
  QLD: "Queensland",
  SA_NT: "South Australia & NT",
  WA: "Western Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
  AUST: "Australia (national)",
};

export function jurisdictionDisplayName(key: string): string {
  return JURISDICTION_DISPLAY[key] ?? key;
}
