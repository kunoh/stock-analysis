import type { IncomingMessage, ServerResponse } from 'node:http';
import { yahooApiHandler } from '../yahoo-finance-proxy.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // vercel.json routes /api/yahoo/:path* here with _p=<path-segments>
  // e.g. /api/yahoo/v10/finance/quoteSummary/AAPL?modules=price
  //   -> req.url = /api/yahoo-handler?_p=v10/finance/quoteSummary/AAPL&modules=price
  const parsed = new URL(`http://localhost${req.url ?? '/'}`);
  const rawPath = decodeURIComponent(parsed.searchParams.get('_p') ?? '');
  parsed.searchParams.delete('_p');
  const qs = parsed.searchParams.toString();
  req.url = '/' + rawPath + (qs ? '?' + qs : '');
  await yahooApiHandler(req, res);
}
