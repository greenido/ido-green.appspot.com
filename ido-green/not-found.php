<?php
/**
 * Front controller for URLs that matched no static handler in app.yaml.
 *
 * App Engine's error_handlers block does not fire for unmatched URLs, and a
 * catch-all static handler would return HTTP 200 for a missing page (a "soft
 * 404" that search engines index). This returns a real 404 with the custom page.
 */
http_response_code(404);
header('Content-Type: text/html; charset=utf-8');

// http_headers in app.yaml does not apply to script handlers, so set them here.
header('Strict-Transport-Security: max-age=31536000');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: frame-ancestors 'self'");

$page = __DIR__ . '/www/404.html';
if (is_readable($page)) {
    readfile($page);
} else {
    echo '<!doctype html><meta charset="utf-8"><title>Page Not Found</title><h1>404 &mdash; Page Not Found</h1>';
}
