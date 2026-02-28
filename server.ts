// Production server
// Serves the static Vite build from dist/ and handles /api/yahoo/* requests
// using the same yahoo-finance2 logic as the dev proxy.
//
// Usage:
//   npm run build          # build the frontend
//   npm start              # start the production server

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { yahooApiHandler } from './yahoo-finance-proxy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const DIST = path.join(__dirname, 'dist');

const MIME: Record<string, string> = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.svg':   'image/svg+xml',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
};

http.createServer(async (req, res) => {
  const rawUrl = req.url ?? '/';
  const urlPath = rawUrl.split('?')[0];

  // Route /api/yahoo/* to Yahoo Finance handler.
  // Strip the prefix so req.url matches what the handler expects.
  if (urlPath.startsWith('/api/yahoo')) {
    req.url = rawUrl.slice('/api/yahoo'.length) || '/';
    await yahooApiHandler(req, res);
    return;
  }

  // Resolve a file in dist/.
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);

  // Unknown path or directory → SPA fallback to index.html.
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);

}).listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`);
});
