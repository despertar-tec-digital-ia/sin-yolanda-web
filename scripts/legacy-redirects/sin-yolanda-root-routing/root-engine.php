<?php
declare(strict_types=1);
namespace SinYolanda\RootRouting;

/** Fixed home routes only. No menu, form, account or arbitrary destination routing. */
function resolve(array $server): ?string
{
    $host = strtolower($server['HTTP_HOST'] ?? '');
    if (strncmp($host, 'www.', 4) === 0) $host = substr($host, 4);
    $targets = ['sinyolandatx.com' => '/locations', 'sinyolandausa.com' => '/locations',
        'maricarmengdl.com' => '/locations', 'sinyolandagdl.com' => '/guadalajara'];
    $uri = $server['REQUEST_URI'] ?? '';
    if (!isset($targets[$host]) || !in_array($server['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)
        || !is_string($uri) || strlen($uri) > 4096) return null;
    $parts = explode('?', $uri, 2);
    if ($parts[0] !== '/') return null;
    $query = \SinYolanda\RootAttribution\permittedQuery($parts[1] ?? '', [
        'utm_source' => ['instagram', 'facebook', 'google', 'google_maps', 'bing', 'whatsapp', 'qr', 'newsletter', 'opentable', 'tripadvisor'],
        'utm_medium' => ['organic', 'referral', 'social', 'paid_social', 'cpc', 'email', 'qr'],
        'utm_campaign' => [], 'utm_id' => [], 'utm_term' => [], 'utm_content' => []]);
    if ($query === null) return null;
    return 'https://sin-yolanda.com' . $targets[$host] . ($query !== '' ? '?' . $query : '');
}
