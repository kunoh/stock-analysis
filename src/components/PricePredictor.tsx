import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { FinancialMetrics, ProjectionAssumptions } from '../types';
import {
  type MultipleType,
  calculateCAGR,
  calculateProjections,
  calculateFairValuePrice,
} from '../utils/valuation';

interface Props {
  symbol: string;
  currentPrice: number;
  metrics: FinancialMetrics;
  marketCap: number | null;
}

const MULTIPLE_LABELS: Record<MultipleType, string> = {
  pe: 'P/E Ratio',
  evEbit: 'EV/EBIT',
  evEbitda: 'EV/EBITDA',
  evRevenue: 'EV/Revenue',
  evFcf: 'EV/FCF',
};

export function PricePredictor({ symbol, currentPrice, metrics, marketCap }: Props) {
  const currentYear = new Date().getFullYear();

  // Mirror ValuationMetrics: prefer Yahoo's pre-calculated EV, fall back to
  // marketCap + netDebt so both tabs always use the same enterprise value.
  const ev = metrics.enterpriseValue
    ?? (marketCap != null && metrics.netDebt != null ? marketCap + metrics.netDebt : null);
  const computedEvToEbit    = ev && metrics.ebit         ? ev / metrics.ebit         : metrics.evToEbit;
  const computedEvToEbitda  = ev && metrics.ebitda        ? ev / metrics.ebitda        : metrics.evToEbitda;
  const computedEvToRevenue = ev && metrics.revenue       ? ev / metrics.revenue       : metrics.evToRevenue;
  const computedEvToFcf     = ev && metrics.freeCashFlow  ? ev / metrics.freeCashFlow  : null;

  // Get current multiples from metrics
  const currentMultiples = {
    pe: metrics.peRatio || 20,
    evEbit: computedEvToEbit || 15,
    evEbitda: computedEvToEbitda || 12,
    evRevenue: computedEvToRevenue || 3,
    evFcf: computedEvToFcf || 20,
  };

  const currentMargin = metrics.netMargin ?? 10;
  // Use additive spread so bull always improves over base (fixes negative-margin companies
  // where multiplicative scaling made bull WORSE than base)
  const marginSpread = Math.max(Math.abs(currentMargin) * 0.25, 5);

  const [assumptions, setAssumptions] = useState<ProjectionAssumptions>({
    revenueGrowth: { bear: 5, base: 10, bull: 18 },
    targetMargin: { bear: currentMargin - marginSpread, base: currentMargin, bull: currentMargin + marginSpread },
    exitMultiple: { bear: currentMultiples.pe * 0.7, base: currentMultiples.pe, bull: currentMultiples.pe * 1.3 },
    multipleType: 'pe',
    dilutionRate: 1,
    years: 5,
  });

  const projections = useMemo(() => {
    return calculateProjections(metrics, assumptions, currentYear);
  }, [metrics, assumptions, currentYear]);

  // Calculate fair value today (Year 0) based on current financials and selected multiples
  const fairValueToday = useMemo(() => {
    const currentRevenue = metrics.revenue || 0;
    const sharesOutstanding = metrics.sharesOutstanding || 1;

    const fv = (targetMargin: number, exitMultiple: number) =>
      calculateFairValuePrice(
        currentRevenue, sharesOutstanding,
        targetMargin / 100, exitMultiple,
        assumptions.multipleType, metrics
      );

    return {
      bear: fv(assumptions.targetMargin.bear, assumptions.exitMultiple.bear),
      base: fv(assumptions.targetMargin.base, assumptions.exitMultiple.base),
      bull: fv(assumptions.targetMargin.bull, assumptions.exitMultiple.bull),
    };
  }, [metrics, assumptions]);

  const chartData = projections.map((p) => ({
    year: p.year.toString(),
    Bear: p.bearCase,
    Base: p.baseCase,
    Bull: p.bullCase,
  }));

  // Add current year fair value as starting point
  const fullChartData = [
    { year: currentYear.toString(), Bear: fairValueToday.bear, Base: fairValueToday.base, Bull: fairValueToday.bull },
    ...chartData,
  ];

  const updateAssumption = (
    scenario: 'bear' | 'base' | 'bull',
    field: 'revenueGrowth' | 'targetMargin' | 'exitMultiple',
    value: number
  ) => {
    setAssumptions((prev) => ({
      ...prev,
      [field]: { ...prev[field], [scenario]: value },
    }));
  };

  // Calculate implied returns
  const finalYear = projections[projections.length - 1];
  const impliedReturns = finalYear ? {
    bear: calculateCAGR(currentPrice, finalYear.bearCase, assumptions.years) ?? 0,
    base: calculateCAGR(currentPrice, finalYear.baseCase, assumptions.years) ?? 0,
    bull: calculateCAGR(currentPrice, finalYear.bullCase, assumptions.years) ?? 0,
  } : { bear: 0, base: 0, bull: 0 };

  return (
    <div className="space-y-6">
      {/* Multiple Type Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Valuation Method</h2>
        <div className="flex gap-2">
          {(Object.keys(MULTIPLE_LABELS) as MultipleType[]).map((type) => (
            <button
              key={type}
              onClick={() => setAssumptions((prev) => ({
                ...prev,
                multipleType: type,
                exitMultiple: {
                  bear: currentMultiples[type] * 0.7,
                  base: currentMultiples[type],
                  bull: currentMultiples[type] * 1.3,
                }
              }))}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                assumptions.multipleType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {MULTIPLE_LABELS[type]}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Current {MULTIPLE_LABELS[assumptions.multipleType]}: {currentMultiples[assumptions.multipleType].toFixed(1)}x
        </p>
      </div>

      {/* Assumptions Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Input Your Assumptions</h2>

        <div className="grid grid-cols-3 gap-6">
          {/* Bear Case */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐻</span>
              <h3 className="font-semibold text-red-700">Bear Case</h3>
            </div>

            <InputField
              label="Revenue Growth (CAGR)"
              value={assumptions.revenueGrowth.bear}
              onChange={(v) => updateAssumption('bear', 'revenueGrowth', v)}
              suffix="%"
              color="red"
            />
            <InputField
              label="Target Net Margin"
              value={assumptions.targetMargin.bear}
              onChange={(v) => updateAssumption('bear', 'targetMargin', v)}
              suffix="%"
              color="red"
            />
            <InputField
              label={`Exit ${MULTIPLE_LABELS[assumptions.multipleType]}`}
              value={assumptions.exitMultiple.bear}
              onChange={(v) => updateAssumption('bear', 'exitMultiple', v)}
              suffix="x"
              color="red"
            />
          </div>

          {/* Base Case */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-gray-700">Base Case</h3>
            </div>

            <InputField
              label="Revenue Growth (CAGR)"
              value={assumptions.revenueGrowth.base}
              onChange={(v) => updateAssumption('base', 'revenueGrowth', v)}
              suffix="%"
              color="gray"
            />
            <InputField
              label="Target Net Margin"
              value={assumptions.targetMargin.base}
              onChange={(v) => updateAssumption('base', 'targetMargin', v)}
              suffix="%"
              color="gray"
            />
            <InputField
              label={`Exit ${MULTIPLE_LABELS[assumptions.multipleType]}`}
              value={assumptions.exitMultiple.base}
              onChange={(v) => updateAssumption('base', 'exitMultiple', v)}
              suffix="x"
              color="gray"
            />
          </div>

          {/* Bull Case */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐂</span>
              <h3 className="font-semibold text-green-700">Bull Case</h3>
            </div>

            <InputField
              label="Revenue Growth (CAGR)"
              value={assumptions.revenueGrowth.bull}
              onChange={(v) => updateAssumption('bull', 'revenueGrowth', v)}
              suffix="%"
              color="green"
            />
            <InputField
              label="Target Net Margin"
              value={assumptions.targetMargin.bull}
              onChange={(v) => updateAssumption('bull', 'targetMargin', v)}
              suffix="%"
              color="green"
            />
            <InputField
              label={`Exit ${MULTIPLE_LABELS[assumptions.multipleType]}`}
              value={assumptions.exitMultiple.bull}
              onChange={(v) => updateAssumption('bull', 'exitMultiple', v)}
              suffix="x"
              color="green"
            />
          </div>
        </div>

        {/* Dilution */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="max-w-xs">
            <InputField
              label="Annual Share Dilution"
              value={assumptions.dilutionRate}
              onChange={(v) => setAssumptions((prev) => ({ ...prev, dilutionRate: v }))}
              suffix="%"
              color="gray"
            />
          </div>
        </div>
      </div>

      {/* Fair Value Today */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">📍 Fair Value Today ({currentYear})</h2>
        <p className="text-sm text-gray-600 mb-4">What the stock should be worth based on current financials and your selected multiples</p>

        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Current Price</p>
            <p className="text-2xl font-bold text-gray-900">${currentPrice.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border-2 border-red-200">
            <p className="text-sm text-red-600">🐻 Bear Fair Value</p>
            <p className="text-2xl font-bold text-red-600">${fairValueToday.bear.toFixed(2)}</p>
            <p className={`text-sm ${fairValueToday.bear > currentPrice ? 'text-green-600' : 'text-red-600'}`}>
              {fairValueToday.bear > currentPrice ? '▲' : '▼'} {Math.abs(((fairValueToday.bear / currentPrice) - 1) * 100).toFixed(1)}% {fairValueToday.bear > currentPrice ? 'undervalued' : 'overvalued'}
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
            <p className="text-sm text-blue-600">📊 Base Fair Value</p>
            <p className="text-2xl font-bold text-blue-600">${fairValueToday.base.toFixed(2)}</p>
            <p className={`text-sm ${fairValueToday.base > currentPrice ? 'text-green-600' : 'text-red-600'}`}>
              {fairValueToday.base > currentPrice ? '▲' : '▼'} {Math.abs(((fairValueToday.base / currentPrice) - 1) * 100).toFixed(1)}% {fairValueToday.base > currentPrice ? 'undervalued' : 'overvalued'}
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg border-2 border-green-200">
            <p className="text-sm text-green-600">🐂 Bull Fair Value</p>
            <p className="text-2xl font-bold text-green-600">${fairValueToday.bull.toFixed(2)}</p>
            <p className={`text-sm ${fairValueToday.bull > currentPrice ? 'text-green-600' : 'text-red-600'}`}>
              {fairValueToday.bull > currentPrice ? '▲' : '▼'} {Math.abs(((fairValueToday.bull / currentPrice) - 1) * 100).toFixed(1)}% {fairValueToday.bull > currentPrice ? 'undervalued' : 'overvalued'}
            </p>
          </div>
        </div>
      </div>

      {/* Results Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Projections for {symbol}</h2>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fullChartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                width={70}
              />
              <Tooltip
                formatter={(value) => value !== undefined ? [`$${Number(value).toFixed(2)}`, ''] : ['', '']}
                itemSorter={(item) => ({ Bull: 0, Base: 1, Bear: 2 } as Record<string, number>)[item.dataKey as string] ?? 99}
                contentStyle={{ borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="Bear" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Base" stroke="#6b7280" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Bull" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Price Targets</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Year</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-red-600">🐻 Bear</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-gray-600">📊 Base</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-green-600">🐂 Bull</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 bg-blue-50">
                <td className="py-3 px-4 text-sm font-medium text-blue-700">{currentYear} (Fair Value)</td>
                <td className="py-3 px-4 text-right text-sm font-medium text-red-600">${fairValueToday.bear.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-sm font-medium text-blue-600">${fairValueToday.base.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-sm font-medium text-green-600">${fairValueToday.bull.toFixed(2)}</td>
              </tr>
              {projections.map((p) => (
                <tr key={p.year} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-sm text-gray-600">{p.year}</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-red-600">${p.bearCase.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">${p.baseCase.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-sm font-medium text-green-600">${p.bullCase.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Implied Returns */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Implied Annualized Returns ({assumptions.years}-Year CAGR)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-sm text-red-600">Bear Case</p>
              <p className={`text-xl font-bold ${impliedReturns.bear >= 0 ? 'text-red-600' : 'text-red-800'}`}>
                {impliedReturns.bear >= 0 ? '+' : ''}{impliedReturns.bear.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg text-center">
              <p className="text-sm text-gray-600">Base Case</p>
              <p className={`text-xl font-bold ${impliedReturns.base >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {impliedReturns.base >= 0 ? '+' : ''}{impliedReturns.base.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-green-600">Bull Case</p>
              <p className={`text-xl font-bold ${impliedReturns.bull >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {impliedReturns.bull >= 0 ? '+' : ''}{impliedReturns.bull.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology */}
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
        <h3 className="font-semibold text-amber-900 mb-2">⚠️ Important Disclaimer</h3>
        <p className="text-sm text-amber-800">
          These projections are based on your assumptions and simplified calculations. They do not account for
          macroeconomic factors, competitive dynamics, management execution, or many other variables.
          Always do thorough research before making investment decisions.
        </p>
      </div>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  color: 'red' | 'gray' | 'green';
}

function InputField({ label, value, onChange, suffix, color }: InputFieldProps) {
  const [localValue, setLocalValue] = useState(value.toFixed(1));
  const [focused, setFocused] = useState(false);

  // Sync from prop whenever the field is not focused (e.g. valuation method reset)
  useEffect(() => {
    if (!focused) setLocalValue(value.toFixed(1));
  }, [value, focused]);

  const colorClasses = {
    red: 'border-red-200 focus:border-red-500 focus:ring-red-500',
    gray: 'border-gray-200 focus:border-gray-500 focus:ring-gray-500',
    green: 'border-green-200 focus:border-green-500 focus:ring-green-500',
  };

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={localValue}
          step="0.5"
          onChange={(e) => {
            setLocalValue(e.target.value);
            const parsed = parseFloat(e.target.value);
            if (!isNaN(parsed)) onChange(parsed);
          }}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            const parsed = parseFloat(e.target.value);
            if (isNaN(parsed)) {
              setLocalValue(value.toFixed(1));
            } else {
              setLocalValue(parsed.toFixed(1));
              onChange(parsed);
            }
          }}
          className={`w-full px-3 py-2 pr-8 border rounded-lg focus:outline-none focus:ring-1 ${colorClasses[color]}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>
      </div>
    </div>
  );
}
