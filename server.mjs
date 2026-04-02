/**
 * server.mjs — Entry point for Astro standalone Node server.
 *
 * Wraps Astro's generated `dist/server/entry.mjs` with gzip/brotli compression.
 * API calls go directly to https://staging-api.midiawork.com — no proxy needed.
 *
 * Usage:
 *   node server.mjs
 */
import compression from 'compression';
import { handler as astroHandler } from './dist/server/entry.mjs';
import { createServer } from 'node:http';

const PORT = process.env.PORT || 4321;
const HOST = process.env.HOST || '0.0.0.0';

const compress = compression({
  threshold: 1024,
  level: 6,
});

const server = createServer((req, res) => {
  compress(req, res, () => {
    astroHandler(req, res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
