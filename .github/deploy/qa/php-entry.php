<?php

// Stable web entry point. Both runtimes resolve the same atomic current link.
// Do not copy Laravel source, credentials, or vendor files into public_html.
header('X-Robots-Tag: noindex, nofollow');
$host = strtolower($_SERVER['HTTP_HOST'] ?? '');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
if ($host !== 'test.midiametal.com' || ! is_string($path)
    || ! preg_match('#^/(?:api|sanctum)(?:/|$)#D', $path)) {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__, 2).'/.midia-qa';
clearstatcache(true);
$release = realpath($root.'/current');
if (! is_string($release) || ! preg_match('#^'.preg_quote($root, '#').'/releases/(qa-[a-f0-9]{12}-[0-9]+-[0-9]+)$#D', $release, $match)
    || ! is_file($release.'/release.json')) {
    http_response_code(503);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo '{"status":"unavailable"}';
    exit;
}

$manifest = json_decode(file_get_contents($release.'/release.json'), true);
$commit = $manifest['commit'] ?? '';
if (($manifest['repository'] ?? null) !== 'Mahmut-Mese/midia-metal'
    || ($manifest['branch'] ?? null) !== 'qa'
    || ! is_string($commit) || ! preg_match('/^[a-f0-9]{40}$/D', $commit)
    || ! str_starts_with($match[1], 'qa-'.substr($commit, 0, 12).'-')) {
    http_response_code(503);
    exit;
}

header('X-Midia-Release: '.$match[1]);
header('X-Midia-Commit: '.$commit);
// Internal rewrites must not make Symfony mistake the dispatch directory for
// the application's base URL. REQUEST_URI keeps the original API request.
$_SERVER['SCRIPT_FILENAME'] = $release.'/backend/public/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';
require $release.'/backend/public/index.php';
