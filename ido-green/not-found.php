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

$page = __DIR__ . '/www/404.html';
if (is_readable($page)) {
    readfile($page);
} else {
    echo '<!doctype html><meta charset="utf-8"><title>Page Not Found</title><h1>404 &mdash; Page Not Found</h1>';
}
