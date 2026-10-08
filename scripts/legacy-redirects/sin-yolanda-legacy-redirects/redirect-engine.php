<?php
declare(strict_types=1);

namespace SinYolanda\LegacyRedirects;

/** Pure request resolver: no WordPress, remote calls, storage or query logging. */
function resolve(array $server, array $config): ?array
{
    if (($config['version'] ?? null) !== 1 || ($config['status'] ?? null) !== 301
        || ($config['targetOrigin'] ?? null) !== 'https://sin-yolanda.com') {
        return null;
    }

    $method = $server['REQUEST_METHOD'] ?? '';
    $host = $server['HTTP_HOST'] ?? '';
    $uri = $server['REQUEST_URI'] ?? '';
    if (!is_string($method) || !in_array($method, ['GET', 'HEAD'], true)
        || !is_string($host) || !is_string($uri) || strlen($uri) > 4096) {
        return null;
    }

    // HTTP_HOST alone selects a fixed legacy site. Ignore forwarded host headers.
    $host = strtolower($host);
    $knownHosts = ['sinyolandagdl.com', 'sinyolandatx.com', 'sinyolandausa.com'];
    $baseHost = strncmp($host, 'www.', 4) === 0 ? substr($host, 4) : $host;
    if (!in_array($baseHost, $knownHosts, true) || !is_array($config['sites'] ?? null)
        || !is_array($config['utmValues'] ?? null) || !isset($config['sites'][$baseHost])
        || !is_array($config['sites'][$baseHost])) {
        return null;
    }

    // No URL decoding or broad normalization: encoded/ambiguous paths stay in WP.
    $parts = explode('?', $uri, 2);
    $path = $parts[0];
    if ($path === '' || $path[0] !== '/' || strpos($path, '//') !== false
        || preg_match('/[^a-z0-9\/-]/', $path)) {
        return null;
    }
    $source = $path === '/' ? '/' : rtrim($path, '/') . '/';
    if (!array_key_exists($source, $config['sites'][$baseHost])) {
        return null;
    }
    $destination = $config['sites'][$baseHost][$source];
    if (!is_string($destination)) {
        return null;
    }
    $destinationParts = explode('#', $destination, 2);
    $destinationPath = $destinationParts[0];
    $fragment = $destinationParts[1] ?? null;
    if (!preg_match('~^/[a-z0-9/-]*$~', $destinationPath)
        || strpos($destinationPath, '//') !== false
        || ($fragment !== null && $fragment !== 'cocktails')) {
        return null;
    }

    $query = permittedQuery($parts[1] ?? '', $config['utmValues'] ?? []);
    // Preserve dynamic WordPress/form requests rather than intercepting them.
    if ($query === null) {
        return null;
    }
    $location = 'https://sin-yolanda.com' . $destinationPath;
    if ($query !== '') {
        $location .= '?' . $query;
    }
    if ($fragment !== null) {
        $location .= '#' . $fragment;
    }
    return ['status' => 301, 'location' => $location];
}

/** Exact registered attribution tokens only. Unknown UTM values are never forwarded. */
function permittedQuery(string $query, array $allowedValues): ?string
{
    if ($query === '') {
        return '';
    }
    if (strlen($query) > 2048 || preg_match('/[\x00-\x20\x7f#;]/', $query)) {
        return null;
    }
    $keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_term', 'utm_content'];
    $discardedTracking = ['gclid', 'fbclid', 'msclkid', 'dclid', 'gbraid', 'wbraid', 'gad_source', 'gad_campaignid'];
    $values = [];
    $duplicates = [];
    foreach (explode('&', $query) as $field) {
        if ($field === '') {
            continue;
        }
        $pair = explode('=', $field, 2);
        $key = $pair[0];
        if (in_array($key, $discardedTracking, true)) {
            continue;
        }
        if (!in_array($key, $keys, true)) {
            // An unknown UTM is dropped; every other key may belong to a form,
            // preview, search, REST endpoint or legacy WP action and stays there.
            if (strncmp($key, 'utm_', 4) === 0 && preg_match('/^utm_[a-z_]+$/', $key)) {
                continue;
            }
            return null;
        }
        if (array_key_exists($key, $values)) {
            $duplicates[$key] = true;
        }
        $value = rawurldecode($pair[1] ?? '');
        // Token grammar forbids names with spaces, contacts, URLs and controls.
        // Registry membership, not the grammar alone, is the privacy boundary.
        $registered = $allowedValues[$key] ?? [];
        $safe = strlen($value) <= 80 && preg_match('/^[a-z][a-z0-9_-]*$/', $value)
            && !preg_match('/[0-9]{7,}/', $value) && is_array($registered)
            && in_array($value, $registered, true);
        $values[$key] = $safe ? $value : null;
    }
    $result = [];
    foreach ($keys as $key) {
        if (isset($values[$key]) && !isset($duplicates[$key])) {
            $result[$key] = $values[$key];
        }
    }
    return http_build_query($result, '', '&', PHP_QUERY_RFC3986);
}
