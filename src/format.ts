export function fmtInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
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
