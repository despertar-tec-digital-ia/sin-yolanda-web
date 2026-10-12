<?php
/**
 * Plugin Name: Sin Yolanda Root Directory
 * Description: Send multi-location TX and USA home domains to the central location selector.
 * Version: 1.0.0
 * Requires PHP: 7.4
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * This program is free software under the GNU General Public License version 2
 * or later. It is distributed without warranty of merchantability or fitness.
 */

namespace SinYolanda\RootDirectory;

if (!defined('ABSPATH')) {
    exit;
}
require_once __DIR__ . '/root-engine.php';

// Additive override: leave the original redirect and menu-pause plugins untouched.
\add_filter('wp_redirect', function ($location, $status) {
    if ($status !== 301 || \is_admin() || \is_user_logged_in() || \is_preview()
        || (defined('REST_REQUEST') && REST_REQUEST)
        || (function_exists('wp_doing_ajax') && \wp_doing_ajax())
        || headers_sent()) {
        return $location;
    }
    $file = __DIR__ . '/../sin-yolanda-legacy-redirects/redirects.json';
    if (!is_readable($file)) {
        return $location;
    }
    $config = json_decode(file_get_contents($file), true);
    if (!is_array($config)) {
        return $location;
    }
    return directoryTarget($_SERVER, $location, $config) ?? $location;
}, PHP_INT_MAX - 1, 2);
