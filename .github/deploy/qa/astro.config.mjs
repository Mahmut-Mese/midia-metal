import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import baseConfig from '../../../astro.config.mjs';

const qaOrigin = 'https://test.midiametal.com';

export default defineConfig({
  ...baseConfig,
  site: qaOrigin,
  output: 'server',
  image: {
    domains: ['test.midiametal.com'],
    remotePatterns: [{ protocol: 'https', hostname: 'test.midiametal.com' }],
  },
  integrations: [
    ...baseConfig.integrations.map(integration => integration.name === '@astrojs/sitemap'
      ? sitemap({
          customSitemaps: [`${qaOrigin}/sitemap-content.xml`],
          filter: page => !/\/(?:admin|login|register|forgot-password|reset-password|account|cart|checkout|payment|thank-you)(?:\/|$)/.test(new URL(page).pathname)
            && !page.includes('/sitemap-content.xml'),
        })
      : integration),
    {
      name: 'qa-public-pages-render-at-request-time',
      hooks: {
        'astro:route:setup': ({ route }) => {
          // Public layouts read settings, even on otherwise static pages. Only the
          // independent admin shell is prerendered; builds need no deployed API.
          if (route.component.startsWith('src/pages/') && !route.component.startsWith('src/pages/admin/')) {
            route.prerender = false;
          }
        },
      },
    },
  ],
  vite: {
    ...baseConfig.vite,
    define: {
      ...baseConfig.vite?.define,
      'import.meta.env.PUBLIC_API_URL': JSON.stringify('/api'),
    },
    resolve: {
      ...baseConfig.vite.resolve,
      alias: {
        '@/lib/api-base': fileURLToPath(new URL('./api-base.ts', import.meta.url)),
        ...baseConfig.vite.resolve.alias,
      },
    },
    // The public webserver owns PHP dispatch; do not inherit the development proxy.
    server: { ...baseConfig.vite.server, proxy: {} },
  },
});
