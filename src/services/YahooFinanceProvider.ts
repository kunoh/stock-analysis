// Yahoo Finance provider implementation
// Uses yahoo-finance2 (Node.js) via the Vite dev-server proxy at /api/yahoo.
// The proxy returns yahoo-finance2's normalized format:
//   - numbers are plain JS numbers (no {raw, fmt} wrappers)
//   - percentages/margins are decimals  (0.44 = 44%)
//   - dates are ISO strings after JSON serialisation
//
// For production you need a server-side handler at /api/yahoo.

import type {
  StockQuote,
  StockProfile,
  FinancialMetrics,
  SearchResult,
  HistoricalData,
  HistoricalFinancials,
} from '../types';
import { BaseStockDataProvider } from './StockDataProvider';

const BASE = '/api/yahoo';

/** Return v as a number or null (yahoo-finance2 values are already plain numbers). */
const num = (v: any): number | null =>
  v != null && typeof v === 'number' && isFinite(v) ? v : null;

/** Convert a decimal ratio to a percentage, or null. */
const pct = (v: any): number | null => {
  const n = num(v);
  return n != null ? n * 100 : null;
};

export class YahooFinanceProvider extends BaseStockDataProvider {
  readonly name = 'Yahoo Finance';
  readonly id = 'yahoo';

  async searchStocks(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 1) return [];

