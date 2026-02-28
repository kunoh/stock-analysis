// Vite plugin: server-side proxy for Yahoo Finance using yahoo-finance2 (v3).
// Exposes a small REST-like API at /api/yahoo/* that YahooFinanceProvider calls.
//
// yahooApiHandler is also exported for use in the production server (server.ts).
// When used via the Vite plugin the framework strips the /api/yahoo prefix before
// calling the handler; the production server does the same manually.

import https from 'node:https';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Fetch a single annual or quarterly SBC timeseries directly from Yahoo Finance's
 * ws/fundamentals-timeseries endpoint (bypasses yahoo-finance2's module enum restriction).
 * Returns a Map<YYYY-MM-DD, rawValue>.
 */
async function fetchSBC(symbol: string, type: string, period1: string): Promise<Map<string, number>> {
  const seriesType = (type === 'quarterly' ? 'quarterly' : 'annual') + 'StockBasedCompensation';
  const p1 = Math.floor(new Date(period1).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?type=${seriesType}&period1=${p1}&period2=9999999999&merge=false&padMissingValues=false`;

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk: string) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          const map = new Map<string, number>();
          for (const result of parsed?.timeseries?.result ?? []) {
            for (const entry of result?.[seriesType] ?? []) {
              const date = String(entry.date).slice(0, 10);
              const value = entry.reportedValue?.raw ?? entry.reportedValue;
              if (date && value != null) map.set(date, value);
            }
          }
          resolve(map);
        } catch {
          resolve(new Map());
        }
      });
    });
    req.on('error', () => resolve(new Map()));
    req.setTimeout(10000, () => { req.destroy(); resolve(new Map()); });
  });
}

/** Convert a Yahoo Finance range string (e.g. "10y") to a start Date. */
function rangeToDate(range: string): Date {
  const d = new Date();
  switch (range) {
    case '1d':  d.setDate(d.getDate() - 1);          break;
    case '5d':  d.setDate(d.getDate() - 5);          break;
    case '1mo': d.setMonth(d.getMonth() - 1);        break;
    case '3mo': d.setMonth(d.getMonth() - 3);        break;
    case '6mo': d.setMonth(d.getMonth() - 6);        break;
    case '1y':  d.setFullYear(d.getFullYear() - 1);  break;
    case '2y':  d.setFullYear(d.getFullYear() - 2);  break;
    case '5y':  d.setFullYear(d.getFullYear() - 5);  break;
    case '10y': d.setFullYear(d.getFullYear() - 10); break;
    case 'ytd': d.setMonth(0); d.setDate(1);         break;
    case 'max': return new Date('1990-01-01');
    default:    d.setFullYear(d.getFullYear() - 10);
  }
  return d;
}

/**
 * Core request handler for all /api/yahoo/* routes.
 * req.url must already have the /api/yahoo prefix stripped (e.g. "/v1/finance/search?q=AAPL").
 * Used by both the Vite dev plugin and the production server.
 */
export async function yahooApiHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    const YahooFinance = (await import('yahoo-finance2')).default;
    const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    const url = new URL(`http://localhost${req.url ?? '/'}`);
    const path = url.pathname;

    // GET /v1/finance/search?q={query}
    if (path === '/v1/finance/search') {
      const q = url.searchParams.get('q') ?? '';
      const result = await yf.search(q, { quotesCount: 10, newsCount: 0 });
      send(200, result);

    // GET /v10/finance/quoteSummary/{symbol}?modules=price,summaryProfile,...
    } else if (path.startsWith('/v10/finance/quoteSummary/')) {
      const symbol = decodeURIComponent(path.slice('/v10/finance/quoteSummary/'.length));
      const modules = (url.searchParams.get('modules') ?? '')
        .split(',')
        .filter(Boolean) as any[];
      const result = await yf.quoteSummary(symbol, { modules });
      send(200, { quoteSummary: { result: [result], error: null } });

    // GET /v8/finance/chart/{symbol}?interval=1d&range=10y
    } else if (path.startsWith('/v8/finance/chart/')) {
      const symbol   = decodeURIComponent(path.slice('/v8/finance/chart/'.length));
      const interval = (url.searchParams.get('interval') ?? '1d') as any;
      const range    = url.searchParams.get('range') ?? '10y';
      const result   = await yf.chart(symbol, { period1: rangeToDate(range), interval });
      send(200, { chart: { result: [result], error: null } });

    // GET /v1/finance/fundamentalsTimeSeries/{symbol}?type=annual&period1=2010-01-01
    } else if (path.startsWith('/v1/finance/fundamentalsTimeSeries/')) {
      const symbol  = decodeURIComponent(path.slice('/v1/finance/fundamentalsTimeSeries/'.length));
      const type    = url.searchParams.get('type') ?? 'annual';
      const period1 = url.searchParams.get('period1') ?? '2010-01-01';
      const [financials, sbcByDate] = await Promise.all([
        yf.fundamentalsTimeSeries(symbol, { type, period1, module: 'financials' }),
        fetchSBC(symbol, type, period1),
      ]);
      const dateKey = (d: any) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
      const merged = (financials as any[]).map((r: any) => ({
        ...r,
        stockBasedCompensation: sbcByDate.get(dateKey(r.date)) ?? null,
      }));
      send(200, merged);

    } else {
      send(404, { error: `Unknown endpoint: ${path}` });
    }
  } catch (err: any) {
    console.error('[yahoo-proxy]', err.message);
    send(500, { error: err.message });
  }
}

/** Vite dev-server plugin — mounts yahooApiHandler at /api/yahoo. */
export function yahooFinanceProxy(): Plugin {
  return {
    name: 'yahoo-finance-proxy',
    configureServer(server) {
      server.middlewares.use('/api/yahoo', yahooApiHandler);
    },
  };
}
