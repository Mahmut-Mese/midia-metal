<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class NormalizeStagingMedia extends Command
{
    protected $signature = 'staging:normalize-media
        {--dry-run : Show what would change without modifying the database}
        {--download : Download missing files from production before rewriting URLs}
        {--production-host=lightblue-albatross-164447.hostingersite.com : The production hostname to replace}';

    protected $description = 'Normalize media URLs in the staging database: download files from production if needed, then rewrite DB fields to relative paths';

    private string $productionHost;

    private int $rewritten = 0;

    private int $downloaded = 0;

    private array $missing = [];

    private array $errors = [];

    public function handle(): int
    {
        $this->productionHost = $this->option('production-host');
        $isDryRun = $this->option('dry-run');
        $shouldDownload = $this->option('download');

        $this->info('=== Staging Media Normalization ===');
        $this->info("Production host: {$this->productionHost}");
        $this->info('Dry run: '.($isDryRun ? 'YES' : 'NO'));
        $this->info('Download missing: '.($shouldDownload ? 'YES' : 'NO'));
        $this->newLine();

        // Process product_categories.image
        $this->processTable(
            table: 'product_categories',
            columns: ['image'],
            isDryRun: $isDryRun,
            shouldDownload: $shouldDownload,
        );

        // Process products.image (string) and products.gallery (JSON array)
        $this->processTable(
            table: 'products',
            columns: ['image', 'gallery'],
            isDryRun: $isDryRun,
            shouldDownload: $shouldDownload,
        );

        $this->newLine();
        $this->info('=== Summary ===');
        $this->info("DB fields rewritten: {$this->rewritten}");
        $this->info("Files downloaded: {$this->downloaded}");

        if (count($this->missing) > 0) {
            $this->warn('Missing files (not on production or download failed):');
            foreach ($this->missing as $m) {
                $this->warn("  - {$m}");
            }
        }

        if (count($this->errors) > 0) {
            $this->error('Errors:');
            foreach ($this->errors as $e) {
                $this->error("  - {$e}");
            }

            return self::FAILURE;
        }

        // Final audit: check for any remaining production URLs
        $this->newLine();
        $remaining = $this->auditRemainingProductionUrls();
        if ($remaining > 0) {
            $this->error("AUDIT FAILED: {$remaining} production URL(s) still in database!");

            return self::FAILURE;
        }

        $this->info('AUDIT PASSED: 0 production URLs remain in database.');

        return self::SUCCESS;
    }

    private function processTable(string $table, array $columns, bool $isDryRun, bool $shouldDownload): void
    {
        $this->info("--- Processing: {$table} ---");

        $rows = DB::table($table)->select(array_merge(['id'], $columns))->get();
        $this->info("  Found {$rows->count()} rows");

        foreach ($rows as $row) {
            $updates = [];

            foreach ($columns as $column) {
                $raw = $row->$column;
                if ($raw === null || $raw === '') {
                    continue;
                }

                // Determine if this is a JSON column (gallery) or a string column
                $isJson = $this->isJsonColumn($table, $column);

                if ($isJson) {
                    $items = json_decode($raw, true);
                    if (! is_array($items)) {
                        continue;
                    }

                    $changed = false;
                    foreach ($items as $i => $url) {
                        if (! is_string($url)) {
                            continue;
                        }
                        $normalized = $this->normalizeUrl($url, $shouldDownload, $isDryRun);
                        if ($normalized !== $url) {
                            $items[$i] = $normalized;
                            $changed = true;
                        }
                    }

                    if ($changed) {
                        $updates[$column] = json_encode(array_values($items));
                    }
                } else {
                    $normalized = $this->normalizeUrl($raw, $shouldDownload, $isDryRun);
                    if ($normalized !== $raw) {
                        $updates[$column] = $normalized;
                    }
                }
            }

            if (count($updates) > 0) {
                $updateDesc = collect($updates)->map(fn ($v, $k) => "{$k}: {$v}")->implode(', ');
                $this->line("  Row #{$row->id}: {$updateDesc}");

                if (! $isDryRun) {
                    DB::table($table)->where('id', $row->id)->update($updates);
                    $this->rewritten++;
                } else {
                    $this->rewritten++;
                    $this->line('    (dry-run — not saved)');
                }
            }
        }
    }

    /**
     * Normalize a single URL value.
     *
     * Converts full production URLs to relative paths like "uploads/filename.webp".
     * Also normalizes other path formats (storage/uploads/..., /storage/uploads/...).
     */
    private function normalizeUrl(string $url, bool $shouldDownload, bool $isDryRun): string
    {
        // Skip non-media paths
        if (str_starts_with($url, '/images/')) {
            return $url;
        }

        // Case 1: Full production URL → extract relative path and optionally download
        if (str_contains($url, $this->productionHost)) {
            $parts = parse_url($url);
            $path = $parts['path'] ?? '';

            // Extract relative path: /storage/uploads/foo.webp → uploads/foo.webp
            $relativePath = $this->extractRelativePath($path);

            if ($relativePath === null) {
                $this->warn("  Cannot parse path from URL: {$url}");

                return $url;
            }

            // Ensure file exists locally
            $this->ensureFileExists($url, $relativePath, $shouldDownload, $isDryRun);

            return $relativePath;
        }

        // Case 2: /storage/uploads/foo.webp → uploads/foo.webp
        if (preg_match('#^/?storage/(.+)$#', $url, $m)) {
            $relativePath = $m[1];
            $storagePath = "public/{$relativePath}";
            if (! Storage::exists($storagePath)) {
                $this->missing[] = "{$url} (local file not found at storage/app/{$storagePath})";
            }

            return $relativePath;
        }

        // Case 3: Already a clean relative path like "uploads/foo.webp"
        if (str_starts_with($url, 'uploads/')) {
            $storagePath = "public/{$url}";
            if (! Storage::exists($storagePath)) {
                $this->missing[] = "{$url} (local file not found at storage/app/{$storagePath})";
            }

            return $url;
        }

        // Case 4: Full URL to staging host — normalize to relative
        $stagingApiHost = parse_url(config('app.url'), PHP_URL_HOST);
        if ($stagingApiHost && str_contains($url, $stagingApiHost)) {
            $parts = parse_url($url);
            $path = $parts['path'] ?? '';
            $relativePath = $this->extractRelativePath($path);
            if ($relativePath) {
                return $relativePath;
            }
        }

        return $url;
    }

    /**
     * Extract a relative path from an absolute path.
     * /storage/uploads/foo.webp → uploads/foo.webp
     */
    private function extractRelativePath(string $path): ?string
    {
        if (preg_match('#^/?storage/(.+)$#', $path, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Ensure a media file exists in local staging storage.
     * If not found and --download is set, download from the production URL.
     */
    private function ensureFileExists(string $sourceUrl, string $relativePath, bool $shouldDownload, bool $isDryRun): void
    {
        $storagePath = "public/{$relativePath}";

        if (Storage::exists($storagePath)) {
            return;
        }

        if (! $shouldDownload) {
            $this->missing[] = "{$relativePath} (not in staging storage; use --download to fetch from production)";

            return;
        }

        if ($isDryRun) {
            $this->line("    Would download: {$sourceUrl} → storage/app/{$storagePath}");

            return;
        }

        $this->line("    Downloading: {$sourceUrl}");
        try {
            $response = Http::timeout(30)->get($sourceUrl);
            if ($response->successful()) {
                Storage::put($storagePath, $response->body());
                $this->downloaded++;
                $this->info("    Downloaded OK → storage/app/{$storagePath}");
            } else {
                $this->missing[] = "{$relativePath} (HTTP {$response->status()} from {$sourceUrl})";
            }
        } catch (\Exception $e) {
            $this->errors[] = "Download failed for {$sourceUrl}: {$e->getMessage()}";
        }
    }

    /**
     * Audit: scan all media columns for any remaining production URLs.
     */
    private function auditRemainingProductionUrls(): int
    {
        $count = 0;

        // Check products
        $products = DB::table('products')->select(['id', 'image', 'gallery'])->get();
        foreach ($products as $row) {
            if ($row->image && str_contains($row->image, $this->productionHost)) {
                $this->error("  products.image #{$row->id}: {$row->image}");
                $count++;
            }
            if ($row->gallery && str_contains($row->gallery, $this->productionHost)) {
                $this->error("  products.gallery #{$row->id}: contains production URL");
                $count++;
            }
        }

        // Check product_categories
        $categories = DB::table('product_categories')->select(['id', 'image'])->get();
        foreach ($categories as $row) {
            if ($row->image && str_contains($row->image, $this->productionHost)) {
                $this->error("  product_categories.image #{$row->id}: {$row->image}");
                $count++;
            }
        }

        return $count;
    }

    private function isJsonColumn(string $table, string $column): bool
    {
        return $table === 'products' && $column === 'gallery';
    }
}
