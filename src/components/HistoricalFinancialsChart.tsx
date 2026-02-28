import { useState, useEffect } from 'react';
import { useStockData } from '../context';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ComposedChart,
} from 'recharts';
import type { HistoricalFinancials, HistoricalData } from '../types';
import { MarginCard } from './MarginCard';
import { formatLargeNumber } from '../utils/format';
import { calculateCAGR } from '../utils/valuation';

type ChartType = 'revenue' | 'income' | 'margins' | 'valuation' | 'sbc';

interface Props {
  data: HistoricalFinancials[];
  symbol: string;
  history?: HistoricalData[];
}

export function HistoricalFinancialsChart({ data, symbol, history = [] }: Props) {
  const [chartType, setChartType] = useState<ChartType>('revenue');
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual');
  const [quarterlyData, setQuarterlyData] = useState<HistoricalFinancials[]>([]);
  const [quarterlyLoading, setQuarterlyLoading] = useState(true);
  const { getHistoricalFinancials } = useStockData();

  useEffect(() => {
    setQuarterlyLoading(true);
    getHistoricalFinancials(symbol, 'quarterly')
      .then(setQuarterlyData)
      .finally(() => setQuarterlyLoading(false));
  }, [symbol, getHistoricalFinancials]);

  const handlePeriodChange = (next: 'annual' | 'quarterly') => setPeriod(next);

  const activeData = period === 'quarterly' ? quarterlyData : data;

  // Build year → last trading day close price lookup from history
  const yearEndPrice: Record<number, number> = {};
  for (const d of history) {
    const yr = Number(d.date.slice(0, 4));
    if (d.close > 0) yearEndPrice[yr] = d.close; // later dates overwrite, leaving last trading day
  }

  // Add xLabel and compute peRatio from year-end price / EPS when not already set
  const displayData = activeData.map(item => {
    const price = yearEndPrice[item.year];
    const peRatio = item.peRatio ?? (price && item.eps && item.eps > 0 ? price / item.eps : null);
    return { ...item, xLabel: item.label ?? String(item.year), peRatio };
  });

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-center">No historical financial data available</p>
      </div>
    );
  }

  const chartTypes: { id: ChartType; label: string; icon: string }[] = [
    { id: 'revenue', label: 'Revenue & Income', icon: '📊' },
    { id: 'income', label: 'Profitability', icon: '💰' },
    { id: 'margins', label: 'Margins', icon: '📈' },
    { id: 'valuation', label: 'Valuation (P/E)', icon: '🎯' },
    { id: 'sbc', label: 'Share-Based Comp', icon: '🏷️' },
  ];

  const growthLabel = period === 'quarterly' ? 'QoQ Growth %' : 'YoY Growth %';

  const dataWithGrowth = displayData.map((item, index) => {
    const prevItem = displayData[index - 1];
    return {
      ...item,
      revenueGrowth: prevItem && prevItem.revenue
        ? ((item.revenue! - prevItem.revenue) / prevItem.revenue) * 100
        : null,
      netIncomeGrowth: prevItem && prevItem.netIncome
        ? ((item.netIncome! - prevItem.netIncome) / prevItem.netIncome) * 100
        : null,
    };
  });

  // Format CAGR result for display in StatBox
  const formatCAGR = (start: number | null, end: number | null, years: number): string => {
    const result = calculateCAGR(start, end, years);
    return result != null ? result.toFixed(1) : '-';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Historical Financials - {symbol}
        </h2>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => handlePeriodChange('annual')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              period === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Annual
          </button>
          <button
            onClick={() => handlePeriodChange('quarterly')}
            disabled={quarterlyLoading}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              period === 'quarterly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            } disabled:opacity-50`}
          >
            {quarterlyLoading ? 'Loading…' : 'Quarterly'}
          </button>
        </div>
      </div>

      {/* Chart Type Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {chartTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setChartType(type.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              chartType === type.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      {/* Revenue & Income Chart */}
      {chartType === 'revenue' && (
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dataWithGrowth} margin={{ top: 20, right: 30, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="xLabel" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(val) => formatLargeNumber(val)}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={80}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(val) => `${val?.toFixed(0)}%`}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={50}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (value === undefined) return ['-', name];
                    if (name === 'Revenue' || name === 'Net Income') {
                      return [formatLargeNumber(Number(value)), name];
                    }
                    return [`${Number(value)?.toFixed(1)}%`, name];
                  }}
                  itemSorter={(item) => ({'Revenue': 0, 'Net Income': 1, [growthLabel]: 2} as Record<string, number>)[item.name as string] ?? 99}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="netIncome" name="Net Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenueGrowth" name={growthLabel} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {(() => {
              const revItems = displayData.filter(d => d.revenue != null);
              const niItems = displayData.filter(d => d.netIncome != null);
              return (<>
                <StatBox label="Revenue CAGR" value={formatCAGR(revItems[0]?.revenue, revItems[revItems.length - 1]?.revenue, (revItems[revItems.length - 1]?.year ?? 0) - (revItems[0]?.year ?? 0))} suffix="%" />
                <StatBox label="Net Income CAGR" value={formatCAGR(niItems[0]?.netIncome, niItems[niItems.length - 1]?.netIncome, (niItems[niItems.length - 1]?.year ?? 0) - (niItems[0]?.year ?? 0))} suffix="%" />
              </>);
            })()}
            <StatBox
              label="Latest Revenue"
              value={formatLargeNumber(displayData[displayData.length - 1]?.revenue)}
            />
            <StatBox
              label="Latest Net Income"
              value={formatLargeNumber(displayData[displayData.length - 1]?.netIncome)}
            />
          </div>
        </div>
      )}

      {/* Profitability Chart */}
      {chartType === 'income' && (
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData} margin={{ top: 20, right: 30, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="xLabel" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tickFormatter={(val) => formatLargeNumber(val)}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={80}
                />
                <Tooltip
                  formatter={(value, name) => value !== undefined ? [formatLargeNumber(Number(value)), name] : ['-', name]}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="grossProfit" name="Gross Profit" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="operatingIncome" name="Operating Income" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netIncome" name="Net Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Margins Chart */}
      {chartType === 'margins' && (
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="xLabel" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  domain={[0, 'auto']}
                  width={50}
                />
                <Tooltip
                  formatter={(value, name) => value !== undefined ? [`${Number(value)?.toFixed(1)}%`, name] : ['-', name]}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="operatingMargin" name="Operating Margin" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="netMargin" name="Net Margin" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <MarginCard
              label="Gross Margin"
              current={displayData[displayData.length - 1]?.grossMargin}
              tenYearAgo={displayData[0]?.grossMargin}
              color="purple"
            />
            <MarginCard
              label="Operating Margin"
              current={displayData[displayData.length - 1]?.operatingMargin}
              tenYearAgo={displayData[0]?.operatingMargin}
              color="amber"
            />
            <MarginCard
              label="Net Margin"
              current={displayData[displayData.length - 1]?.netMargin}
              tenYearAgo={displayData[0]?.netMargin}
              color="green"
            />
          </div>
        </div>
      )}

      {/* Valuation Chart */}
      {chartType === 'valuation' && (
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayData} margin={{ top: 20, right: 30, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="xLabel" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  tickFormatter={(val) => `${val}x`}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  domain={[0, 'auto']}
                  width={50}
                />
                <Tooltip
                  formatter={(value, name) => value !== undefined ? [`${Number(value)?.toFixed(1)}x`, name] : ['-', name]}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="peRatio" name="P/E Ratio" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Current P/E"
              value={displayData[displayData.length - 1]?.peRatio?.toFixed(1) || '-'}
              suffix="x"
            />
            <StatBox
              label="Avg P/E"
              value={calculateAverage(displayData.map(d => d.peRatio)).toFixed(1)}
              suffix="x"
            />
            <StatBox
              label="Min P/E"
              value={(() => { const v = Math.min(...displayData.map(d => d.peRatio ?? Infinity)); return isFinite(v) ? v.toFixed(1) : '-'; })()}
              suffix="x"
            />
            <StatBox
              label="Max P/E"
              value={(() => { const v = Math.max(...displayData.map(d => d.peRatio ?? -Infinity)); return isFinite(v) ? v.toFixed(1) : '-'; })()}
              suffix="x"
            />
          </div>
        </div>
      )}

      {/* SBC Chart */}
      {chartType === 'sbc' && (
        <div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayData} margin={{ top: 20, right: 30, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="xLabel" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(val) => formatLargeNumber(val)}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={80}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(val) => `${val?.toFixed(1)}%`}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={50}
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (value === undefined) return ['-', name];
                    if (name === 'SBC') return [formatLargeNumber(Number(value)), name];
                    return [`${Number(value)?.toFixed(1)}%`, name];
                  }}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="sbc" name="SBC" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(d) => d.revenue && d.sbc ? (d.sbc / d.revenue) * 100 : null}
                  name="SBC % of Revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(d) => d.netIncome && d.netIncome > 0 && d.sbc ? (d.sbc / d.netIncome) * 100 : null}
                  name="SBC % of Net Income"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  strokeDasharray="4 2"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Latest SBC"
              value={formatLargeNumber(displayData[displayData.length - 1]?.sbc)}
            />
            <StatBox
              label="SBC CAGR"
              value={(() => {
                const items = displayData.filter(d => d.sbc != null);
                return formatCAGR(items[0]?.sbc, items[items.length - 1]?.sbc, (items[items.length - 1]?.year ?? 0) - (items[0]?.year ?? 0));
              })()}
              suffix="%"
            />
            <StatBox
              label="SBC % of Revenue"
              value={(() => {
                const d = displayData[displayData.length - 1];
                return d?.revenue && d?.sbc ? ((d.sbc / d.revenue) * 100).toFixed(1) : '-';
              })()}
              suffix="%"
            />
            <StatBox
              label="Avg SBC % of Rev"
              value={calculateAverage(
                displayData.map(d => d.revenue && d.sbc ? (d.sbc / d.revenue) * 100 : null)
              ).toFixed(1)}
              suffix="%"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, suffix = '' }: { label: string; value: string | number; suffix?: string }) {
  const displayValue = typeof value === 'number' ? value.toFixed(1) : value;
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">
        {displayValue}{suffix && !displayValue.toString().includes(suffix) ? suffix : ''}
      </p>
    </div>
  );
}

function calculateAverage(values: (number | null)[]): number {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}
