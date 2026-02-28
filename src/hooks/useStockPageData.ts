import { useState, useEffect } from 'react';
import { useStockData } from '../context';
import type { FullStockData } from '../services';

interface StockPageState extends FullStockData {
  loading: boolean;
  error: string | null;
}

const EMPTY: FullStockData = {
  quote: null,
  profile: null,
  metrics: null,
  history: [],
  historicalFinancials: [],
};

// Simple in-memory cache with a 5-minute TTL.
const CACHE_TTL_MS = 5 * 60 * 1000;
interface CacheEntry { data: FullStockData; ts: number }
const cache = new Map<string, CacheEntry>();

function getCached(symbol: string): FullStockData | null {
  const entry = cache.get(symbol);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(symbol); return null; }
  return entry.data;
}

export function useStockPageData(symbol: string | undefined): StockPageState {
  const { getFullStockData } = useStockData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FullStockData>(EMPTY);

  useEffect(() => {
    if (!symbol) return;

    const normalized = symbol.toUpperCase();

    // Clear stale data immediately so the previous stock's info doesn't flash
    // under the new ticker while loading.
    setData(EMPTY);
    setLoading(true);
    setError(null);

    const cached = getCached(normalized);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    getFullStockData(normalized)
      .then((d) => {
        if (!d.quote) {
          setError(`Could not find stock: ${symbol}`);
        } else {
          cache.set(normalized, { data: d, ts: Date.now() });
          setData(d);
        }
      })
      .catch((err) => {
        setError('Failed to load stock data. Please try again.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [symbol, getFullStockData]);

  return { ...data, loading, error };
}
