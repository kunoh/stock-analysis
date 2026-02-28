import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { HistoricalData } from '../types';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | '10Y' | 'ALL';

interface PriceChartProps {
  data: HistoricalData[];
}

export function PriceChart({ data }: PriceChartProps) {
  const [range, setRange] = useState<TimeRange>('1Y');

  const filteredData = filterDataByRange(data, range);
  
  const minPrice = Math.min(...filteredData.map(d => d.close)) * 0.98;
  const maxPrice = Math.max(...filteredData.map(d => d.close)) * 1.02;

  const isPositive = filteredData.length > 1 
    ? filteredData[filteredData.length - 1].close >= filteredData[0].close 
    : true;

  const ranges: TimeRange[] = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', 'ALL'];

  return (
    <div>
      {/* Range Selector */}
      <div className="flex gap-2 mb-4">
        {ranges.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              range === r
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => formatDate(date, range)}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minPrice, maxPrice]}
              tickFormatter={(val) => `$${val.toFixed(0)}`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as HistoricalData;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="text-sm text-gray-500">{data.date}</p>
                      <p className="text-lg font-semibold">${data.close.toFixed(2)}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        <p>Open: ${data.open.toFixed(2)}</p>
                        <p>High: ${data.high.toFixed(2)}</p>
                        <p>Low: ${data.low.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke={isPositive ? '#10b981' : '#ef4444'} 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: isPositive ? '#10b981' : '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function filterDataByRange(data: HistoricalData[], range: TimeRange): HistoricalData[] {
  if (range === 'ALL' || data.length === 0) return data;

  const now = new Date();
  let cutoffDate: Date;

  switch (range) {
    case '1M':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case '3M':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case '6M':
      cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case '2Y':
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 2));
      break;
    case '5Y':
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 5));
      break;
    case '10Y':
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 10));
      break;
    case '1Y':
    default:
      cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
  }

  return data.filter(d => new Date(d.date) >= cutoffDate);
}

function formatDate(dateStr: string, range: TimeRange): string {
  const date = new Date(dateStr);
  if (range === '1M') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
