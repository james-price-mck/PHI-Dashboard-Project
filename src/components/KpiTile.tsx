type KpiTileProps = {
  label: string;
  value: string;
  sub?: string;
  delta?: {
    text: string;
    direction: "up" | "down" | "neutral";
  };
};

export function KpiTile({ label, value, sub, delta }: KpiTileProps) {
  return (
    <div className="kpi">
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
