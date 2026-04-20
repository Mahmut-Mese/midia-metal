import fs from 'node:fs';
import path from 'node:path';

const apiBase = process.env.API_BASE;
if (!apiBase) {
  console.error('::error::API_BASE is required for prerender validation');
  process.exit(1);
}

const checks = [
  {
    name: 'services',
    api: `${apiBase}/v1/services`,
    html: path.join('dist', 'client', 'services', 'index.html'),
    emptyText: 'No services available.',
  },
  {
    name: 'blog',
    api: `${apiBase}/v1/blog`,
    html: path.join('dist', 'client', 'blog', 'index.html'),
    emptyText: 'No blog posts found.',
  },
  {
    name: 'portfolio',
    api: `${apiBase}/v1/portfolio`,
    html: path.join('dist', 'client', 'portfolio', 'index.html'),
    emptyText: 'No projects found.',
  },
];

const retries = Math.max(Number(process.env.PRERENDER_API_RETRIES || 4), 1);
const timeoutMs = Math.max(Number(process.env.PRERENDER_API_TIMEOUT_MS || 10000), 1000);
const retryDelayMs = Math.max(Number(process.env.PRERENDER_API_RETRY_DELAY_MS || 1500), 200);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const countItems = (data) => {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.data)) return data.data.length;

  return 0;
};

async function fetchJsonWithRetry(check) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(check.api, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      clearTimeout(timeoutId);

      return payload;
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = error?.cause?.message || error?.message || String(error);
      lastError = `${error.name || 'Error'}: ${errorMessage}`;

      if (attempt < retries) {
        console.warn(`::warning::${check.name} API attempt ${attempt}/${retries} failed (${lastError}); retrying...`);
        await sleep(retryDelayMs * attempt);
      }
    }
  }

  throw new Error(`${check.name} API failed after ${retries} attempts (${lastError})`);
}

async function run() {
  for (const check of checks) {
    if (!fs.existsSync(check.html)) {
      throw new Error(`Missing prerendered file: ${check.html}`);
    }

    const html = fs.readFileSync(check.html, 'utf8');
    const payload = await fetchJsonWithRetry(check);
    const itemCount = countItems(payload);
    const containsEmptyState = html.includes(check.emptyText);

    if (itemCount > 0 && containsEmptyState) {
      throw new Error(`${check.name} prerendered page contains its empty state while the API returned ${itemCount} items`);
    }

    console.log(`${check.name}: apiItems=${itemCount}, emptyState=${containsEmptyState}`);
  }
}

run().catch((error) => {
  const message = error?.message || String(error);
  console.error(`::error::${message}`);
  process.exit(1);
});
