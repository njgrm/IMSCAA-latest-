<?php
// Allow the local Vite app and forwarded development hosts to call the PHP API.
$origin = trim((string)($_SERVER['HTTP_ORIGIN'] ?? ''));
$originHost = strtolower((string)parse_url($origin, PHP_URL_HOST));
$serverHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
$serverHost = preg_replace('/:\\d+$/', '', $serverHost);

$isLocalOrigin = in_array($originHost, ['localhost', '127.0.0.1', '::1'], true);
$isDevTunnelOrigin = $originHost !== '' && (bool)preg_match('/(^|\\.)devtunnels\\.ms$/', $originHost);
$isSameHostOrigin = $originHost !== '' && $originHost === $serverHost;

if ($origin !== '' && ($isLocalOrigin || $isDevTunnelOrigin || $isSameHostOrigin)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
