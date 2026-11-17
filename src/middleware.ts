/**
 * Astro middleware — applies default cache headers to SSR pages.
 *
 * Shop pages always fetch current catalogue data after publishing changes.
 * Other pages retain their explicit Cache-Control or receive this default:
 *   - CDN/proxy caches for 10 minutes
 *   - Serves stale content while revalidating for up to 1 hour
 *   - Browser does NOT cache (always hits CDN)
 *
 * Prerendered (SSG) pages are already static files — this middleware
 * only runs for SSR pages.
 */
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  if (/^\/shop(?:\/|$)/.test(context.url.pathname)) {
    response.headers.set('Cache-Control', 'no-store');
  } else if (!response.headers.has('Cache-Control')) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=3600'
    );
  }

  // Ensure CDN/proxies cache separate variants per cookie (auth state)
  if (!response.headers.has('Vary')) {
    response.headers.set('Vary', 'Cookie');
  }

  return response;
});
