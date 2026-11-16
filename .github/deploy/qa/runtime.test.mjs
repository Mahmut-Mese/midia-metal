import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import config from './astro.config.mjs';
import { createQaHandler, QA_ORIGIN, validateRuntimeEnvironment } from './server.mjs';

const identity = { release: 'qa-123-1', commit: 'a'.repeat(40) };
const environment = { API_BACKEND_URL: QA_ORIGIN, MIDIA_RELEASE: identity.release, MIDIA_COMMIT: identity.commit };
const source = await readFile(new URL('./api-base.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { resolveQaApiOrigin } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
let frontend;
let port;
const handled = [];

before(async () => {
  frontend = createServer(createQaHandler((req, res) => {
    handled.push(req.url);
    if (req.url === '/broken') throw new Error('private diagnostic');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<main>Astro fixture</main>');
  }, identity));
  await new Promise(resolve => frontend.listen(0, '127.0.0.1', resolve));
  port = frontend.address().port;
});

after(async () => {
  if (frontend) await new Promise(resolve => frontend.close(resolve));
});

function send(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, ...options }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('health reports the deployed commit and release without caching or indexing', async () => {
  const response = await send('/_qa/health?verify=1');
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { status: 'ok', service: 'frontend', ...identity });
  assert.equal(response.headers['x-midia-release'], identity.release);
  assert.equal(response.headers['x-midia-commit'], identity.commit);
  assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(Number(response.headers['content-length']), response.body.length);
  assert.equal((await send('/_qa/health', { method: 'HEAD' })).body.length, 0);
  assert.equal((await send('/_qa/health', { method: 'POST' })).status, 405);
});

test('misrouted PHP, API and media requests fail closed without invoking Astro', async () => {
  for (const path of ['/api', '/api/health?x=1', '/sanctum/csrf-cookie', '/storage/photo.png', '/%61pi/health', '/api%2fhealth']) {
    const count = handled.length;
    const response = await send(path);
    assert.equal(response.status, 502, path);
    assert.equal(JSON.parse(response.body).code, 'QA_BACKEND_ROUTING_ERROR');
    assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
    assert.equal(handled.length, count);
  }
});

test('ordinary routes reach Astro while errors return no private diagnostics', async () => {
  for (const path of ['/shop', '/api-example', '/sanctum-info', '/storage-guide']) {
    const response = await send(path);
    assert.equal(response.status, 200);
    assert.match(response.body.toString(), /Astro fixture/);
    assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
  }
  const failure = await send('/broken');
  assert.equal(failure.status, 500);
  assert.doesNotMatch(failure.body.toString(), /private diagnostic/);
  assert.equal((await send('/%zz')).status, 400);
});

test('runtime requires the QA origin and traceable identity; fixture mode is forbidden', () => {
  assert.deepEqual(validateRuntimeEnvironment(environment), identity);
  for (const API_BACKEND_URL of [undefined, 'http://test.midiametal.com', 'https://example.com', 'http://127.0.0.1:8000', `${QA_ORIGIN}/api`, `${QA_ORIGIN}?x=1`]) {
    assert.throws(() => validateRuntimeEnvironment({ ...environment, API_BACKEND_URL }), /API_BACKEND_URL/);
  }
  assert.throws(() => validateRuntimeEnvironment({ ...environment, BUILD_TEST_MODE: 'true' }), /forbidden/);
  assert.throws(() => validateRuntimeEnvironment({ ...environment, MIDIA_COMMIT: 'abc' }), /MIDIA_COMMIT/);
  assert.throws(() => validateRuntimeEnvironment({ ...environment, MIDIA_RELEASE: 'release\r\nheader' }), /MIDIA_RELEASE/);
});

test('both direct and Passenger startup validate configuration before loading an artifact', () => {
  const entry = new URL('./server.mjs', import.meta.url);
  const env = { ...process.env, ...environment, BUILD_TEST_MODE: 'true', MIDIA_RUNTIME_AUTOSTART: 'enabled' };
  for (const args of [[entry.pathname], ['--input-type=module', '-e', `await import(${JSON.stringify(entry.href)})`]]) {
    const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 5000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /BUILD_TEST_MODE is forbidden/);
    assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND/);
  }
});

test('SSR API origin has no default; only explicit build fixtures can use loopback HTTP', () => {
  assert.equal(resolveQaApiOrigin(environment), QA_ORIGIN);
  assert.throws(() => resolveQaApiOrigin({}), /requires API_BACKEND_URL/);
  for (const origin of ['https://example.com', `${QA_ORIGIN}/api`, `${QA_ORIGIN}?x=1`, 'http://127.0.0.1:8000']) {
    assert.throws(() => resolveQaApiOrigin({ API_BACKEND_URL: origin }), /must be/);
  }
  for (const origin of ['http://127.0.0.1:8013', 'http://localhost:8013', 'http://[::1]:8013']) {
    assert.equal(resolveQaApiOrigin({ API_BACKEND_URL: origin, BUILD_TEST_MODE: 'true' }), origin);
  }
  for (const origin of [QA_ORIGIN, 'http://example.com', 'https://localhost:8013', 'http://user:pass@localhost:8013', 'http://localhost:8013/api']) {
    assert.throws(() => resolveQaApiOrigin({ API_BACKEND_URL: origin, BUILD_TEST_MODE: 'true' }), /loopback HTTP/);
  }
});

test('QA config fixes browser requests and content rendering to the intended environment', () => {
  assert.equal(config.site, QA_ORIGIN);
  assert.deepEqual(config.image.domains, ['test.midiametal.com']);
  assert.equal(config.vite.define['import.meta.env.PUBLIC_API_URL'], JSON.stringify('/api'));
  assert.deepEqual(config.vite.server.proxy, {});
  const integration = config.integrations.find(item => item.name === 'qa-public-pages-render-at-request-time');
  for (const component of ['src/pages/faq.astro', 'src/pages/login.astro', 'src/pages/blog/[slug].astro']) {
    const route = { component, prerender: true };
    integration.hooks['astro:route:setup']({ route });
    assert.equal(route.prerender, false);
  }
  const admin = { component: 'src/pages/admin/[...path].astro', prerender: true };
  integration.hooks['astro:route:setup']({ route: admin });
  assert.equal(admin.prerender, true);
});
