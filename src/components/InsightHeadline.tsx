type InsightHeadlineProps = {
  title: string;
  subtitle?: string;
};

export function InsightHeadline({ title, subtitle }: InsightHeadlineProps) {
  return (
    <header>
      <p className="insight-headline">{title}</p>
      {subtitle && <p className="insight-sub">{subtitle}</p>}
    </header>
  );
}
