type KpiTileProps = {
  label: string;
  value: string;
  sub?: string;
  subPlacement?: "below-delta" | "above-delta";
  variant?: "default" | "tier";
  delta?: {
    text: string;
    direction: "up" | "down" | "neutral";
  };
};

function directionSrLabel(direction: "up" | "down" | "neutral"): string {
  if (direction === "up") return "up";
  if (direction === "down") return "down";
  return "no change";
}

function directionGlyph(direction: "up" | "down" | "neutral"): string {
  if (direction === "up") return "\u2191";
  if (direction === "down") return "\u2193";
  return "\u2014";
}

export function KpiTile({
  label,
  value,
  sub,
  subPlacement = "below-delta",
  delta,
  variant = "default",
}: KpiTileProps) {
  const subNode = sub ? <div className="sub">{sub}</div> : null;
  const deltaNode = delta ? (
    <div
      className={`kpi-delta ${
        delta.direction === "up" ? "up" : delta.direction === "down" ? "down" : ""
      }`}
    >
      {delta.direction !== "neutral" ? (
        <>
          <span aria-hidden="true">{directionGlyph(delta.direction)}</span>
          <span className="sr-only">{directionSrLabel(delta.direction)}</span>
        </>
      ) : (
        <span aria-hidden="true">{directionGlyph(delta.direction)}</span>
      )}{" "}
      {delta.text}
    </div>
  ) : null;

  return (
    <div className={`kpi${variant === "tier" ? " kpi--tier" : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {subPlacement === "above-delta" ? (
        <>
          {subNode}
          {deltaNode}
        </>
      ) : (
        <>
          {deltaNode}
          {subNode}
        </>
      )}
    </div>
  );
}
