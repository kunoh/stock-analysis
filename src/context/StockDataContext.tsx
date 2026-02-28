// Stock Data Context - provides dependency injection for the Yahoo Finance provider

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { StockDataProvider, FullStockData } from '../services';
import type {
  StockQuote,
  StockProfile,
  FinancialMetrics,
  SearchResult,
  HistoricalData,
  HistoricalFinancials,
} from '../types';

interface StockDataContextValue {
  searchStocks: (query: string) => Promise<SearchResult[]>;
  getStockQuote: (symbol: string) => Promise<StockQuote | null>;
  getStockProfile: (symbol: string) => Promise<StockProfile | null>;
  getFinancialMetrics: (symbol: string) => Promise<FinancialMetrics | null>;
  getHistoricalData: (symbol: string, range?: string) => Promise<HistoricalData[]>;
  getHistoricalFinancials: (symbol: string, period?: 'annual' | 'quarterly') => Promise<HistoricalFinancials[]>;
  getFullStockData: (symbol: string) => Promise<FullStockData>;
}

const StockDataContext = createContext<StockDataContextValue | null>(null);

interface Props {
  children: ReactNode;
  initialProvider: StockDataProvider;
}

export function StockDataContextProvider({ children, initialProvider }: Props) {
  // Wrap provider methods in a stable memo so components can safely use them
  // as effect dependencies without triggering unnecessary re-runs.
  const value = useMemo<StockDataContextValue>(() => ({
    searchStocks: (q) => initialProvider.searchStocks(q),
    getStockQuote: (s) => initialProvider.getStockQuote(s),
    getStockProfile: (s) => initialProvider.getStockProfile(s),
    getFinancialMetrics: (s) => initialProvider.getFinancialMetrics(s),
    getHistoricalData: (s, r) => initialProvider.getHistoricalData(s, r),
    getHistoricalFinancials: (s, p) => initialProvider.getHistoricalFinancials(s, p),
    getFullStockData: (s) => initialProvider.getFullStockData(s),
  }), [initialProvider]);

  return (
    <StockDataContext.Provider value={value}>
      {children}
    </StockDataContext.Provider>
  );
}

export function useStockData(): StockDataContextValue {
  const context = useContext(StockDataContext);
  if (!context) {
    throw new Error('useStockData must be used within a StockDataContextProvider');
  }
  return context;
}
