/**
 * settings.ts — Shared settings fetcher for Astro frontmatter.
 *
 * Fetches /api/v1/settings and returns a key-value map.
 * Safe for use in Astro frontmatter (no browser APIs).
 *
 * Usage in frontmatter:
 *   import { fetchSettings } from '@/lib/settings';
 *   const settings = await fetchSettings();
 *   const title = settings['about_title'] || 'Fallback';
 */

const API_BASE = 'http://127.0.0.1:8000/api';

/**
 * Fetch settings from the API and return as a key-value map.
 * Returns an empty object on error (never throws).
 */
export async function fetchSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE}/v1/settings`);
    if (!res.ok) return {};
    const data = await res.json();
    const items = Array.isArray(data) ? data : data?.data || [];
    const map: Record<string, string> = {};
    for (const item of items) {
      if (item.key && item.value !== undefined) {
        map[item.key] = String(item.value);
      }
    }
    return map;
  } catch {
    console.error('Failed to fetch settings from API');
    return {};
  }
}

/**
 * Get a page's SEO title from settings.
 * Checks for a page-specific key first, then falls back to the provided default.
 *
 * @param settings - Settings map from fetchSettings()
 * @param pageKey - Setting key for this page's title (e.g. 'about_title', 'faq_page_title')
 * @param fallback - Hardcoded fallback if the setting doesn't exist
 */
export function getPageTitle(
  settings: Record<string, string>,
  pageKey: string,
  fallback: string
): string {
  return settings[pageKey] || fallback;
}

/**
 * Get a page's SEO description from settings.
 * Checks for a page-specific key first, then the global meta_description, then fallback.
 *
 * @param settings - Settings map from fetchSettings()
 * @param pageKey - Setting key for this page's description (e.g. 'about_meta_description')
 * @param fallback - Hardcoded fallback if no setting exists
 */
export function getPageDescription(
  settings: Record<string, string>,
  pageKey: string | undefined,
  fallback: string
): string {
  if (pageKey && settings[pageKey]) return settings[pageKey];
  return fallback;
}
