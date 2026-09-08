<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor = current_actor();
$expires = time() + 300;
$payload = $actor['club_id'] . ':' . $actor['user_id'] . ':' . $expires;
$signature = hash_hmac('sha256', $payload, socket_secret());
echo json_encode(['success' => true, 'token' => $payload . '.' . $signature, 'expires_at' => $expires]);
