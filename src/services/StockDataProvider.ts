// Stock Data Provider Interface
// This interface defines the contract for all stock data providers

import type {
  StockQuote,
  StockProfile,
  FinancialMetrics,
  SearchResult,
  HistoricalData,
  HistoricalFinancials,
} from '../types';

export interface StockDataProvider {
  readonly name: string;
  readonly id: string;

  /**
   * Search for stocks by query (symbol or company name)
   */
  searchStocks(query: string): Promise<SearchResult[]>;

  /**
   * Get real-time quote for a stock
   */
  getStockQuote(symbol: string): Promise<StockQuote | null>;

  /**
   * Get company profile information
   */
  getStockProfile(symbol: string): Promise<StockProfile | null>;

  /**
   * Get financial metrics (valuation, margins, etc.)
   */
  getFinancialMetrics(symbol: string): Promise<FinancialMetrics | null>;

  /**
   * Get historical price data
   */
  getHistoricalData(symbol: string, range?: string): Promise<HistoricalData[]>;

  /**
   * Get historical financial statements
   */
  getHistoricalFinancials(symbol: string, period?: 'annual' | 'quarterly'): Promise<HistoricalFinancials[]>;

  /**
   * Fetch all stock data at once
   */
  getFullStockData(symbol: string): Promise<FullStockData>;
}

export interface FullStockData {
  quote: StockQuote | null;
  profile: StockProfile | null;
  metrics: FinancialMetrics | null;
  history: HistoricalData[];
  historicalFinancials: HistoricalFinancials[];
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseStockDataProvider implements StockDataProvider {
  abstract readonly name: string;
  abstract readonly id: string;

  abstract searchStocks(query: string): Promise<SearchResult[]>;
  abstract getStockQuote(symbol: string): Promise<StockQuote | null>;
  abstract getStockProfile(symbol: string): Promise<StockProfile | null>;
  abstract getFinancialMetrics(symbol: string): Promise<FinancialMetrics | null>;
  abstract getHistoricalData(symbol: string, range?: string): Promise<HistoricalData[]>;
  abstract getHistoricalFinancials(symbol: string, period?: 'annual' | 'quarterly'): Promise<HistoricalFinancials[]>;

  /**
   * Fetch all stock data at once
   */
  async getFullStockData(symbol: string): Promise<FullStockData> {
    const [quote, profile, metrics, history, historicalFinancials] = await Promise.all([
      this.getStockQuote(symbol),
      this.getStockProfile(symbol),
      this.getFinancialMetrics(symbol),
      this.getHistoricalData(symbol, '10y'),
      this.getHistoricalFinancials(symbol),
    ]);

    return { quote, profile, metrics, history, historicalFinancials };
  }
}

