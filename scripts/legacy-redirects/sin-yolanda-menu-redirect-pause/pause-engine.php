<?php
declare(strict_types=1);

namespace SinYolanda\MenuRedirectPause;

/** Exact emergency menu scope. No WordPress, writes, telemetry or URL decoding. */
function shouldPause(array $server, $location, array $legacyConfig): bool
{
    if (!is_string($location) || !function_exists('SinYolanda\\LegacyRedirects\\resolve')) {
        return false;
    }
    $method = $server['REQUEST_METHOD'] ?? null;
    $host = $server['HTTP_HOST'] ?? null;
    $uri = $server['REQUEST_URI'] ?? null;
    if (!is_string($method) || !in_array($method, ['GET', 'HEAD'], true)
        || !is_string($host) || !is_string($uri) || strlen($uri) > 4096) {
        return false;
    }
    $host = strtolower($host);
    if (strncmp($host, 'www.', 4) === 0) {
        $host = substr($host, 4);
    }
    $menus = [
        'sinyolandatx.com' => [
            '/menu/' => '/san-antonio/menu/',
            '/english/' => '/en/san-antonio/menu/',
            '/cocktails/' => '/san-antonio/menu/#cocktails',
        ],
        'sinyolandausa.com' => [
            '/houston/menu/' => '/houston/menu/',
            '/sinyolanda-sanantonio/menu-espanol/' => '/san-antonio/menu/',
            '/sinyolanda-sanantonio/english-menu/' => '/en/san-antonio/menu/',
            '/sinyolanda-thewoodlands/menu-espanol/' => '/the-woodlands/menu/',
            '/sinyolanda-thewoodlands/english-menu/' => '/the-woodlands/menu/',
        ],
    ];
    // One optional trailing slash only; ambiguous/encoded paths remain untouched.
    $path = explode('?', $uri, 2)[0];
    if ($path === '' || $path[0] !== '/' || strpos($path, '//') !== false
        || preg_match('/[^a-z0-9\/-]/', $path)) {
        return false;
    }
    $source = substr($path, -1) === '/' ? $path : $path . '/';
    $target = $menus[$host][$source] ?? null;
    if ($target === null || ($legacyConfig['sites'][$host][$source] ?? null) !== $target) {
        return false;
    }
    // Reuse the installed resolver's exact UTM/privacy/form policy. This extension
    // never changes it or cancels an unrelated WordPress canonical redirect.
    $resolved = \SinYolanda\LegacyRedirects\resolve($server, $legacyConfig);
    return is_array($resolved) && ($resolved['status'] ?? null) === 301
        && ($resolved['location'] ?? null) === $location;
}
