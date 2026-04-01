/**
 * Astro middleware — applies default cache headers to SSR pages.
 *
 * Pages that set their own Cache-Control (like shop/[slug].astro) keep
 * their custom values. All other SSR pages get a sensible default:
 *   - CDN/proxy caches for 10 minutes
 *   - Serves stale content while revalidating for up to 1 hour
 *   - Browser does NOT cache (always hits CDN)
 *
 * Prerendered (SSG) pages are already static files — this middleware
 * only runs for SSR pages.
 */
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();

  // Only add default cache headers if the page didn't set its own
  if (!response.headers.has('Cache-Control')) {
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
