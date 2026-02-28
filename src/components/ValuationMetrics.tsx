import type { FinancialMetrics } from '../types';

interface Props {
  metrics: FinancialMetrics;
  price: number;
  marketCap: number | null;
}

export function ValuationMetrics({ metrics, marketCap }: Props) {
  const formatNumber = (val: number | null, suffix = '') => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return val.toFixed(2) + suffix;
  };

  const formatLarge = (val: number | null) => {
    if (val === null || val === undefined) return '-';
    if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  // Calculate Enterprise Value — prefer Yahoo's pre-calculated figure (includes preferred stock
  // and minority interest), fall back to the simplified formula when unavailable.
  const enterpriseValue = metrics.enterpriseValue
    ?? (marketCap != null && metrics.netDebt != null ? marketCap + metrics.netDebt : null);

  // Prefer computing EV multiples from raw components so they stay consistent
  // with the Enterprise Value shown in the breakdown below. Fall back to the
  // pre-calculated ratios from Yahoo when individual components are missing.
  const evToEbit = enterpriseValue && metrics.ebit
    ? enterpriseValue / metrics.ebit
    : metrics.evToEbit;

  const evToEbitda = enterpriseValue && metrics.ebitda
    ? enterpriseValue / metrics.ebitda
    : metrics.evToEbitda;

  const evToRevenue = enterpriseValue && metrics.revenue
    ? enterpriseValue / metrics.revenue
    : metrics.evToRevenue;

  const evToFcf = enterpriseValue && metrics.freeCashFlow
    ? enterpriseValue / metrics.freeCashFlow
    : null;

  const valuationMetrics = [
    { label: 'P/E Ratio (TTM)', value: formatNumber(metrics.peRatio, 'x'), description: 'Price to Earnings' },
    { label: 'Forward P/E', value: formatNumber(metrics.forwardPE, 'x'), description: 'Based on estimates' },
    { label: 'PEG Ratio', value: formatNumber(metrics.pegRatio, 'x'), description: 'P/E to Growth' },
    { label: 'P/S Ratio', value: formatNumber(metrics.priceToSales, 'x'), description: 'Price to Sales' },
    { label: 'P/B Ratio', value: formatNumber(metrics.priceToBook, 'x'), description: 'Price to Book' },
    { label: 'EV/EBITDA', value: formatNumber(evToEbitda, 'x'), description: 'Enterprise Value to EBITDA' },
    { label: 'EV/EBIT', value: formatNumber(evToEbit, 'x'), description: 'Enterprise Value to EBIT' },
    { label: 'EV/Revenue', value: formatNumber(evToRevenue, 'x'), description: 'Enterprise Value to Revenue' },
    { label: 'EV/FCF', value: formatNumber(evToFcf, 'x'), description: 'Enterprise Value to Free Cash Flow' },
  ];

  const valuationData = [
    { label: 'Market Cap', value: formatLarge(marketCap) },
    { label: 'Enterprise Value', value: formatLarge(enterpriseValue) },
    { label: 'Total Debt', value: formatLarge(metrics.totalDebt) },
    { label: 'Total Cash', value: formatLarge(metrics.totalCash) },
    { label: 'Net Debt', value: formatLarge(metrics.netDebt) },
    { label: 'Shares Outstanding', value: metrics.sharesOutstanding ? `${(metrics.sharesOutstanding / 1e9).toFixed(2)}B` : '-' },
  ];

  return (
    <div className="space-y-6">
      {/* Valuation Multiples */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Valuation Multiples</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {valuationMetrics.map((metric) => (
            <div key={metric.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
              <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Value Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Enterprise Value Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {valuationData.map((item) => (
            <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Valuation Guide */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Understanding Valuation Multiples</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>P/E Ratio:</strong> How much investors pay for each dollar of earnings. Lower = potentially undervalued.</p>
          <p><strong>EV/EBIT:</strong> Enterprise value relative to operating profit. Useful for comparing companies with different capital structures.</p>
          <p><strong>EV/EBITDA:</strong> Similar to EV/EBIT but adds back depreciation. Good for capital-intensive businesses.</p>
          <p><strong>P/S Ratio:</strong> Useful for unprofitable growth companies. Compare to industry peers.</p>
        </div>
      </div>
    </div>
  );
}
