<?php
/**
 * Plugin Name: Sin Yolanda Legacy Redirects
 * Description: Exact public legacy routes to approved Sin Yolanda canonical pages.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */

namespace SinYolanda\LegacyRedirects;

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/redirect-engine.php';

// template_redirect runs only for WP front-end templates. Extra guards preserve
// logged-in editing, previews, admin, AJAX and REST independently of URL rules.
\add_action('template_redirect', function (): void {
    if (\is_admin() || \is_user_logged_in() || \is_preview()
        || (defined('REST_REQUEST') && REST_REQUEST)
        || (function_exists('wp_doing_ajax') && \wp_doing_ajax())
        || headers_sent()) {
        return;
    }
    $file = __DIR__ . '/redirects.json';
    if (!is_readable($file)) {
        return;
    }
    $config = json_decode(file_get_contents($file), true);
    if (!is_array($config)) {
        return;
    }
    $redirect = resolve($_SERVER, $config);
    if ($redirect === null) {
        return;
    }
    // The resolver fixes origin, path and query. No request-controlled target,
    // allowed_redirect_hosts filter or global WP redirect setting is installed.
    if (\wp_redirect($redirect['location'], $redirect['status'], 'Sin Yolanda Legacy Redirects')) {
        exit;
    }
}, 0);
