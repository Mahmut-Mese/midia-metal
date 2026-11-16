<?php

namespace Midia\QaDeploy;

use Dotenv\Dotenv;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

/** Account identifiers stay in the private target manifest, never in this script. */
function validateTarget(array $target): array
{
    if (($target['repository'] ?? null) !== 'Mahmut-Mese/midia-metal'
        || ($target['branch'] ?? null) !== 'qa'
        || ($target['url'] ?? null) !== 'https://test.midiametal.com') {
        throw new RuntimeException('The deployment target is not the approved QA site.');
    }

    $user = $target['ssh']['user'] ?? '';
    $host = $target['ssh']['host'] ?? '';
    $port = $target['ssh']['port'] ?? 0;
    if (! is_string($user) || ! preg_match('/^u[0-9]+$/D', $user)
        || ! is_string($host) || ! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
        || ! is_int($port) || $port < 1 || $port > 65535) {
        throw new RuntimeException('Invalid private QA SSH target.');
    }

    // Pin the approved account without committing its private connection identifiers.
    $accountDigest = hash('sha256', $host.':'.$port.':'.$user);
    if (! hash_equals('70c113afa3375d64751f2b41fc40fca6360c9688e29a8d64db9297ab818bb082', $accountDigest)) {
        throw new RuntimeException('The manifest does not identify the approved QA account.');
    }

    $domainRoot = '/home/'.$user.'/domains/test.midiametal.com';
    if (($target['root'] ?? null) !== $domainRoot.'/.midia-qa'
        || ($target['web_root'] ?? null) !== $domainRoot.'/public_html') {
        throw new RuntimeException('QA paths do not belong to the configured account and domain.');
    }

    $database = $target['database'] ?? [];
    if (($database['connection'] ?? null) !== 'mysql'
        || ! in_array($database['host'] ?? null, ['localhost', '127.0.0.1'], true)
        || ($database['port'] ?? null) !== 3306) {
        throw new RuntimeException('QA requires the dedicated local MySQL connection.');
    }
    foreach (['name', 'user'] as $field) {
        $value = $database[$field] ?? '';
        if (! is_string($value) || ! preg_match('/^'.preg_quote($user, '/').'_[a-zA-Z0-9_]+$/D', $value)
            || ! str_contains(strtolower(substr($value, strlen($user) + 1)), 'qa')) {
            throw new RuntimeException('QA database identifiers must belong to the configured account and identify QA.');
        }
    }

    return $target;
}

function loadTarget(string $file): array
{
    if ($file === '' || ! is_file($file) || ! is_readable($file)) {
        throw new RuntimeException('The private QA target manifest is missing or unreadable.');
    }
    try {
        $target = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    } catch (Throwable) {
        throw new RuntimeException('The private QA target manifest is invalid.');
    }
    if (! is_array($target)) {
        throw new RuntimeException('The private QA target manifest must be an object.');
    }

    return validateTarget($target);
}

function validateReleasePath(string $path, array $target, string|false $resolvedPath): void
{
    $pattern = '#^'.preg_quote($target['root'], '#').'/releases/qa-[a-zA-Z0-9][a-zA-Z0-9._-]*/backend$#D';
    if (! preg_match($pattern, $path) || $resolvedPath !== $path) {
        throw new RuntimeException('The backend must be the exact directory of a QA release.');
    }
}

function isExplicitlyDisabled(mixed $value): bool
{
    return in_array($value, [false, 0, '0', 'false', '(false)'], true);
}

