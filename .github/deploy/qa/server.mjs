import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import { pathToFileURL } from 'node:url';
import compression from 'compression';

export const QA_ORIGIN = 'https://test.midiametal.com';

export function validateRuntimeEnvironment(env) {
  if (env.BUILD_TEST_MODE && env.BUILD_TEST_MODE !== 'false') {
    throw new Error('BUILD_TEST_MODE is forbidden in the deployed QA runtime.');
  }
  if (![QA_ORIGIN, `${QA_ORIGIN}/`].includes(env.API_BACKEND_URL)) {
    throw new Error('QA API_BACKEND_URL must be https://test.midiametal.com.');
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(env.MIDIA_RELEASE || '')) {
    throw new Error('QA requires a valid MIDIA_RELEASE.');
  }
  if (!/^[a-f0-9]{40}$/.test(env.MIDIA_COMMIT || '')) {
    throw new Error('QA requires a full MIDIA_COMMIT SHA.');
  }
  return { release: env.MIDIA_RELEASE, commit: env.MIDIA_COMMIT };
}

function json(req, res, status, payload) {
  if (res.destroyed || res.writableEnded) return;
  if (res.headersSent) { res.destroy(); return; }
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** Inject the Astro handler so routing and release identity are testable without a build. */
export function createQaHandler(astroHandler, identity) {
  if (typeof astroHandler !== 'function') throw new TypeError('An Astro request handler is required.');
  const compress = compression({ threshold: 1024, level: 6 });
  return (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Midia-Release', identity.release);
    res.setHeader('X-Midia-Commit', identity.commit);
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, QA_ORIGIN).pathname).replace(/\/{2,}/g, '/');
    } catch {
      json(req, res, 400, { message: 'Invalid request path.' });
      return;
    }
    if (/^\/(?:api|sanctum|storage)(?:\/|$)/i.test(pathname)) {
      // PHP must receive these paths before Node. Never proxy to our own hostname:
      // a routing mistake should fail immediately instead of recursing over HTTP.
      json(req, res, 502, { message: 'QA backend routing is unavailable.', code: 'QA_BACKEND_ROUTING_ERROR' });
      return;
    }
    if (pathname === '/_qa/health') {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        json(req, res, 405, { message: 'Method not allowed.' });
        return;
      }
      json(req, res, 200, { status: 'ok', service: 'frontend', ...identity });
      return;
    }
    compress(req, res, () => {
      try {
        Promise.resolve(astroHandler(req, res)).catch(() => json(req, res, 500, { message: 'The frontend is temporarily unavailable.' }));
      } catch {
        json(req, res, 500, { message: 'The frontend is temporarily unavailable.' });
      }
    });
  };
}

function loadReleaseEnvironment() {
  try {
    loadEnvFile(new URL('./.env', import.meta.url));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

export async function startQaServer() {
  const identity = validateRuntimeEnvironment(process.env);
  process.env.ASTRO_NODE_AUTOSTART = 'disabled';
  const { handler } = await import('./dist/server/entry.mjs');
  const server = createServer(createQaHandler(handler, identity));
  server.listen(process.env.PORT || 4321, process.env.HOST || '0.0.0.0', () => {
    console.log(`Midia QA frontend running: ${identity.release} (${identity.commit}).`);
  });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
  return server;
}

// Passenger may import its configured startup file instead of invoking it as the
// main script. Its release .env opts in explicitly; test imports stay inert.
loadReleaseEnvironment();
if (process.env.MIDIA_RUNTIME_AUTOSTART === 'enabled'
    || (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)) {
  await startQaServer();
}
