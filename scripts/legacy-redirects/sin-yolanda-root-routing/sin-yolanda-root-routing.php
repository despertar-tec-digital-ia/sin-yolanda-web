<?php
/**
 * Plugin Name: Sin Yolanda Root Routing
 * Description: Route the four legacy home domains without migrating their menus.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 */
namespace SinYolanda\RootRouting;
if (!defined('ABSPATH')) exit;
// Bundled pure attribution validator; loading it does not activate the legacy plugin.
require_once __DIR__ . '/attribution.php';
require_once __DIR__ . '/root-engine.php';
\add_action('template_redirect', function () {
    if (\is_admin() || \is_user_logged_in() || \is_preview() || headers_sent()
        || (defined('REST_REQUEST') && REST_REQUEST)
        || (function_exists('wp_doing_ajax') && \wp_doing_ajax())) return;
    $target = resolve($_SERVER);
    if ($target === null) return;
    \nocache_headers();
    // Do not let a new client retain obsolete root destinations indefinitely.
    header('Cache-Control: no-store, max-age=0, must-revalidate');
    \wp_redirect($target, 301, 'Sin Yolanda Root Routing');
    exit;
}, -1);
