type KpiTileProps = {
  label: string;
  value: string;
  sub?: string;
  variant?: "default" | "tier";
  delta?: {
    text: string;
    direction: "up" | "down" | "neutral";
  };
};

export function KpiTile({ label, value, sub, delta, variant = "default" }: KpiTileProps) {
  return (
    <div className={`kpi${variant === "tier" ? " kpi--tier" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {delta && (
        <div
          className={`kpi-delta ${
            delta.direction === "up" ? "up" : delta.direction === "down" ? "down" : ""
          }`}
        >
          {delta.direction === "up" ? "↑" : delta.direction === "down" ? "↓" : "—"}{" "}
          {delta.text}
        </div>
      )}
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
