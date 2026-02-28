interface Props {
  label: string;
  current: number | null;
  tenYearAgo: number | null;
  color: 'purple' | 'amber' | 'green';
}

export function MarginCard({ label, current, tenYearAgo, color }: Props) {
  const colorClasses = {
    purple: 'border-purple-200 bg-purple-50 text-purple-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-green-200 bg-green-50 text-green-700',
  };

  const change = current && tenYearAgo ? current - tenYearAgo : 0;
  const isPositive = change >= 0;

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1">{current?.toFixed(1) || '-'}%</p>
      <p className={`text-xs mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}pp vs 10Y ago
      </p>
    </div>
  );
}
