import type { FinancialMetrics } from '../types';
import { formatLargeNumber, formatPercent } from '../utils/format';

interface Props {
  metrics: FinancialMetrics;
}

export function FinancialOverview({ metrics }: Props) {
  const incomeData = [
    { label: 'Revenue (TTM)', value: formatLargeNumber(metrics.revenue) },
    { label: 'Net Income', value: formatLargeNumber(metrics.netIncome) },
    { label: 'EBITDA', value: formatLargeNumber(metrics.ebitda) },
    { label: 'EBIT', value: formatLargeNumber(metrics.ebit) },
    { label: 'EPS', value: metrics.eps ? `$${metrics.eps.toFixed(2)}` : '-' },
    { label: 'Free Cash Flow', value: formatLargeNumber(metrics.freeCashFlow) },
  ];

  const marginData = [
    { label: 'Gross Margin', value: formatPercent(metrics.grossMargin), color: getMarginColor(metrics.grossMargin, 'gross') },
    { label: 'Operating Margin', value: formatPercent(metrics.operatingMargin), color: getMarginColor(metrics.operatingMargin, 'operating') },
    { label: 'Net Margin', value: formatPercent(metrics.netMargin), color: getMarginColor(metrics.netMargin, 'net') },
  ];

  const returnData = [
    { label: 'Return on Equity', value: formatPercent(metrics.roe), description: 'ROE' },
    { label: 'Return on Assets', value: formatPercent(metrics.roa), description: 'ROA' },
  ];

  const balanceData = [
    { label: 'Total Cash', value: formatLargeNumber(metrics.totalCash) },
    { label: 'Total Debt', value: formatLargeNumber(metrics.totalDebt) },
    { label: 'Net Debt', value: formatLargeNumber(metrics.netDebt) },
  ];

  return (
    <div className="space-y-6">
      {/* Income Statement */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Income Statement Highlights</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {incomeData.map((item) => (
            <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Profitability */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profitability Margins</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {marginData.map((item) => (
            <div key={item.label} className="p-4 rounded-lg border-2" style={{ borderColor: item.color, backgroundColor: `${item.color}10` }}>
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
              <MarginBar value={parseFloat(item.value) || 0} color={item.color} />
            </div>
          ))}
        </div>
      </div>

      {/* Returns */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Return Metrics</h2>
        <div className="grid grid-cols-2 gap-4">
          {returnData.map((item) => (
            <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Balance Sheet */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Balance Sheet Highlights</h2>
        <div className="grid grid-cols-3 gap-4">
          {balanceData.map((item) => (
            <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MarginBar({ value, color }: { value: number; color: string }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function getMarginColor(value: number | null, type: 'gross' | 'operating' | 'net'): string {
  if (value === null) return '#9ca3af';

  const thresholds = {
    gross: { low: 30, mid: 50 },
    operating: { low: 10, mid: 20 },
    net: { low: 5, mid: 15 },
  };

  const t = thresholds[type];
  if (value < t.low) return '#ef4444'; // red
  if (value < t.mid) return '#f59e0b'; // amber
  return '#10b981'; // green
}
