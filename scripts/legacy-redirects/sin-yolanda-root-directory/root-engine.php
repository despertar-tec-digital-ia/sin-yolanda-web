<?php
declare(strict_types=1);

namespace SinYolanda\RootDirectory;

/** Retarget only a root redirect already validated by the installed legacy resolver. */
function directoryTarget(array $server, $location, array $config): ?string
{
    if (!is_string($location) || !function_exists('SinYolanda\\LegacyRedirects\\resolve')) {
        return null;
    }
    $host = strtolower($server['HTTP_HOST'] ?? '');
    $host = strncmp($host, 'www.', 4) === 0 ? substr($host, 4) : $host;
    if (!in_array($host, ['sinyolandatx.com', 'sinyolandausa.com'], true)
        || explode('?', $server['REQUEST_URI'] ?? '', 2)[0] !== '/') {
        return null;
    }
    $resolved = \SinYolanda\LegacyRedirects\resolve($server, $config);
    if ($resolved === null || $resolved['location'] !== $location) {
        return null;
    }
    $parts = parse_url($location);
    if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https'
        || ($parts['host'] ?? '') !== 'sin-yolanda.com'
        || !in_array($parts['path'] ?? '', ['/san-antonio', '/the-woodlands', '/locations'], true)
        || isset($parts['fragment'])) {
        return null;
    }
    return 'https://sin-yolanda.com/locations'
        . (isset($parts['query']) ? '?' . $parts['query'] : '');
}
