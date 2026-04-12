const LOCAL_API_FALLBACK = 'http://127.0.0.1:8000/api';

const isLocalHostname = (hostname: string | undefined) =>
  hostname === '127.0.0.1' || hostname === 'localhost';

export function getApiBase(requestUrl?: URL | string) {
  const runtimeApiUrl = typeof process !== 'undefined' ? process.env.PUBLIC_API_URL : undefined;
  const publicApiUrl = runtimeApiUrl || import.meta.env.PUBLIC_API_URL || LOCAL_API_FALLBACK;

  const requestHostname = typeof requestUrl === 'string'
    ? (() => {
        try {
          return new URL(requestUrl).hostname;
        } catch {
          return undefined;
        }
      })()
    : requestUrl?.hostname;

  if (isLocalHostname(requestHostname)) {
    return LOCAL_API_FALLBACK;
  }

  return publicApiUrl.replace(/\/+$/, '');
}
