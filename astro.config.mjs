import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Canonical site URL — sets import.meta.env.SITE globally
  site: 'https://midiammetal.com',

  // Astro 5: 'static' = prerender all by default (absorbed 'hybrid')
  output: 'static',

  // Prefetch links on hover for SPA-like speed
  prefetch: {
    defaultStrategy: 'hover',
    prefetchAll: false,
  },

  // Image optimization: allow remote images from the backend
  image: {
    domains: ['127.0.0.1', 'localhost', 'midiammetal.com'],
    remotePatterns: [
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'https', hostname: 'midiammetal.com' },
    ],
  },

  integrations: [
    react(),
    tailwind({
      configFile: './tailwind.config.ts',
      applyBaseStyles: false, // We use our own base styles in index.css
    }),
    sitemap({
      filter: (page) =>
        // Exclude admin, auth, and utility pages from sitemap
        !page.includes('/admin/') &&
        !page.includes('/login') &&
        !page.includes('/register') &&
        !page.includes('/forgot-password') &&
        !page.includes('/reset-password') &&
        !page.includes('/account') &&
        !page.includes('/checkout') &&
        !page.includes('/payment') &&
        !page.includes('/thank-you'),
    }),
  ],

  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/sanctum': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/storage': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
      },
    },
  },

  srcDir: './src',
});
