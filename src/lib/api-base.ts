const LOCAL_API_FALLBACK = 'http://127.0.0.1:8000/api';

export function getApiBase() {
  const runtimeApiUrl = typeof process !== 'undefined' ? process.env.PUBLIC_API_URL : undefined;
  const publicApiUrl = runtimeApiUrl || import.meta.env.PUBLIC_API_URL || LOCAL_API_FALLBACK;

  return publicApiUrl.replace(/\/+$/, '');
}
