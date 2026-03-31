import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // Astro 6: 'static' = prerender all by default (hybrid behavior via per-page opt-out)
  // Use `export const prerender = false` on individual pages for SSR
  output: 'static',
  integrations: [
    react(),
    tailwind({
      configFile: './tailwind.config.ts',
      applyBaseStyles: false, // We use our own base styles in index.css
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
  // During migration, Astro pages live in src/pages-astro/
  // After migration, rename to src/pages/
  srcDir: './src',
});
