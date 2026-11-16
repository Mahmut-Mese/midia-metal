const QA_ORIGIN = 'https://test.midiametal.com';

/** QA never falls back to another environment when its configuration is missing. */
export function resolveQaApiOrigin(env: Record<string, string | undefined>): string {
  let origin: URL;
  try {
    origin = new URL(env.API_BACKEND_URL || '');
  } catch {
    throw new Error('QA requires API_BACKEND_URL.');
  }
  const plainOrigin = !origin.username && !origin.password && origin.pathname === '/'
    && !origin.search && !origin.hash;
  const buildFixture = env.BUILD_TEST_MODE === 'true';
  const allowed = buildFixture
    ? origin.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)
    : origin.origin === QA_ORIGIN;
  if (!plainOrigin || !allowed) {
    throw new Error(buildFixture
      ? 'QA build fixtures require a loopback HTTP API_BACKEND_URL.'
      : 'QA API_BACKEND_URL must be https://test.midiametal.com.');
  }
  return origin.origin;
}

export function getApiBase(_requestUrl?: URL | string): string {
  if (typeof window !== 'undefined') return '/api';
  const env = typeof process !== 'undefined' ? process.env : {};
  return `${resolveQaApiOrigin(env)}/api`;
}