    try {
      const response = await fetch(
        `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      );
      if (!response.ok) {
        console.error('Yahoo Finance search failed:', response.status);
        return [];
      }

      const data = await response.json();
      const quotes: any[] = data?.quotes ?? [];

      return quotes
        .filter((item) => item.quoteType === 'EQUITY' || item.quoteType === 'ETF')
        .map((item) => ({
          symbol: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchange || '',
          type: item.quoteType || 'EQUITY',
        }));
    } catch (error) {
      console.error('Yahoo Finance search error:', error);
      return [];
    }
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const data = await this.fetchQuoteSummary(symbol, ['price']);
      const p = data?.price;
      if (!p) return null;

      return {
        symbol: p.symbol || symbol,
        name: p.longName || p.shortName || symbol,
        price: num(p.regularMarketPrice) ?? 0,
        change: num(p.regularMarketChange) ?? 0,
        // yahoo-finance2 returns changePercent as a decimal (0.05 = 5%)
        changePercent: (num(p.regularMarketChangePercent) ?? 0) * 100,
        high: num(p.regularMarketDayHigh) ?? 0,
        low: num(p.regularMarketDayLow) ?? 0,
        open: num(p.regularMarketOpen) ?? 0,
        previousClose: num(p.regularMarketPreviousClose) ?? 0,
        volume: num(p.regularMarketVolume) ?? 0,
        marketCap: num(p.marketCap) ?? 0,
        exchange: p.exchangeName || '',
      };
    } catch (error) {
      console.error('Yahoo Finance quote error:', error);
      return null;
    }
  }

  async getStockProfile(symbol: string): Promise<StockProfile | null> {
    try {
      const data = await this.fetchQuoteSummary(symbol, ['summaryProfile', 'price']);
      const profile = data?.summaryProfile;
      const price = data?.price;

      if (!profile) return null;

      return {
        symbol,
        name: price?.longName || price?.shortName || symbol,
        description: profile.longBusinessSummary || '',
        sector: profile.sector || '',
        industry: profile.industry || '',
        country: profile.country || '',
        exchange: price?.exchangeName || '',
        currency: price?.currency || 'USD',
        website: profile.website || '',
        employees: num(profile.fullTimeEmployees) ?? 0,
      };
    } catch (error) {
      console.error('Yahoo Finance profile error:', error);
      return null;
    }
  }

  async getFinancialMetrics(symbol: string): Promise<FinancialMetrics | null> {
    try {
      const data = await this.fetchQuoteSummary(symbol, [
        'defaultKeyStatistics',
        'financialData',
        'summaryDetail',
      ]);

      const stats = data?.defaultKeyStatistics;
      const fin = data?.financialData;
      const detail = data?.summaryDetail;

      if (!stats && !fin) return null;

      const totalDebt = num(fin?.totalDebt);
      const totalCash = num(fin?.totalCash);
      const revenue = num(fin?.totalRevenue);
      const operatingMarginDecimal = num(fin?.operatingMargins);
      // Approximate EBIT = revenue × operating margin (decimal)
      const ebit = revenue != null && operatingMarginDecimal != null
        ? revenue * operatingMarginDecimal
        : null;

      return {
        peRatio: num(detail?.trailingPE),
        forwardPE: num(detail?.forwardPE),
        pegRatio: num(stats?.pegRatio),
        priceToSales: num(detail?.priceToSalesTrailing12Months),
        priceToBook: num(stats?.priceToBook),
        evToEbitda: num(stats?.enterpriseToEbitda),
        evToEbit: null,
        evToRevenue: num(stats?.enterpriseToRevenue),

        grossMargin: pct(fin?.grossMargins),
        operatingMargin: pct(fin?.operatingMargins),
        netMargin: pct(fin?.profitMargins),
        roe: pct(fin?.returnOnEquity),
        roa: pct(fin?.returnOnAssets),

        revenue,
        netIncome: num(fin?.netIncomeToCommon) ?? num(stats?.netIncomeToCommon),
        ebitda: num(fin?.ebitda),
        ebit,
        eps: num(stats?.trailingEps),
        freeCashFlow: num(fin?.freeCashflow),

        totalCash,
        totalDebt,
        netDebt: totalDebt != null && totalCash != null ? totalDebt - totalCash : null,
        sharesOutstanding: num(stats?.sharesOutstanding),
        enterpriseValue: num(stats?.enterpriseValue),
      };
    } catch (error) {
      console.error('Yahoo Finance metrics error:', error);
      return null;
    }
  }

  async getHistoricalData(symbol: string, range: string = '10y'): Promise<HistoricalData[]> {
    try {
      const response = await fetch(
        `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${range}`
      );
      if (!response.ok) {
        console.error('Yahoo Finance historical data failed:', response.status);
        return [];
      }

      const data = await response.json();
      // yahoo-finance2 chart result: { meta, quotes: [{date, open, high, low, close, adjclose, volume}] }
      const quotes: any[] = data?.chart?.result?.[0]?.quotes ?? [];

      return quotes
        .map((q) => ({
          // date is an ISO string after JSON serialisation ("2024-01-15T15:00:00.000Z")
          date: typeof q.date === 'string' ? q.date.slice(0, 10) : '',
          open: num(q.open) ?? 0,
          high: num(q.high) ?? 0,
          low: num(q.low) ?? 0,
          close: num(q.adjclose) ?? num(q.close) ?? 0,
          volume: num(q.volume) ?? 0,
        }))
        .filter((d) => d.close > 0 && d.date !== '');
    } catch (error) {
      console.error('Yahoo Finance historical data error:', error);
      return [];
    }
  }

  async getHistoricalFinancials(symbol: string, period: 'annual' | 'quarterly' = 'annual'): Promise<HistoricalFinancials[]> {
    try {
      const response = await fetch(
        `${BASE}/v1/finance/fundamentalsTimeSeries/${encodeURIComponent(symbol)}?type=${period}&period1=2010-01-01`
      );
      if (!response.ok) {
        console.error('Yahoo Finance fundamentalsTimeSeries failed:', response.status);
        return [];
      }

      const data: any[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) return [];

      return data
        .map((s) => {
          const date           = new Date(s.date);
          const revenue        = num(s.totalRevenue);
          const grossProfit    = num(s.grossProfit);
          const operatingIncome = num(s.operatingIncome);
          const netIncome      = num(s.netIncome) ?? num(s.netIncomeCommonStockholders);

          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          const shortYear = String(date.getFullYear()).slice(2);

          return {
            year: date.getFullYear(),
            label: period === 'quarterly' ? `Q${quarter} '${shortYear}` : undefined,
            revenue,
            netIncome,
            grossProfit,
            operatingIncome,
            eps: num(s.dilutedEPS) ?? num(s.basicEPS) ?? null,
            peRatio: null,
            evToEbitda: null,
            grossMargin:     revenue && grossProfit     ? (grossProfit     / revenue) * 100 : null,
            operatingMargin: revenue && operatingIncome ? (operatingIncome / revenue) * 100 : null,
            netMargin:       revenue && netIncome       ? (netIncome       / revenue) * 100 : null,
            sbc: num(s.stockBasedCompensation),
          };
        })
        .sort((a, b) => {
          // Sort by year first, then by label (Q1 < Q2 < Q3 < Q4)
          if (a.year !== b.year) return a.year - b.year;
          return (a.label ?? '') < (b.label ?? '') ? -1 : 1;
        });
    } catch (error) {
      console.error('Yahoo Finance historical financials error:', error);
      return [];
    }
  }

  private async fetchQuoteSummary(symbol: string, modules: string[]): Promise<any> {
    const url = `${BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules.join(',')}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Yahoo Finance quoteSummary failed for ${symbol}:`, response.status);
      return null;
    }

    const data = await response.json();
    return data?.quoteSummary?.result?.[0] ?? null;
  }
}
