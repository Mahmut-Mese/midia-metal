<?php

namespace Midia\QaDeploy;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

require_once __DIR__.'/verify-backend.php';

/** Inspect files without executing migration code. */
function migrationInventory(string $directory, array $applied): array
{
    $resolvedDirectory = realpath($directory);
    if ($resolvedDirectory === false || ! is_dir($directory) || $resolvedDirectory !== $directory) {
        throw new RuntimeException('The QA migration directory must be an exact release directory.');
    }
    $files = glob($directory.'/*.php');
    if ($files === false || $files === []) {
        throw new RuntimeException('The QA release contains no migration files.');
    }
    sort($files, SORT_STRING);
    $pending = [];
    foreach ($files as $file) {
        if (! is_file($file) || is_link($file) || realpath($file) !== $file) {
            throw new RuntimeException('QA migrations must be regular files inside the release.');
        }
        $name = pathinfo($file, PATHINFO_FILENAME);
        if (! preg_match('/^[a-zA-Z0-9_]+$/D', $name)) {
            throw new RuntimeException('An invalid QA migration name was found.');
        }
        if (in_array($name, $applied, true)) {
            continue;
        }
        $hash = hash_file('sha256', $file);
        if ($hash === false) {
            throw new RuntimeException('A QA migration could not be read.');
        }
        $pending[] = ['name' => $name, 'file' => 'database/migrations/'.basename($file), 'sha256' => $hash];
    }

    return $pending;
}

/** Read-only state collection; the CLI verifies the target before invoking it. */
function databaseState(Connection $connection, string $migrationDirectory): array
{
    $schema = $connection->getSchemaBuilder();
    // An omitted schema would enumerate every accessible MySQL database.
    $currentSchemas = $schema->getCurrentSchemaListing();
    if (! is_array($currentSchemas) || count($currentSchemas) !== 1 || ! is_string($currentSchemas[0]) || $currentSchemas[0] === '') {
        throw new RuntimeException('The current QA schema could not be determined.');
    }
    $tableCount = count($schema->getTables($currentSchemas));
    $hasMigrations = $schema->hasTable('migrations');
    $applied = $hasMigrations
        ? $connection->table('migrations')->orderBy('id')->pluck('migration')->all()
        : [];
    foreach ($applied as $name) {
        if (! is_string($name) || ! preg_match('/^[a-zA-Z0-9_]+$/D', $name)) {
            throw new RuntimeException('The applied QA migration history is invalid.');
        }
    }
    $marker = $schema->hasTable('site_settings')
        ? $connection->table('site_settings')->where('key', 'qa_bootstrap_version')->value('value')
        : null;
    if ($marker !== null && (string) $marker !== '1') {
        throw new RuntimeException('The QA bootstrap marker is unrecognized.');
    }

    return [
        'schema_version' => 1,
        'table_count' => $tableCount,
        'empty_database' => $tableCount === 0,
        'migrations_table_exists' => $hasMigrations,
        'applied_migrations' => $applied,
        'pending_migrations' => migrationInventory($migrationDirectory, $applied),
        'bootstrap_version' => $marker === null ? null : '1',
        'bootstrap_completed' => $marker !== null,
    ];
}

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    try {
        $path = $argv[1] ?? '';
        $targetFile = $argv[2] ?? __DIR__.'/target.json';
        $target = loadTarget($targetFile);
        validateReleasePath($path, $target, realpath($path));
        require $path.'/vendor/autoload.php';
        $app = require $path.'/bootstrap/app.php';
        $app->make(Kernel::class)->bootstrap();
        verifyBootstrappedBackend($path, $targetFile);
        $state = databaseState(DB::connection('mysql'), $path.'/database/migrations');
        fwrite(STDOUT, json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES)."\n");
    } catch (Throwable) {
        fwrite(STDERR, "QA database inspection failed; no database action is authorized.\n");
        exit(1);
    }
}
