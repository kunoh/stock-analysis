// Stock data types

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap: number;
  exchange: string;
}

export interface StockProfile {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  country: string;
  exchange: string;
  currency: string;
  website: string;
  employees: number;
}

export interface FinancialMetrics {
  // Valuation
  peRatio: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToSales: number | null;
  priceToBook: number | null;
  evToEbitda: number | null;
  evToEbit: number | null;
  evToRevenue: number | null;

  // Profitability
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  roa: number | null;

  // Financial Data
  revenue: number | null;
  netIncome: number | null;
  ebitda: number | null;
  ebit: number | null;
  eps: number | null;
  freeCashFlow: number | null;

  // Balance Sheet
  totalCash: number | null;
  totalDebt: number | null;
  netDebt: number | null;
  sharesOutstanding: number | null;
  enterpriseValue: number | null;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceProjection {
  year: number;
  bearCase: number;
  baseCase: number;
  bullCase: number;
}

export interface ProjectionAssumptions {
  revenueGrowth: {
    bear: number;
    base: number;
    bull: number;
  };
  targetMargin: {
    bear: number;
    base: number;
    bull: number;
  };
  exitMultiple: {
    bear: number;
    base: number;
    bull: number;
  };
  multipleType: 'pe' | 'evEbit' | 'evEbitda' | 'evRevenue' | 'evFcf';
  dilutionRate: number;
  years: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface HistoricalFinancials {
  year: number;
  /** Quarter label such as "Q1 '24". Undefined for annual data. */
  label?: string;
  revenue: number | null;
  netIncome: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  eps: number | null;
  peRatio: number | null;
  evToEbitda: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  sbc: number | null;
}