/** Pure validation, shared by deployment and bootstrap, with no DB side effects. */
function validateEnvironment(array $env, array $effective, array $target): void
{
    $database = $target['database'];
    $expectedEnv = [
        'APP_ENV' => 'qa',
        'APP_URL' => $target['url'],
        'FRONTEND_URL' => $target['url'],
        'DB_CONNECTION' => 'mysql',
        'DB_HOST' => $database['host'],
        'DB_PORT' => (string) $database['port'],
        'DB_DATABASE' => $database['name'],
        'DB_USERNAME' => $database['user'],
    ];
    foreach ($expectedEnv as $key => $expected) {
        if (! array_key_exists($key, $env) || (string) $env[$key] !== $expected) {
            throw new RuntimeException('QA environment identity mismatch: '.$key.'.');
        }
    }
    foreach (['APP_DEBUG', 'FRONTEND_DEPLOY_TRIGGER_ENABLED'] as $key) {
        if (! array_key_exists($key, $env) || ! isExplicitlyDisabled($env[$key])) {
            throw new RuntimeException('QA requires an explicitly disabled '.$key.'.');
        }
    }
    foreach ($env as $key => $value) {
        if ((in_array($key, ['DB_URL', 'DATABASE_URL', 'DB_SOCKET'], true)
            || str_starts_with($key, 'DB_READ_') || str_starts_with($key, 'DB_WRITE_'))
            && $value !== null && $value !== '') {
            throw new RuntimeException('Database connection overrides are forbidden in QA.');
        }
    }

    $expectedConfig = [
        'app.env' => 'qa',
        'app.url' => $target['url'],
        'app.frontend_url' => $target['url'],
        'database.default' => 'mysql',
        'database.connections.mysql.driver' => 'mysql',
        'database.connections.mysql.host' => $database['host'],
        'database.connections.mysql.port' => (string) $database['port'],
        'database.connections.mysql.database' => $database['name'],
        'database.connections.mysql.username' => $database['user'],
    ];
    foreach ($expectedConfig as $key => $expected) {
        if (! array_key_exists($key, $effective) || (string) $effective[$key] !== $expected) {
            throw new RuntimeException('Effective QA configuration mismatch: '.$key.'.');
        }
    }
    foreach (['app.debug', 'services.frontend_deploy.enabled'] as $key) {
        if (! array_key_exists($key, $effective) || ! isExplicitlyDisabled($effective[$key])) {
            throw new RuntimeException('Unsafe effective QA configuration: '.$key.'.');
        }
    }
    foreach (['url', 'read', 'write', 'unix_socket'] as $field) {
        $value = $effective['database.connections.mysql.'.$field] ?? null;
        if ($value !== null && $value !== '' && $value !== []) {
            throw new RuntimeException('Effective database overrides are forbidden in QA.');
        }
    }
    $password = $env['DB_PASSWORD'] ?? null;
    $effectivePassword = $effective['database.connections.mysql.password'] ?? null;
    if (! is_string($password) || $password === '' || ! is_string($effectivePassword)
        || ! hash_equals($password, $effectivePassword)) {
        throw new RuntimeException('QA database authentication configuration is missing or inconsistent.');
    }
}

function effectiveConfiguration(): array
{
    $keys = [
        'app.env', 'app.debug', 'app.url', 'app.frontend_url', 'database.default',
        'services.frontend_deploy.enabled',
    ];
    foreach (['driver', 'host', 'port', 'database', 'username', 'password', 'url', 'read', 'write', 'unix_socket'] as $field) {
        $keys[] = 'database.connections.mysql.'.$field;
    }

    return array_combine($keys, array_map(fn ($key) => config($key), $keys));
}

/** The Laravel application must already be bootstrapped before calling this. */
function verifyBootstrappedBackend(string $path, string $targetFile): array
{
    $target = loadTarget($targetFile);
    validateReleasePath($path, $target, realpath($path));
    if (! is_file($path.'/.env') || ! is_readable($path.'/.env')) {
        throw new RuntimeException('The QA backend environment file is missing.');
    }
    $env = Dotenv::parse(file_get_contents($path.'/.env'));
    validateEnvironment($env, effectiveConfiguration(), $target);

    // Check the actual authenticated connection before any migration or seed.
    $connection = DB::connection('mysql');
    if ($connection->getDriverName() !== 'mysql') {
        throw new RuntimeException('The actual QA database driver is not MySQL.');
    }
    $identity = $connection->selectOne("SELECT DATABASE() AS qa_database, SUBSTRING_INDEX(CURRENT_USER(), '@', 1) AS qa_user");
    if ($identity?->qa_database !== $target['database']['name'] || $identity?->qa_user !== $target['database']['user']) {
        throw new RuntimeException('The authenticated database does not match the dedicated QA target.');
    }

    return $target;
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
        fwrite(STDOUT, "Verified the QA backend and its dedicated database.\n");
    } catch (Throwable) {
        // Never allow framework/driver exceptions to reveal connection credentials.
        fwrite(STDERR, "QA backend verification failed; no migration or bootstrap is authorized.\n");
        exit(1);
    }
}
