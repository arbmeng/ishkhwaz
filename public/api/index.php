<?php
// ============================================================
//  Ish-khwaz Secure PHP MySQL REST API — Hostinger Edition
//  Security: JWT-style tokens, bcrypt passwords, rate limiting,
//  role-based admin guard, input validation, no data leaks,
//  origin-restricted CORS, no error/stack-trace leakage.
// ============================================================

// Never let a PHP warning/notice/fatal leak a stack trace or file path to a client —
// but do write it to a local log file so real bugs stay debuggable without ever
// needing to flip display_errors on in production again.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/error.log');
set_exception_handler(function ($e) {
    error_log($e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Internal server error.']);
    exit(0);
});
set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// ----- CORS: allowlist, not wildcard — an API using bearer tokens should still
// only answer browser XHR/fetch calls from origins we actually operate. -----
$allowedOriginPattern = '#^https://([a-z0-9-]+\.)*zeraworld\.com$#i';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isDevOrigin = preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin);
if ($origin && (preg_match($allowedOriginPattern, $origin) || $isDevOrigin)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), camera=(), microphone=()');
header('Cross-Origin-Resource-Policy: cross-origin');
if (($_SERVER['HTTPS'] ?? '') !== '') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// ---- Configuration ----
// All real secrets (TOKEN_SECRET, payment/OpenAI/Pusher/console/OAuth keys,
// DB credentials, VAPID private key) live in config.php, which is NOT
// committed to git — deploy.py still copies it to the server on every
// deploy exactly like this file, so production behavior is unchanged.
require_once __DIR__ . '/config.php';

// A profile save can legitimately stack up to 4 compressed base64 images at
// once (avatar + cover + company_logo + company_cover, each capped at 800,000
// chars by sanitize()) — 900,000 was sized for just one image and was
// silently rejecting exactly that combination with "Request too large."
define('MAX_INPUT_LENGTH', 4000000); // Max request body size in bytes
define('RATE_LIMIT_WINDOW', 60);    // Rate limit window in seconds
define('RATE_LIMIT_MAX',    30);    // Max requests per window per IP

// ---- Zera Payment (plan purchases) ----
// Ish-khwaz's merchant credentials on zerapayment.studentkrd.com (API key +
// webhook secret in config.php). The webhook secret verifies that a
// /webhooks/zera-payment call actually came from Zera Payment (see
// verifyZeraWebhookSignature() below).
define('ZERA_PAYMENT_BASE_URL', 'https://pay.zeraworld.com/api/v1');

// ---- OpenAI (AI CV-writing assist + job description generator) ----
// Key lives in config.php. Calls are gated behind requireAuth() +
// rateLimitCheck() on every endpoint that uses this, since it's a real
// billed key.
// The full model, not the mini variant — Sorani Kurdish is a lower-resource
// language and gpt-4o-mini's output for it was noticeably worse (unnatural
// phrasing, awkward calques from English) than the full model's.
define('OPENAI_MODEL', 'gpt-4o');

// ---- Karnama CV builder integration ----
// Same shared secret as the OAuth client (config.php), reused here for a
// server-to-server call in the OTHER direction: Ish-khwaz calling INTO
// Karnama to auto-provision a linked account and save a resume, instead of
// Karnama calling into Ish-khwaz to verify a login.
define('KARNAMA_API_BASE', 'https://karnama.zeraworld.com/karnama-api');

// ---- Supabase (Google / Facebook / Apple sign-in) ----
// Supabase only handles the OAuth handshake with each provider — accounts
// still live entirely in our own `users` table. We verify the JWT Supabase
// issues (ES256, verified against SUPABASE_JWKS_URL below) and either link
// it to an existing account by verified email or create a new one, then
// issue our own normal session token — nothing else in the app changes.
define('SUPABASE_URL', 'https://flwoxovadwonqziwnnpa.supabase.co');
define('SUPABASE_JWKS_URL', 'https://flwoxovadwonqziwnnpa.supabase.co/auth/v1/.well-known/jwks.json');

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database unavailable.']);
    exit(0);
}

// ---- Rate Limiter (MySQL-backed) ----
// Stricter caps on the endpoints attackers actually target (credential stuffing,
// account enumeration via registration) — everything else keeps the generic cap.
function rateLimitMaxFor(string $endpoint): int {
    return match ($endpoint) {
        'login'  => 10,
        'register' => 8,
        'ai_write' => 8, // billed OpenAI calls — deliberately tighter than the default
        default  => RATE_LIMIT_MAX,
    };
}

// Standard draft-ietf-httpapi-ratelimit-headers fields, sent on every call
// (allowed or not) so clients — and security scanners — can see the limit
// is real without having to actually trip it first.
function sendRateLimitHeaders(int $max, int $remaining, int $resetInSeconds): void {
    header('RateLimit-Limit: ' . $max);
    header('RateLimit-Remaining: ' . max(0, $remaining));
    header('RateLimit-Reset: ' . max(0, $resetInSeconds));
}

function rateLimitCheck(PDO $pdo, string $ip, string $endpoint): bool {
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS rate_limits (
                ip VARCHAR(45) NOT NULL,
                endpoint VARCHAR(64) NOT NULL,
                hits INT DEFAULT 1,
                window_start INT NOT NULL,
                PRIMARY KEY (ip, endpoint)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        $now = time();
        $windowStart = $now - RATE_LIMIT_WINDOW;
        $max = rateLimitMaxFor($endpoint);

        $row = $pdo->prepare('SELECT hits, window_start FROM rate_limits WHERE ip = ? AND endpoint = ?');
        $row->execute([$ip, $endpoint]);
        $record = $row->fetch();

        if (!$record || $record['window_start'] < $windowStart) {
            $pdo->prepare('REPLACE INTO rate_limits (ip, endpoint, hits, window_start) VALUES (?, ?, 1, ?)')
                ->execute([$ip, $endpoint, $now]);
            sendRateLimitHeaders($max, $max - 1, RATE_LIMIT_WINDOW);
            return true;
        }

        $resetIn = $record['window_start'] + RATE_LIMIT_WINDOW - $now;

        if ($record['hits'] >= $max) {
            sendRateLimitHeaders($max, 0, $resetIn);
            header('Retry-After: ' . max(1, $resetIn));
            return false;
        }

        $pdo->prepare('UPDATE rate_limits SET hits = hits + 1 WHERE ip = ? AND endpoint = ?')
            ->execute([$ip, $endpoint]);
        sendRateLimitHeaders($max, $max - $record['hits'] - 1, $resetIn);
        return true;
    } catch (Exception $e) {
        return true; // Fail open if rate limit table breaks
    }
}

$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$clientIp = explode(',', $clientIp)[0]; // Take first IP from forwarded chain

// ---- Helpers ----
function sanitize(string $val, int $maxLen = 255): string {
    return mb_substr(trim(strip_tags($val)), 0, $maxLen);
}

// A `??` chain only skips a genuinely null/unset value — an empty string
// (the common default for an unset VARCHAR/TEXT column, e.g. a user who
// never uploaded a company_logo) satisfies `??` immediately and silently
// breaks any fallback chained after it. Use this wherever "first real,
// non-empty value" is actually intended.
function firstNonEmpty(...$candidates): string {
    foreach ($candidates as $c) {
        if (!empty($c)) return $c;
    }
    return '';
}

// Builds a user-facing (non-API) link back to the frontend, from whatever
// host this request actually arrived on — never hardcoded, so it keeps
// working if the app ever moves to yet another domain/subdomain.
function frontendBaseUrl(): string {
    $host = $_SERVER['HTTP_HOST'] ?? 'ishkhwaz.zeraworld.com';
    return 'https://' . $host;
}

// Iraqi phone numbers are conventionally written with a leading 0 (e.g. 0750...)
// but the app shows a fixed +964 prefix, which already implies that 0. Normalize
// to digits-only with the leading 0 stripped so "0750..." and "750..." are the
// same account regardless of which one the user types or how it was stored.
function normalizePhone(string $phone): string {
    $digits = preg_replace('/[^0-9]/', '', $phone);
    return ltrim($digits, '0');
}

function hashPassword(string $password): string {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 11]);
}

function verifyPassword(string $plain, string $hash): bool {
    // Support legacy plaintext passwords during migration
    if (!str_starts_with($hash, '$2')) return $plain === $hash;
    return password_verify($plain, $hash);
}

function generateToken(string $userId, ?string $phone = ''): string {
    $payload = base64_encode(json_encode([
        'uid'  => $userId,
        'tel'  => $phone ?? '',
        'iat'  => time(),
        'exp'  => time() + (30 * 24 * 3600), // 30 days
    ]));
    $sig = hash_hmac('sha256', $payload, TOKEN_SECRET);
    return $payload . '.' . $sig;
}

function validateToken(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 2) return null;
    [$payload, $sig] = $parts;
    $expected = hash_hmac('sha256', $payload, TOKEN_SECRET);
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(base64_decode($payload), true);
    if (!$data || ($data['exp'] ?? 0) < time()) return null;
    return $data;
}

function requireAuth(PDO $pdo): array {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = str_replace('Bearer ', '', $auth);
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized: No token provided.']);
        exit(0);
    }
    $data = validateToken($token);
    if (!$data) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized: Invalid or expired token.']);
        exit(0);
    }
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$data['uid']]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized: User not found.']);
        exit(0);
    }
    if (($user['status'] ?? 'active') === 'blocked' || ($user['status'] ?? 'active') === 'frozen') {
        http_response_code(403);
        echo json_encode(['success' => false, 'status' => $user['status'], 'message' => 'هەژمارەکەت ڕاگیراوە.']);
        exit(0);
    }
    return $user;
}

// Same as requireAuth but never rejects — returns the user array if a valid
// Bearer token is present, or null for a guest. Used where an endpoint works
// for both (e.g. counting a profile view anonymously vs. logging who it was).
function optionalAuthUser(PDO $pdo): ?array {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = str_replace('Bearer ', '', $auth);
    if (empty($token)) return null;
    $data = validateToken($token);
    if (!$data) return null;
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$data['uid']]);
    $user = $stmt->fetch();
    if (!$user || ($user['status'] ?? 'active') === 'blocked' || ($user['status'] ?? 'active') === 'frozen') return null;
    return $user ?: null;
}

// Admin routes are gated by the caller's own signed session token + their role in the
// database — never by a shared secret. Only an account with role admin/owner can pass.
function requireAdmin(PDO $pdo): array {
    $user = requireAuth($pdo);
    if (!in_array($user['role'] ?? '', ['admin', 'owner'], true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden: Admin access required.']);
        exit(0);
    }
    return $user;
}

// ================================================================
// Pusher Channels — real-time delivery for in-app UI (badges, live chat,
// instant notifications) while the app is actually open. Complements Web
// Push above, which is for when the app/browser is closed. No server
// process to host: every call here is a plain signed outbound HTTP request
// to Pusher's REST API, which is all a shared PHP host can do anyway.
// ================================================================
// PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER — defined in config.php.

// Fire-and-forget — a Pusher outage must never break the request that
// triggered it, same reasoning as notifyUser()'s own try/catch below.
function pusherTrigger(array $channels, string $event, array $data): void {
    try {
        $body = json_encode(['name' => $event, 'channels' => $channels, 'data' => json_encode($data, JSON_UNESCAPED_UNICODE)], JSON_UNESCAPED_UNICODE);
        $path = '/apps/' . PUSHER_APP_ID . '/events';
        $params = [
            'auth_key' => PUSHER_KEY,
            'auth_timestamp' => (string)time(),
            'auth_version' => '1.0',
            'body_md5' => md5($body),
        ];
        ksort($params);
        $query = http_build_query($params);
        $signature = hash_hmac('sha256', "POST\n{$path}\n{$query}", PUSHER_SECRET);
        $url = 'https://api-' . PUSHER_CLUSTER . '.pusher.com' . $path . '?' . $query . '&auth_signature=' . $signature;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 5,
        ]);
        curl_exec($ch);
        curl_close($ch);
    } catch (Throwable $e) { /* real-time push failure must never break the calling request */ }
}

// Every admin/owner with the admin panel open is subscribed to this one
// shared private channel (see /pusher/auth below) — so any data change
// worth an admin knowing about (new signup, new job, a plan purchase coming
// in, another admin editing a user) shows up live for everyone watching,
// not just whoever triggered it. `type` lets the panel decide whether to
// refetch its users/plans/jobs list without needing a full page reload.
function notifyAdmins(PDO $pdo, string $type, array $payload = []): void {
    pusherTrigger(['private-admin-panel'], 'admin-update', array_merge(['type' => $type], $payload));
}

// ================================================================
// Web Push (RFC 8291 payload encryption + RFC 8292 VAPID auth) —
// sends a real push message that reaches the device even when the
// app/browser is fully closed, so it shows on the lock screen.
// ================================================================
define('VAPID_PUBLIC_KEY',  'BFu7s9I3za1xcG8htRaPkYp26IACZ4KgwjaBE2Qw5wN6Hs5VB-1_r1R8PbSHszihvw7tfF3xIgZMJRW6sG-1ZY8'); // meant to be public — Web Push spec
// VAPID_PRIVATE_KEY — defined in config.php, server-side only, never exposed.
define('VAPID_SUBJECT',     'mailto:admin@ishkhwaz.zeraworld.com');

function b64urlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64urlDecode(string $data): string {
    $data = strtr($data, '-_', '+/');
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode($data);
}

// Build an ES256-signed VAPID JWT for the given push-service origin
function vapidAuthHeader(string $endpointOrigin): string {
    $header  = b64urlEncode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = b64urlEncode(json_encode([
        'aud' => $endpointOrigin,
        'exp' => time() + 12 * 3600,
        'sub' => VAPID_SUBJECT,
    ]));
    $unsigned = $header . '.' . $payload;

    $pem = vapidPrivateKeyToPem(VAPID_PRIVATE_KEY);
    $pkey = openssl_pkey_get_private($pem);
    openssl_sign($unsigned, $derSig, $pkey, 'sha256');

    // Convert DER ECDSA signature to raw r||s (JOSE format required by JWS)
    $sig = derToJoseSignature($derSig);
    $jwt = $unsigned . '.' . b64urlEncode($sig);

    return 'vapid t=' . $jwt . ', k=' . VAPID_PUBLIC_KEY;
}

// Builds a PKCS#8 PrivateKeyInfo DER (RFC5958) wrapping an RFC5915 ECPrivateKey
// for curve prime256v1, from just the raw 32-byte private scalar. Byte lengths
// below are computed by hand and verified: outer SEQUENCE content is exactly
// 65 bytes (3 version + 21 AlgorithmIdentifier + 41 OCTET STRING), all under
// 128 so every length is single-byte short-form — no long-form 0x81 needed.
function vapidPrivateKeyToPem(string $b64urlPrivateKey): string {
    $d = b64urlDecode($b64urlPrivateKey);
    if (strlen($d) !== 32) $d = str_pad($d, 32, "\x00", STR_PAD_LEFT);

    $algId = "\x30\x13" .
        "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01" .  // OID 1.2.840.10045.2.1 (id-ecPublicKey)
        "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"; // OID 1.2.840.10045.3.1.7 (prime256v1)

    $ecPrivateKey = "\x30\x25" .   // SEQUENCE, len 37
        "\x02\x01\x01" .           // version 1
        "\x04\x20" . $d;           // OCTET STRING, 32-byte private scalar

    $der = "\x30\x41" .            // SEQUENCE, len 65
        "\x02\x01\x00" .           // version 0
        $algId .                   // 21 bytes
        "\x04\x27" . $ecPrivateKey; // OCTET STRING, len 39, wraps the 39-byte ECPrivateKey DER

    return "-----BEGIN PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PRIVATE KEY-----\n";
}

function derToJoseSignature(string $der): string {
    // DER: 0x30 len 0x02 rlen r 0x02 slen s  ->  raw r(32) || s(32), left-padded.
    // P-256 ECDSA signatures are always well under 128 bytes, so the length is
    // always short-form (single byte) in practice.
    $pos = 2; // skip 0x30 tag + 1-byte length
    $pos += 1; // 0x02
    $rlen = ord($der[$pos]); $pos += 1;
    $r = substr($der, $pos, $rlen); $pos += $rlen;
    $pos += 1; // 0x02
    $slen = ord($der[$pos]); $pos += 1;
    $s = substr($der, $pos, $slen); $pos += $slen;

    $r = ltrim($r, "\x00"); $r = str_pad($r, 32, "\x00", STR_PAD_LEFT);
    $s = ltrim($s, "\x00"); $s = str_pad($s, 32, "\x00", STR_PAD_LEFT);
    return $r . $s;
}

// Encrypt + send one push message to one subscription. Returns true on HTTP success.
function sendWebPush(array $sub, string $payloadText): bool {
    try {
        $endpoint = $sub['endpoint'];
        $uaPublic = b64urlDecode($sub['p256dh']);
        $authSecret = b64urlDecode($sub['auth']);
        if (strlen($uaPublic) !== 65 || strlen($authSecret) === 0) return false;

        // Ephemeral EC key pair for this message only
        $eph = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $ephDetails = openssl_pkey_get_details($eph);
        // OpenSSL can return x/y without leading-zero padding — pad to 32 bytes each
        // or the resulting "raw" point silently ends up shorter than 65 bytes.
        $ephX = str_pad($ephDetails['ec']['x'], 32, "\x00", STR_PAD_LEFT);
        $ephY = str_pad($ephDetails['ec']['y'], 32, "\x00", STR_PAD_LEFT);
        $ephPublicRaw = "\x04" . $ephX . $ephY;

        // ECDH shared secret between our ephemeral key and the subscriber's p256dh key
        $uaPubPem = rawEcPublicKeyToPem($uaPublic);
        $uaPubKey = openssl_pkey_get_public($uaPubPem);
        $sharedSecret = openssl_pkey_derive($uaPubKey, $eph);
        if ($sharedSecret === false) return false;

        // RFC 8291 key derivation
        $keyInfo = "WebPush: info\x00" . $uaPublic . $ephPublicRaw;
        $ikm = hash_hkdf('sha256', $sharedSecret, 32, $keyInfo, $authSecret);

        $salt = random_bytes(16);
        $cek   = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);

        // Padding delimiter (0x02 = last record, no further padding needed for our small payloads)
        $plaintext = $payloadText . "\x02";

        $tag = '';
        $ciphertext = openssl_encrypt($plaintext, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($ciphertext === false) return false;

        $body = $salt
            . pack('N', 4096)                 // record size, big-endian uint32
            . chr(strlen($ephPublicRaw))       // keyid length
            . $ephPublicRaw
            . $ciphertext . $tag;

        $endpointOrigin = parse_url($endpoint, PHP_URL_SCHEME) . '://' . parse_url($endpoint, PHP_URL_HOST);
        $auth = vapidAuthHeader($endpointOrigin);

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/octet-stream',
                'Content-Encoding: aes128gcm',
                'TTL: 86400',
                'Authorization: ' . $auth,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
        ]);
        curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $status >= 200 && $status < 300;
    } catch (Throwable $e) {
        return false;
    }
}

function rawEcPublicKeyToPem(string $raw65): string {
    // SubjectPublicKeyInfo wrapping a raw uncompressed P-256 point
    $der = "\x30\x59" .
        "\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07" .
        "\x03\x42\x00" . $raw65;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

// ================================================================
// Supabase JWT verification (ES256 / P-256, same curve as the VAPID keys
// above — the inverse of derToJoseSignature: incoming JWT signatures are
// raw r||s and openssl_verify needs DER, not the other way around).
// ================================================================
function joseSignatureToDer(string $raw64): string {
    if (strlen($raw64) !== 64) throw new InvalidArgumentException('Expected a 64-byte P-256 signature.');
    $encodeInt = function (string $bytes): string {
        $bytes = ltrim($bytes, "\x00");
        if ($bytes === '') $bytes = "\x00";
        if (ord($bytes[0]) & 0x80) $bytes = "\x00" . $bytes; // keep it a positive INTEGER
        return "\x02" . chr(strlen($bytes)) . $bytes;
    };
    $r = $encodeInt(substr($raw64, 0, 32));
    $s = $encodeInt(substr($raw64, 32, 32));
    $seq = $r . $s;
    // P-256 r/s are always well under 128 bytes even after padding — short-form length is safe.
    return "\x30" . chr(strlen($seq)) . $seq;
}

// Cached for an hour — Supabase rotates signing keys rarely, and this avoids
// an outbound HTTP call to Supabase on every single login.
function fetchSupabaseJwks(): array {
    $cacheFile = sys_get_temp_dir() . '/ishkhwaz_supabase_jwks.json';
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 3600) {
        $cached = json_decode(file_get_contents($cacheFile), true);
        if (is_array($cached)) return $cached;
    }
    $ch = curl_init(SUPABASE_JWKS_URL);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
    $raw = curl_exec($ch);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    if (is_array($data)) @file_put_contents($cacheFile, $raw);
    return $data ?? [];
}

// Verifies a Supabase-issued access token and returns its claims, or null if
// the signature, expiry, or issuer don't check out. Never trust the payload
// without this — it's just base64, anyone could hand-craft one.
function verifySupabaseJwt(string $jwt): ?array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;
    [$headerB64, $payloadB64, $sigB64] = $parts;

    $header = json_decode(b64urlDecode($headerB64), true);
    $payload = json_decode(b64urlDecode($payloadB64), true);
    if (!is_array($header) || !is_array($payload)) return null;
    if (($header['alg'] ?? '') !== 'ES256') return null;

    $jwks = fetchSupabaseJwks();
    $matchedKey = null;
    foreach ($jwks['keys'] ?? [] as $k) {
        if (($k['kid'] ?? '') === ($header['kid'] ?? '')) { $matchedKey = $k; break; }
    }
    if (!$matchedKey || ($matchedKey['kty'] ?? '') !== 'EC' || ($matchedKey['crv'] ?? '') !== 'P-256') {
        return null;
    }

    $x = str_pad(b64urlDecode($matchedKey['x']), 32, "\x00", STR_PAD_LEFT);
    $y = str_pad(b64urlDecode($matchedKey['y']), 32, "\x00", STR_PAD_LEFT);
    $pubKey = openssl_pkey_get_public(rawEcPublicKeyToPem("\x04" . $x . $y));
    if (!$pubKey) return null;

    try {
        $derSig = joseSignatureToDer(b64urlDecode($sigB64));
    } catch (InvalidArgumentException $e) {
        return null;
    }

    $verified = openssl_verify($headerB64 . '.' . $payloadB64, $derSig, $pubKey, OPENSSL_ALGO_SHA256);
    if ($verified !== 1) return null;

    if (($payload['exp'] ?? 0) < time()) return null;
    if (($payload['iss'] ?? '') !== rtrim(SUPABASE_URL, '/') . '/auth/v1') return null;

    return $payload;
}

// Notify exactly one user: records an in-app notification row targeted at them
// (their own GET /notifications will pick it up) and pushes to their subscribed
// devices for real — reaches the lock screen even with the app fully closed.
function notifyUser(PDO $pdo, string $userId, string $title, string $body, string $url = '/'): void {
    try {
        $id = 'notif_' . time() . '_' . rand(1000, 9999);
        $pdo->prepare('INSERT INTO push_notifications (id, title, body, target_url, sent_by, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$id, $title, $body, $url, 'Ishkhwaz', $userId, date('Y-m-d H:i:s')]);

        // Real-time, in-app — every notifyUser() caller (job matches, saved
        // searches, referrals, message alerts, status changes, etc.) gets
        // instant delivery for free through this one hook, no polling wait.
        pusherTrigger(['private-user-' . $userId], 'notification', [
            'id' => $id, 'title' => $title, 'body' => $body, 'url' => $url, 'created_at' => date('Y-m-d H:i:s'),
        ]);

        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => $url]);
        $subs = $pdo->prepare('SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?');
        $subs->execute([$userId]);
        foreach ($subs->fetchAll() as $sub) {
            sendWebPush($sub, $payload);
        }
    } catch (Throwable $e) { /* notification failure must never break the calling request */ }
}

// Real skill-match job alerts: every freelancer whose own listed skills
// intersect this job's required_skills gets notified — never a blanket
// "new job" blast to everyone.
function notifyMatchingFreelancers(PDO $pdo, array $job): void {
    try {
        $required = array_map(fn($s) => mb_strtolower(trim((string)$s)), json_decode($job['required_skills'] ?? '[]', true) ?: []);
        if (empty($required)) return;

        $rows = $pdo->prepare("SELECT id, skills FROM users WHERE role = 'freelancer' AND status = 'active'");
        $rows->execute();
        foreach ($rows->fetchAll() as $u) {
            $mySkills = array_map(fn($s) => mb_strtolower(trim((string)$s)), json_decode($u['skills'] ?? '[]', true) ?: []);
            if (empty($mySkills)) continue;
            if (count(array_intersect($required, $mySkills)) === 0) continue;
            notifyUser(
                $pdo, $u['id'],
                'هەلی کاری گونجاو بۆ تۆ',
                ($job['title_ku'] ?? 'هەلی کاری نوێ') . ' — ' . ($job['company_name'] ?? ''),
                '/'
            );
        }
    } catch (Throwable $e) { /* never break job creation over an alert failure */ }
}

// Real saved-search alerts: only fires for a saved_search row whose stored
// filters actually match the newly posted job's real fields.
function notifyMatchingSavedSearches(PDO $pdo, array $job): void {
    try {
        $rows = $pdo->query('SELECT * FROM saved_searches')->fetchAll();
        foreach ($rows as $s) {
            if ($s['category'] !== 'all' && $s['category'] !== $job['category']) continue;
            if ($s['job_type'] !== 'all' && $s['job_type'] !== $job['job_type']) continue;
            if ($s['governorate_id'] !== 'all' && $s['governorate_id'] !== $job['governorate_id']) continue;
            if ((int)$s['min_salary'] > 0 && (int)$job['salary_min'] < (int)$s['min_salary']) continue;
            notifyUser(
                $pdo, $s['user_id'],
                'گەڕانە پاشەکەوتکراوەکەت هەلی کاری نوێی هەیە',
                ($job['title_ku'] ?? 'هەلی کاری نوێ') . ' — ' . ($job['company_name'] ?? ''),
                '/'
            );
        }
    } catch (Throwable $e) { /* never break job creation over an alert failure */ }
}

function safeJson(): array {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > MAX_INPUT_LENGTH) {
        http_response_code(413);
        echo json_encode(['success' => false, 'message' => 'Request too large.']);
        exit(0);
    }
    return json_decode($raw, true) ?? [];
}

function jsonErr(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg]);
    exit(0);
}

// Calls OpenAI's chat completions endpoint with a system+user prompt pair and
// returns the assistant's reply text, or null on any failure (bad key,
// timeout, empty response) — callers should treat null as "AI unavailable
// right now" and fail soft, never block the underlying feature (writing a
// CV / posting a job) on this.
function callOpenAI(string $systemPrompt, string $userPrompt, int $maxTokens = 400): ?string {
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'model' => OPENAI_MODEL,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
            'temperature' => 0.5,
            'max_tokens' => $maxTokens,
        ], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . OPENAI_API_KEY, 'Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $status < 200 || $status >= 300) return null;
    $data = json_decode($raw, true);
    $text = trim($data['choices'][0]['message']['content'] ?? '');
    return $text !== '' ? $text : null;
}

// Second pass: hand the first draft back to the model as a dedicated Kurdish
// copy-edit task. Generating good Sorani in one shot is unreliable (the
// model occasionally hallucinates a word that isn't real Kurdish, or picks
// a wrong-meaning word entirely) — a focused review/rewrite pass, told
// exactly what kind of mistake to look for, catches most of that. Falls
// back to the original draft if the review call itself fails.
function polishKurdish(string $draft, int $maxTokens): string {
    $reviewSystem = "You are a meticulous Sorani Kurdish (Central Kurdish, Arabic script) copy editor. You'll be given an AI-generated draft that may contain: invented words that aren't real Kurdish, real words used with the wrong meaning (e.g. a word that sounds similar to the intended one but means something else entirely), awkward literal-translation phrasing, or a sentence cut off before it finished. "
        . "Rewrite it into fully correct, natural, native-quality Sorani — same meaning, similar length. Technical/domain terms (programming languages, software, tools) may stay in English/Latin script if that's how a Kurdish professional would actually write them — don't force-translate those. Fix every wrong or invented word. If it was cut off, finish it properly. Output ONLY the corrected final text — no preamble, no notes, no quotes.";
    $reviewed = callOpenAI($reviewSystem, $draft, $maxTokens);
    return $reviewed !== null ? $reviewed : $draft;
}

// Creates a payment on Zera Payment for a plan purchase and returns
// ['ok' => true, 'transactionId' => ..., 'paymentUrl' => ...] on success, or
// ['ok' => false, 'reason' => ...] on failure — 'reason' is a short internal
// tag (never the gateway's raw response body) so the caller can show a
// specific, actionable message for the cases that are actually fixable
// (like "no wallet configured yet") without leaking anything else.
function createZeraPayment(int $amount, string $externalReference, string $customerName = '', string $customerPhone = ''): array {
    $ch = curl_init(ZERA_PAYMENT_BASE_URL . '/payments');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'amount' => $amount,
            'currency' => 'IQD',
            'externalReference' => $externalReference,
            'redirectUrl' => frontendBaseUrl() . '/plans?purchase=' . $externalReference,
            'customerName' => $customerName !== '' ? $customerName : null,
            'customerPhone' => $customerPhone !== '' ? $customerPhone : null,
        ]),
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . ZERA_PAYMENT_API_KEY,
            'Content-Type: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw === false) return ['ok' => false, 'reason' => 'unreachable'];

    $data = json_decode($raw, true);
    if ($status < 200 || $status >= 300) {
        $gatewayError = is_array($data) ? ($data['error'] ?? '') : '';
        if (stripos($gatewayError, 'wallet') !== false) {
            return ['ok' => false, 'reason' => 'no_wallet'];
        }
        return ['ok' => false, 'reason' => 'gateway_error'];
    }
    if (empty($data['transactionId']) || empty($data['paymentUrl'])) {
        return ['ok' => false, 'reason' => 'malformed_response'];
    }

    return ['ok' => true, 'transactionId' => $data['transactionId'], 'paymentUrl' => $data['paymentUrl']];
}

// Verifies the X-Zera-Signature header Zera Payment sends on every webhook —
// an HMAC-SHA256 of the exact raw request body, keyed by the merchant's
// webhook secret. Constant-time compare so this can't be timing-attacked.
function verifyZeraWebhookSignature(string $rawBody, ?string $signatureHeader): bool {
    if (empty($signatureHeader)) return false;
    $expected = 'sha256=' . hash_hmac('sha256', $rawBody, ZERA_PAYMENT_WEBHOOK_SECRET);
    return hash_equals($expected, $signatureHeader);
}

// Shared by both the automatic webhook handler and the manual admin-override
// endpoint so a plan purchase is credited (or its rejection notified) exactly
// the same way regardless of which path approved it.
function applyPlanPurchaseResult(PDO $pdo, array $purchase, string $status): void {
    $pdo->prepare('UPDATE plan_purchases SET status = ?, verified_at = ? WHERE id = ?')
        ->execute([$status, date('Y-m-d H:i:s'), $purchase['id']]);

    $planId = $purchase['plan'];
    $tierStmt = $pdo->prepare('SELECT * FROM plan_tiers WHERE id = ?');
    $tierStmt->execute([$planId]);
    $tier = $tierStmt->fetch();
    // A plan an admin has since deleted can still have historical purchases
    // referencing its old id — fall back to a plain name and zero benefit
    // rather than crashing on a lookup that legitimately finds nothing.
    $planName = $tier['name_ku'] ?? $planId;

    if ($status === 'approved') {
        $credits = (int)($tier['credits'] ?? 0);
        $boostDays = (int)($tier['boost_days'] ?? 0);
        $boostUntil = date('Y-m-d H:i:s', strtotime("+{$boostDays} days"));

        // The higher-priced plan wins if the customer already holds a
        // different one — price is the one honest proxy for "better tier"
        // once plans aren't just a hardcoded pro/vip pair anymore.
        $current = $pdo->prepare('SELECT plan FROM users WHERE id = ?');
        $current->execute([$purchase['user_id']]);
        $currentPlanId = $current->fetch()['plan'] ?? null;

        $newPlanId = $planId;
        if ($currentPlanId && $currentPlanId !== $planId) {
            $currentTierStmt = $pdo->prepare('SELECT price FROM plan_tiers WHERE id = ?');
            $currentTierStmt->execute([$currentPlanId]);
            $currentPrice = (int)($currentTierStmt->fetch()['price'] ?? 0);
            $newPlanId = $currentPrice > (int)($tier['price'] ?? 0) ? $currentPlanId : $planId;
        }

        $pdo->prepare('UPDATE users SET plan = ?, plan_credits = plan_credits + ?, plan_boost_until = ? WHERE id = ?')
            ->execute([$newPlanId, $credits, $boostUntil, $purchase['user_id']]);

        notifyUser($pdo, $purchase['user_id'], 'پلانەکەت چالاککرا! 🎉',
            "{$planName} پلانت پشکنرا و چالاککرا — {$credits} کرێدیتی نوێت بۆ زیادکرا.", '/profile');
    } else {
        notifyUser($pdo, $purchase['user_id'], 'کڕینی پلان پەسەند نەکرا',
            "پارەدانەکەت بۆ پلانی {$planName} پەسەند نەکرا — تکایە پەیوەندی بە پشتیوانی بکە.", '/plans');
    }

    notifyAdmins($pdo, 'plan_purchase_' . $status, ['id' => $purchase['id'], 'user_id' => $purchase['user_id'], 'plan' => $planId]);
}

// The one plan (if any) an admin has flagged "primary free" for a given role
// — every newly registered user of that role starts on it automatically
// instead of a plan-less NULL. Returns null if no admin has designated one
// for that audience yet (e.g. most platforms only ever set one up for
// freelancers, leaving employers plan-less until they buy one themselves).
function getPrimaryFreePlan(PDO $pdo, string $role): ?array {
    $audience = $role === 'employer' ? 'employer' : 'freelancer';
    $stmt = $pdo->prepare("SELECT id, credits FROM plan_tiers WHERE is_primary_free = 1 AND is_active = 1 AND audience IN (?, 'both') ORDER BY audience = 'both' LIMIT 1");
    $stmt->execute([$audience]);
    $row = $stmt->fetch();
    return $row ?: null;
}

// What a given plan actually unlocks — the real, enforced counterpart to the
// free-text marketing bullets an admin writes on the plan card. A user with
// no plan (null id, or a plan an admin has since deleted) stays fully
// permissive on messaging/invitations rather than getting locked out of
// something they always had — only the newer, opt-in perks default closed.
function getPlanCapabilities(PDO $pdo, ?string $planId, ?string $role = null): array {
    // Admin/owner accounts run the platform — consumer plan tiers were never
    // meant to gate them, so every capability is always on regardless of
    // whatever plan (or no plan) they happen to have.
    if (in_array($role, ['admin', 'owner'], true)) {
        return ['can_message' => true, 'can_receive_invitations' => true, 'can_see_profile_viewers' => true];
    }
    $defaults = ['can_message' => true, 'can_receive_invitations' => true, 'can_see_profile_viewers' => false];
    if (empty($planId)) return $defaults;
    $stmt = $pdo->prepare('SELECT can_message, can_receive_invitations, can_see_profile_viewers FROM plan_tiers WHERE id = ?');
    $stmt->execute([$planId]);
    $row = $stmt->fetch();
    if (!$row) return $defaults;
    return [
        'can_message'             => (bool)$row['can_message'],
        'can_receive_invitations' => (bool)$row['can_receive_invitations'],
        'can_see_profile_viewers' => (bool)$row['can_see_profile_viewers'],
    ];
}

// ---- Table Migrations ----
// MySQL gets the final column set directly (no need to replay the incremental
// SQLite ALTER TABLE history that built up this shape over time). Timestamp
// columns stay VARCHAR, not native DATETIME/TIMESTAMP — every write goes
// through PHP's date('Y-m-d H:i:s'), and keeping them as plain strings avoids
// MySQL strict-mode rejecting the occasional blank/unvalidated value (e.g. a
// client-supplied `deadline`) the way a real DATETIME column would.
$pdo->exec("
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE NULL,
    email VARCHAR(150),
    password VARCHAR(255) NULL,
    role VARCHAR(20) DEFAULT 'freelancer',
    gender VARCHAR(10) DEFAULT 'male',
    governorate VARCHAR(100) DEFAULT 'sulaymaniyah',
    district VARCHAR(100) DEFAULT 'chemchamal',
    sub_district VARCHAR(100) DEFAULT 'bazyan',
    skills TEXT,
    company_name VARCHAR(200),
    industry VARCHAR(100),
    bio VARCHAR(500),
    avatar MEDIUMTEXT,
    cv_url MEDIUMTEXT,
    wallet_balance INT DEFAULT 25000,
    ref_code VARCHAR(30),
    status VARCHAR(20) DEFAULT 'active',
    created_at VARCHAR(32) NOT NULL,
    company_reg VARCHAR(100),
    company_phone VARCHAR(30),
    company_email VARCHAR(150),
    favorite_categories TEXT,
    saved_jobs TEXT,
    experience TEXT,
    cover MEDIUMTEXT,
    verified TINYINT DEFAULT 0,
    referred_by VARCHAR(64),
    profile_views INT DEFAULT 0,
    plan VARCHAR(10) DEFAULT 'free',
    plan_credits INT DEFAULT 0,
    plan_boost_until VARCHAR(32),
    supabase_user_id VARCHAR(64) UNIQUE,
    auth_provider VARCHAR(20) DEFAULT 'password',
    company_size VARCHAR(20),
    company_type VARCHAR(30),
    hiring_preferences TEXT,
    company_logo MEDIUMTEXT,
    company_cover MEDIUMTEXT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    company_logo MEDIUMTEXT,
    company_phone VARCHAR(30),
    company_email VARCHAR(150),
    title_ku VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    job_type VARCHAR(20) DEFAULT 'fullTime',
    workplace_type VARCHAR(20) DEFAULT 'onSite',
    governorate_id VARCHAR(50) DEFAULT 'sulaymaniyah',
    district_id VARCHAR(50) DEFAULT 'chemchamal',
    sub_district_id VARCHAR(50) DEFAULT 'bazyan',
    location_detail VARCHAR(300),
    salary_min INT DEFAULT 500000,
    salary_max INT DEFAULT 900000,
    salary_period VARCHAR(20) DEFAULT 'monthly',
    description TEXT,
    required_skills TEXT,
    fee_amount INT DEFAULT 2500,
    deadline VARCHAR(30),
    status VARCHAR(20) DEFAULT 'active',
    created_at VARCHAR(32) NOT NULL,
    lat DOUBLE,
    lng DOUBLE,
    location_name VARCHAR(300),
    company_reg VARCHAR(100),
    company_industry VARCHAR(100),
    company_cover MEDIUMTEXT,
    views INT DEFAULT 0,
    boosted_until VARCHAR(32)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    job_title VARCHAR(200),
    company_name VARCHAR(200),
    freelancer_id VARCHAR(64) NOT NULL,
    freelancer_name VARCHAR(100),
    freelancer_phone VARCHAR(30),
    freelancer_email VARCHAR(150),
    freelancer_avatar MEDIUMTEXT,
    cover_letter TEXT,
    cv_url MEDIUMTEXT,
    payment_proof_image MEDIUMTEXT,
    payment_method VARCHAR(50) DEFAULT 'FastPay',
    payment_tx_id VARCHAR(100),
    fee_paid INT DEFAULT 2500,
    payment_status VARCHAR(20) DEFAULT 'pending',
    company_status VARCHAR(20) DEFAULT 'pending',
    status VARCHAR(40) DEFAULT 'pending_payment_verification',
    reject_reason VARCHAR(500),
    applied_at VARCHAR(32),
    verified_at VARCHAR(32),
    accepted_at VARCHAR(32),
    created_at VARCHAR(32) NOT NULL,
    company_id VARCHAR(64)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS push_notifications (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    body VARCHAR(500) NOT NULL,
    target_url VARCHAR(300) DEFAULT '/',
    sent_by VARCHAR(100) DEFAULT 'Zera Group Master Panel',
    created_at VARCHAR(32) NOT NULL,
    user_id VARCHAR(64)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    value VARCHAR(500),
    updated_at VARCHAR(32)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    endpoint VARCHAR(1000) NOT NULL,
    p256dh VARCHAR(200),
    auth VARCHAR(100),
    created_at VARCHAR(32) NOT NULL,
    user_id VARCHAR(64)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS plan_purchases (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    plan VARCHAR(10) NOT NULL,
    price INT NOT NULL,
    payment_method VARCHAR(50),
    payment_tx_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    created_at VARCHAR(32) NOT NULL,
    verified_at VARCHAR(32)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL,
    sender_id VARCHAR(64) NOT NULL,
    receiver_id VARCHAR(64) NOT NULL,
    body TEXT NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    read_at VARCHAR(32)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS saved_searches (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    label VARCHAR(100),
    category VARCHAR(50) DEFAULT 'all',
    job_type VARCHAR(30) DEFAULT 'all',
    governorate_id VARCHAR(50) DEFAULT 'all',
    min_salary INT DEFAULT 0,
    created_at VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    freelancer_id VARCHAR(64) NOT NULL,
    freelancer_name VARCHAR(100),
    job_title VARCHAR(200) NOT NULL,
    salary_offer VARCHAR(50),
    message VARCHAR(1000),
    status VARCHAR(20) DEFAULT 'pending',
    created_at VARCHAR(32) NOT NULL,
    responded_at VARCHAR(32)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(64) PRIMARY KEY,
    name_ku VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    icon VARCHAR(20) DEFAULT '💼',
    parent_id VARCHAR(64) NULL,
    sort_order INT DEFAULT 0,
    created_at VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS plan_tiers (
    id VARCHAR(30) PRIMARY KEY,
    name_ku VARCHAR(50) NOT NULL,
    name_en VARCHAR(50),
    tagline VARCHAR(150),
    icon VARCHAR(20) DEFAULT 'Star',
    color VARCHAR(20) DEFAULT 'lime',
    price INT NOT NULL,
    credits INT NOT NULL DEFAULT 0,
    boost_days INT NOT NULL DEFAULT 0,
    features TEXT,
    featured TINYINT DEFAULT 0,
    is_primary_free TINYINT DEFAULT 0,
    can_message TINYINT DEFAULT 1,
    can_receive_invitations TINYINT DEFAULT 1,
    can_see_profile_viewers TINYINT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    audience VARCHAR(20) DEFAULT 'both',
    created_at VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS profile_views_log (
    id VARCHAR(40) PRIMARY KEY,
    profile_id VARCHAR(64) NOT NULL,
    viewer_id VARCHAR(64) NOT NULL,
    viewer_name VARCHAR(150),
    viewer_company_name VARCHAR(200),
    viewed_at VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS oauth_codes (
    code VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(50) NOT NULL,
    redirect_uri VARCHAR(255) NOT NULL,
    used TINYINT DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    expires_at VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- A rejected payment (a job application's CV fee, or a plan purchase)
  -- used to just be a dead end. Real ticket: filed by the user, worked by
  -- an admin (from the Zera Console — Ishkhwaz has no admin UI of its own
  -- anymore), resolved as a wallet refund, an overturned approval, or denied.
  CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(64) PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    reason VARCHAR(2000) NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    resolution_note VARCHAR(1000),
    resolved_by VARCHAR(64),
    resolved_at VARCHAR(32),
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS dispute_messages (
    id VARCHAR(64) PRIMARY KEY,
    dispute_id VARCHAR(64) NOT NULL,
    sender_id VARCHAR(64) NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    body VARCHAR(2000) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_dispute (dispute_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- Real project-tracking + payment-confirmation for an accepted
  -- application — NOT an escrow: Ishkhwaz never takes custody of the job's
  -- actual pay (that still moves employer -> freelancer directly, same as
  -- today). This just gives both sides a structured, notified, disputable
  -- record of what was agreed and what's been paid, instead of nothing.
  CREATE TABLE IF NOT EXISTS milestones (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    amount INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    freelancer_note VARCHAR(1000),
    employer_note VARCHAR(1000),
    submitted_at VARCHAR(32),
    confirmed_at VARCHAR(32),
    sort_order INT DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    INDEX idx_application (application_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- One rating per (application_id, rater_id) — tied to a real accepted
  -- application, not a free-floating review, so it can't be spammed/faked.
  -- Either side of a hired application can rate the other once.
  CREATE TABLE IF NOT EXISTS ratings (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL,
    rater_id VARCHAR(64) NOT NULL,
    rater_role VARCHAR(20) NOT NULL,
    ratee_id VARCHAR(64) NOT NULL,
    rating TINYINT NOT NULL,
    comment VARCHAR(500),
    created_at VARCHAR(32) NOT NULL,
    UNIQUE KEY uniq_app_rater (application_id, rater_id),
    INDEX idx_ratee (ratee_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

  -- One row per user — AI-ranked job matches, cached (see /jobs/recommended)
  -- so a real OpenAI call only happens when the profile actually changed.
  CREATE TABLE IF NOT EXISTS job_recommendations (
    user_id VARCHAR(64) PRIMARY KEY,
    job_ids TEXT NOT NULL,
    reasons TEXT,
    ai_powered TINYINT DEFAULT 0,
    profile_hash VARCHAR(64),
    generated_at VARCHAR(32) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
");

// Bring an already-existing plan_tiers table up to the current shape —
// CREATE TABLE IF NOT EXISTS above is a no-op once the table exists.
foreach ([
    "ALTER TABLE plan_tiers ADD COLUMN name_en VARCHAR(50)",
    "ALTER TABLE plan_tiers ADD COLUMN tagline VARCHAR(150)",
    "ALTER TABLE plan_tiers ADD COLUMN icon VARCHAR(20) DEFAULT 'Star'",
    "ALTER TABLE plan_tiers ADD COLUMN color VARCHAR(20) DEFAULT 'lime'",
    "ALTER TABLE plan_tiers ADD COLUMN features TEXT",
    "ALTER TABLE plan_tiers ADD COLUMN is_primary_free TINYINT DEFAULT 0",
    "ALTER TABLE plan_tiers ADD COLUMN can_message TINYINT DEFAULT 1",
    "ALTER TABLE plan_tiers ADD COLUMN can_receive_invitations TINYINT DEFAULT 1",
    "ALTER TABLE plan_tiers ADD COLUMN can_see_profile_viewers TINYINT DEFAULT 0",
    // Which side of the marketplace a plan is for — 'freelancer', 'employer',
    // or 'both'. Lets an admin build employer-only plans (job-posting boosts,
    // featured-company badge, etc.) distinct from the freelancer CV-credit
    // plans, without either side seeing the other's cards on /plans.
    "ALTER TABLE plan_tiers ADD COLUMN audience VARCHAR(20) DEFAULT 'both'",
] as $migration) {
    try { $pdo->exec($migration); } catch (Exception $e) { /* already applied */ }
}

// No auto-seeding here, deliberately: plan_tiers is entirely admin-managed
// through /admin/plans/add|update|delete. If an admin deletes every plan
// (including pro/vip), the table just stays empty — nothing recreates them
// on the next request. (It used to reseed pro/vip whenever the table was
// empty, which silently undid intentional deletions — removed for that reason.)

// Bring an already-existing users table up to the current shape — CREATE
// TABLE IF NOT EXISTS above is a no-op once the table exists, so schema
// changes to an existing column (like these) need their own migration.
// Added for Google/Facebook/Apple sign-in via Supabase: those accounts have
// no phone number or password, and need a column linking back to the
// Supabase user that owns them.
foreach ([
    "ALTER TABLE users MODIFY password VARCHAR(255) NULL",
    "ALTER TABLE users MODIFY phone VARCHAR(30) NULL",
    "ALTER TABLE users ADD COLUMN supabase_user_id VARCHAR(64) UNIQUE",
    "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'password'",
    // Employer-only: company size/type, and a "hiring preferences" profile
    // (desired category, education, experience, skills, languages, job
    // type, salary range) collected at signup — see /auth/register and
    // /auth/me below.
    "ALTER TABLE users ADD COLUMN company_size VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN company_type VARCHAR(30)",
    "ALTER TABLE users ADD COLUMN hiring_preferences TEXT",
    // Deliberately separate from `avatar` — avatar is the account holder's
    // own personal photo (shown in the header/profile), company_logo is the
    // business's brand mark (shown on job listings, the dashboard, the
    // public company page). Falls back to avatar wherever unset so nothing
    // regresses for employers who haven't set one yet.
    "ALTER TABLE users ADD COLUMN company_logo MEDIUMTEXT",
    // Same idea as company_logo, but for the cover/background photo —
    // `cover` is the account holder's own personal background (shown on
    // their personal profile page), company_cover is the business's own
    // background (shown on the company dashboard/public company page).
    "ALTER TABLE users ADD COLUMN company_cover MEDIUMTEXT",
] as $migration) {
    try { $pdo->exec($migration); } catch (Exception $e) { /* already applied */ }
}

// Garmian was never a real governorate — it's a district-region of Sulaymaniyah.
// Any job/user already saved under one of its old (inconsistent) id variants
// gets folded back into Sulaymaniyah. Safe to re-run — no-ops once migrated.
foreach ([
    "UPDATE jobs SET governorate_id = 'sulaymaniyah' WHERE governorate_id IN ('garmian','garmyan','germiyan')",
    "UPDATE users SET governorate = 'sulaymaniyah' WHERE governorate IN ('garmian','garmyan','germiyan','گەرمیان')",
] as $fix) {
    try { $pdo->exec($fix); } catch (Exception $e) { /* ignore */ }
}

// Categories table up to the current 21-main-category + subcategory shape.
// Existing ids (cat_tech, cat_sales, etc.) are kept EXACTLY as-is — live
// jobs and users.favorite_categories already reference them by id (loose
// string, not a real FK) — only their display name/icon/sort_order changed.
// INSERT ... ON DUPLICATE KEY UPDATE means this single list works whether
// the table is brand new (plain inserts) or already has the old 10 rows
// (existing ids get updated in place, new ids get added) — but never
// touches created_at on an update, so original rows keep their real date.
// Gated on cat_admin's existence so this ~90-row migration runs once, not
// on every request once it's already been applied.
try { $pdo->exec("ALTER TABLE categories ADD COLUMN parent_id VARCHAR(64) NULL"); } catch (Exception $e) { /* already applied */ }

$hasNewCategoryScheme = (int)$pdo->query("SELECT COUNT(*) c FROM categories WHERE id = 'cat_admin'")->fetch()['c'];
if (!$hasNewCategoryScheme) {
    $now = date('Y-m-d H:i:s');
    $mains = [
        // id                  name_ku                              name_en                        icon     sort
        ['cat_admin',         'کارگێڕی و ئیداری',                  'Administration & Management', '🗂️', 1],
        ['cat_finance',       'هەژماردارێتی و دارایی',              'Accounting & Finance',         '💰', 2],
        ['cat_sales',         'بازرگانی و فرۆشتن',                  'Sales & Marketing',            '📈', 3],
        ['cat_tech',          'تەکنەلۆژیای زانیاری',                'IT & Programming',             '💻', 4],
        ['cat_media',         'دیزاین و مێدیا',                    'Design & Media',               '🎨', 5],
        ['cat_engineering',   'ئەندازیاری',                        'Engineering',                   '⚙️', 6],
        ['cat_construction',  'بنیاتنان و کارگەکان',                'Construction & Labor',          '🏗️', 7],
        ['cat_health',        'تەندروستی',                          'Health & Medical',              '🩺', 8],
        ['cat_education',     'پەروەردە و مامۆستایەتی',              'Teaching & Education',          '🎓', 9],
        ['cat_legal',         'یاسا',                              'Legal & Law',                    '⚖️', 10],
        ['cat_hr',            'کارگێڕی مرۆیی',                      'Human Resources',               '🧑‍💼', 11],
        ['cat_food',          'میوانداری و هۆتێل',                  'Hospitality & Hotels',           '🍽️', 12],
        ['cat_transport',     'گواستنەوە و لۆجستیک',                'Transport & Logistics',          '🚚', 13],
        ['cat_quality',       'کوالیتی و پاراستنی سیفەت',            'Quality Control',                '✅', 14],
        ['cat_customer',      'خزمەتگوزاری کڕیار',                  'Customer Service',               '🎧', 15],
        ['cat_beauty',        'جلوبەرگ و ڕازاندنەوە',                'Fashion & Beauty',               '💇', 16],
        ['cat_sports',        'وەرزش',                             'Sports & Fitness',                '🏋️', 17],
        ['cat_agriculture',   'کشتوکاڵ و ئاژەڵداری',                 'Agriculture & Livestock',         '🌾', 18],
        ['cat_security',      'سکیوریتی و پاراستن',                 'Security',                        '🛡️', 19],
        ['cat_homeservices',  'کاری ماڵی و خزمەتگوزاری تاک',         'Home & Freelance Services',       '🧹', 20],
        ['cat_other',         'هی تر',                             'Other',                           '📦', 21],
    ];
    $upsert = $pdo->prepare('INSERT INTO categories (id, name_ku, name_en, icon, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, NULL, ?, ?)
        ON DUPLICATE KEY UPDATE name_ku=VALUES(name_ku), name_en=VALUES(name_en), icon=VALUES(icon), parent_id=NULL, sort_order=VALUES(sort_order)');
    foreach ($mains as $c) $upsert->execute([$c[0], $c[1], $c[2], $c[3], $c[4], $now]);

    $subs = [
        'cat_admin' => [
            ['کارمەندی ئیداری', 'Office Admin'], ['بەڕێوەبەری گشتی', 'General Manager'],
            ['سکرتێر', 'Secretary'], ['کۆئۆردینەیتەر', 'Coordinator'],
        ],
        'cat_finance' => [
            ['ژمێریار', 'Accountant'], ['شارەزای دارایی', 'Financial Analyst'],
            ['کاشیر', 'Cashier / Teller'], ['شارەزای پشکنین', 'Auditor'],
        ],
        'cat_sales' => [
            ['فرۆشیار', 'Salesperson'], ['بەڕێوەبەری فرۆشتن', 'Sales Manager'],
            ['مارکێتینگی دیجیتاڵ', 'Digital Marketing'], ['نوێنەری فرۆشتن', 'Sales Representative'],
        ],
        'cat_tech' => [
            ['گەشەپێدەری وێب', 'Web Developer'], ['گەشەپێدەری مۆبایل', 'Mobile Developer'],
            ['پشتگیری تەکنیکی', 'IT Support'], ['بەڕێوەبەری تۆڕ و سیستەم', 'Network / System Admin'],
        ],
        'cat_media' => [
            ['دیزاینەری گرافیک', 'Graphic Designer'], ['وێنەگر', 'Photographer'],
            ['دەستکاریکەری ڤیدیۆ', 'Video Editor'], ['دیزاینەری UI/UX', 'UI/UX Designer'],
        ],
        'cat_engineering' => [
            ['ئەندازیاری شارستانی', 'Civil Engineer'], ['ئەندازیاری کارەبا', 'Electrical Engineer'],
            ['ئەندازیاری میکانیک', 'Mechanical Engineer'], ['ئەندازیاری کیمیایی', 'Chemical Engineer'],
        ],
        'cat_construction' => [
            ['وەستای بینا', 'Construction Worker'], ['کارگری کارەبا', 'Electrician'],
            ['کارگری ئاودەرگ', 'Plumber'], ['نەقاش', 'Painter'],
        ],
        'cat_health' => [
            ['پزیشک', 'Doctor'], ['پەرستار', 'Nurse'],
            ['دەرمانساز', 'Pharmacist'], ['تەکنیشنی تاقیگە', 'Lab Technician'],
        ],
        'cat_education' => [
            ['مامۆستای بنەڕەتی', 'Primary Teacher'], ['مامۆستای ئامادەیی', 'Secondary Teacher'],
            ['مامۆستای زمان', 'Language Teacher'], ['چاودێری قوتابخانە', 'School Supervisor'],
        ],
        'cat_legal' => [
            ['پارێزەر', 'Lawyer'], ['شارەزای یاسایی', 'Legal Advisor'], ['نۆتێر', 'Notary'],
        ],
        'cat_hr' => [
            ['بەڕێوەبەری سەرچاوە مرۆیی', 'HR Manager'], ['دامەزراندنی کارمەند', 'Recruiter'],
            ['ڕاهێنانی کارمەندان', 'Training Officer'],
        ],
        'cat_food' => [
            ['گارسۆن', 'Waiter / Waitress'], ['چێشتلێنەر', 'Chef / Cook'],
            ['بەڕێوەبەری هۆتێل', 'Hotel Manager'], ['ڕیسێپشنیست', 'Receptionist'],
        ],
        'cat_transport' => [
            ['شۆفێر', 'Driver'], ['بەڕێوەبەری گواستنەوە', 'Logistics Manager'],
            ['کۆرییەر / گەیاندن', 'Delivery / Courier'],
        ],
        'cat_quality' => [
            ['شارەزای کوالیتی', 'QA Specialist'], ['چاودێری کوالیتی', 'Quality Inspector'],
        ],
        'cat_customer' => [
            ['کارمەندی کۆڵ سێنتەر', 'Call Center Agent'], ['پشتگیری کڕیار', 'Customer Support'],
        ],
        'cat_beauty' => [
            ['خانمی ڕازاندنەوە', 'Beautician'], ['دەرزیکەر / دیزاینەری جلوبەرگ', 'Tailor / Fashion Designer'],
            ['چاککەری قژ', 'Hair Stylist'],
        ],
        'cat_sports' => [
            ['ڕاهێنەری وەرزش', 'Fitness Trainer / Coach'], ['چاودێری یاری', 'Sports Referee'],
        ],
        'cat_agriculture' => [
            ['کشتوکاڵ', 'Farmer / Agriculture Worker'], ['ئاژەڵداری', 'Livestock Care'], ['باخەوان', 'Gardener'],
        ],
        'cat_security' => [
            ['پاسەوان', 'Security Guard'], ['چاودێری کامێرا', 'CCTV Monitor'],
        ],
        'cat_homeservices' => [
            ['پاکژکەرەوە', 'Cleaner'], ['چاکسازی ماڵ', 'Home Repair / Handyman'],
            ['خزمەتگوزاری فریلانس', 'Freelance Service Provider'],
        ],
    ];
    $iconByParent = [];
    foreach ($mains as $c) $iconByParent[$c[0]] = $c[3];
    $insSub = $pdo->prepare('INSERT INTO categories (id, name_ku, name_en, icon, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name_ku=VALUES(name_ku), name_en=VALUES(name_en), icon=VALUES(icon), parent_id=VALUES(parent_id), sort_order=VALUES(sort_order)');
    foreach ($subs as $parentId => $items) {
        $order = 0;
        foreach ($items as $item) {
            $order++;
            $subId = $parentId . '_' . $order;
            $insSub->execute([$subId, $item[0], $item[1], $iconByParent[$parentId] ?? '💼', $parentId, $order, $now]);
        }
    }
}

// ---- Platform-wide settings — real, admin-editable values that were previously
// hardcoded (the CV fee, the FastPay collection number, whether registration is
// open) and could only ever be changed by editing code and redeploying. ----
$defaultSettings = [
    'cv_fee_amount'    => '2500',
    'fastpay_number'   => '0770 123 4567',
    'registration_open'=> 'true',
    'job_boost_price'      => '5000',
    'job_boost_days'       => '3',
    'referral_bonus_amount'=> '5000',
    // Plans — one-time purchase, not a subscription. Credits = number of CV
    // applications sendable without the usual per-application FastPay wait;
    // boost_days = how long the profile shows first in the freelancer directory.
    'plan_pro_price'       => '15000',
    'plan_pro_credits'     => '10',
    'plan_pro_boost_days'  => '14',
    'plan_vip_price'       => '35000',
    'plan_vip_credits'     => '30',
    'plan_vip_boost_days'  => '30',
];
// Insert only whichever keys don't already exist — so adding a new setting to
// this list later always seeds it, instead of only working on a brand-new table.
$insSet = $pdo->prepare('INSERT IGNORE INTO settings (`key`, value, updated_at) VALUES (?, ?, ?)');
foreach ($defaultSettings as $k => $v) $insSet->execute([$k, $v, date('Y-m-d H:i:s')]);

function getSetting(PDO $pdo, string $key, string $default = ''): string {
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key` = ?');
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row ? $row['value'] : $default;
}

// ---- Indexes on the columns every hot query actually filters/sorts by. Each
// one is wrapped in try/catch and re-run on every request — MySQL/MariaDB's
// `CREATE INDEX IF NOT EXISTS` makes the try/catch a belt-and-braces no-op
// rather than the only thing preventing a "duplicate key name" error. As the
// tables grow past a few hundred rows these turn the busiest queries (the public
// job list, an employer's applicant list, a freelancer's own applications) from
// a full table scan into a direct lookup. ----
foreach ([
    'CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at)',
    'CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_jobs_governorate ON jobs(governorate_id)',
    'CREATE INDEX IF NOT EXISTS idx_applications_job_freelancer ON applications(job_id, freelancer_id)',
    'CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company_id, payment_status)',
    'CREATE INDEX IF NOT EXISTS idx_applications_freelancer ON applications(freelancer_id)',
    'CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id)',
    'CREATE INDEX IF NOT EXISTS idx_invitations_freelancer ON invitations(freelancer_id)',
    'CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON push_notifications(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_application ON messages(application_id)',
    'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)',
    'CREATE INDEX IF NOT EXISTS idx_profile_views_log_profile ON profile_views_log(profile_id, viewed_at)',
] as $indexSql) {
    try { $pdo->exec($indexSql); } catch (Exception $e) { /* already exists */ }
}

// Strip query string so /jobs? and /jobs both match
$uri    = strtok($_SERVER['REQUEST_URI'], '?');
$method = $_SERVER['REQUEST_METHOD'];

// ================================================================
// 1. Health Check (public, rate limited)
// ================================================================
if (preg_match('#/health$#', $uri) || preg_match('#/v1/?$#', $uri)) {
    echo json_encode([
        'status'    => 'online',
        'engine'    => 'PDO MySQL (Hostinger Secure Engine)',
        'database'  => 'connected',
        'timestamp' => date('Y-m-d H:i:s'),
    ]);
    exit(0);
}

// ================================================================
// 2. Auth: Register  POST /auth/register
// ================================================================
if (preg_match('#/auth/register$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'register')) jsonErr(429, 'Too many requests. Please wait.');
    if (getSetting($pdo, 'registration_open', 'true') !== 'true') {
        jsonErr(403, 'خۆتۆمارکردنی ئەندامی نوێ لە ئێستادا داخراوە. تکایە دواتر هەوڵبدەرەوە.');
    }

    $input    = safeJson();
    $phone    = sanitize($input['phone']    ?? '', 20);
    $name     = sanitize($input['name']     ?? 'بەکارهێنەر', 100);
    $email    = sanitize($input['email']    ?? '', 150);
    $password = trim($input['password']     ?? '');
    $role     = ($input['role'] ?? '') === 'employer' ? 'employer' : 'freelancer'; // Whitelist roles
    $gender   = in_array($input['gender'] ?? '', ['male', 'female', 'other']) ? $input['gender'] : 'male';
    $governorate = sanitize($input['favGov']    ?? $input['governorate']  ?? 'sulaymaniyah', 100);
    $district    = sanitize($input['favDist']   ?? $input['district']     ?? 'chemchamal', 100);
    $subDistrict = sanitize($input['favSubDist']?? $input['sub_district'] ?? 'bazyan', 100);
    $bio      = sanitize($input['bio']    ?? '', 500);
    $avatar   = sanitize($input['avatar'] ?? '', 800000);
    // Accepts either one category (string, from the old single-select) or
    // several (array, from the freelancer signup's multi-select) — sanitize
    // whichever shape it is down to a flat array of ids.
    $rawCategory = $input['category'] ?? '';
    $categoryList = is_array($rawCategory) ? $rawCategory : ($rawCategory ? [$rawCategory] : []);
    $categoryList = array_values(array_filter(array_map(fn($c) => sanitize((string)$c, 50), $categoryList)));
    $favoriteCategories = json_encode($categoryList);
    // Skills collected right at signup (freelancer only) — same shape/column
    // as the one /auth/me updates later, just seeded here instead of empty.
    $signupSkills = is_array($input['skills'] ?? null) ? array_values(array_filter(array_map(fn($s) => sanitize((string)$s, 60), $input['skills']))) : [];
    $signupSkillsJson = json_encode($signupSkills);

    // Company fields — only meaningful for employer accounts, collected once at signup
    $companyName  = sanitize($input['company_name']     ?? '', 200);
    $companyReg   = sanitize($input['company_reg']      ?? '', 100);
    $companyPhone = sanitize($input['company_phone']    ?? '', 30);
    $companyEmail = sanitize($input['company_email']    ?? '', 150);
    $industry     = sanitize($input['company_industry'] ?? $input['industry'] ?? '', 100);
    $companySize  = in_array($input['company_size'] ?? '', ['small', 'medium', 'large'], true) ? $input['company_size'] : null;
    $companyType  = in_array($input['company_type'] ?? '', ['sole_proprietor', 'partnership', 'government', 'private'], true) ? $input['company_type'] : null;
    $companyLogo  = sanitize($input['company_logo'] ?? '', 800000);
    $companyCover = sanitize($input['company_cover'] ?? '', 800000);
    // Free-form "who we're generally hiring" profile — shown on the company's
    // own page and usable later for matching, not tied to any single job post.
    $hiringPrefs  = is_array($input['hiring_preferences'] ?? null) ? json_encode($input['hiring_preferences'], JSON_UNESCAPED_UNICODE) : null;

    if (empty($phone) || !preg_match('/^[0-9+\s\-]{7,20}$/', $phone)) jsonErr(400, 'ژمارەی تەلەفۆنی دروست پێویستە.');
    if (strlen($password) < 8) jsonErr(400, 'وشەی نهێنی دەبێت لانیکم ٨ پیت بێت.');
    if ($role === 'employer' && (empty($companyName) || empty($companyPhone))) {
        jsonErr(400, 'ناوی کۆمپانیا و ژمارەی تەلەفۆنی کۆمپانیا پێویستن.');
    }

    $phone = normalizePhone($phone);
    $check = $pdo->prepare('SELECT id FROM users WHERE phone = ? OR phone = ?');
    $check->execute([$phone, '0' . $phone]);
    if ($check->fetch()) jsonErr(400, 'ئەم ژمارەی تەلەفۆنە پێشتر تۆمارکراوە.');

    $userId  = 'usr_' . time() . rand(10, 99);
    $refCode = 'ISHK-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
    $balance = ($role === 'employer' ? 100000 : 0) + 25000;
    $hashedPw = hashPassword($password);

    // Referral system removed — no longer matched or rewarded. $refCode is
    // still generated/stored per-user below since it's part of the existing
    // users-table INSERT column list, but nothing reads or acts on it anymore.
    $referredBy = null;

    // Auto-assigns whichever primary-free plan an admin has designated for
    // this role, if any — an employer only starts on one if an admin has
    // actually set up an employer-audience free tier; otherwise they stay
    // plan-less until they buy one, same as before employer plans existed.
    $primaryFree = getPrimaryFreePlan($pdo, $role);

    $createdAt = date('Y-m-d H:i:s');
    $pdo->prepare('
        INSERT INTO users (
            id, name, phone, email, password, role, gender,
            governorate, district, sub_district, bio, avatar, favorite_categories, skills,
            company_name, company_reg, company_phone, company_email, industry,
            company_size, company_type, hiring_preferences, company_logo, company_cover,
            wallet_balance, ref_code, referred_by, status, plan, plan_credits, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $userId, $name, $phone, $email, $hashedPw, $role, $gender,
        $governorate, $district, $subDistrict, $bio, $avatar, $favoriteCategories, $signupSkillsJson,
        $companyName, $companyReg, $companyPhone, $companyEmail, $industry,
        $companySize, $companyType, $hiringPrefs, $companyLogo, $companyCover,
        $balance, $refCode, $referredBy, 'active',
        $primaryFree['id'] ?? null, (int)($primaryFree['credits'] ?? 0),
        $createdAt
    ]);

    notifyAdmins($pdo, 'user_registered', ['id' => $userId, 'name' => $name, 'role' => $role]);

    echo json_encode([
        'success' => true,
        'token'   => generateToken($userId, $phone),
        'user'    => [
            'id' => $userId, 'name' => $name, 'phone' => $phone, 'email' => $email,
            'role' => $role, 'gender' => $gender, 'governorate' => $governorate,
            'district' => $district, 'sub_district' => $subDistrict, 'bio' => $bio, 'avatar' => $avatar,
            'company_name' => $companyName, 'company_reg' => $companyReg,
            'company_phone' => $companyPhone, 'company_email' => $companyEmail, 'industry' => $industry,
            'company_size' => $companySize, 'company_type' => $companyType, 'company_logo' => $companyLogo,
            'company_cover' => $companyCover,
            'hiring_preferences' => $hiringPrefs ?? '{}',
            'favorite_categories' => $favoriteCategories, 'saved_jobs' => '[]', 'experience' => '[]', 'skills' => $signupSkillsJson,
            'status' => 'active', 'wallet_balance' => $balance, 'ref_code' => $refCode,
            'plan' => $primaryFree['id'] ?? null, 'plan_credits' => (int)($primaryFree['credits'] ?? 0),
            'created_at' => $createdAt,
        ]
    ]);
    exit(0);
}

// ================================================================
// 3. Auth: Login  POST /auth/login
// ================================================================
if (preg_match('#/auth/login$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'login')) jsonErr(429, 'زۆر جار هەوڵت دا. کەمێک چاوەڕوان بە.');

    $input        = safeJson();
    $phoneOrEmail = sanitize($input['phone_or_email'] ?? $input['phone'] ?? '', 100);
    $password     = trim($input['password'] ?? '');

    if (empty($phoneOrEmail) || empty($password)) jsonErr(400, 'زانیاری تەواو پێویستە.');

    $normalizedPhone = normalizePhone($phoneOrEmail);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE phone = ? OR phone = ? OR email = ?');
    $stmt->execute([$normalizedPhone, '0' . $normalizedPhone, $phoneOrEmail]);
    $user = $stmt->fetch();

    // Small constant delay either way so response timing doesn't leak which branch was taken
    usleep(150000);
    if (!$user) {
        jsonErr(401, 'هیچ ئەژمێرێک بەم ژمارە مۆبایلە تۆمار نەکراوە.');
    }
    if (empty($user['password'])) {
        jsonErr(401, 'ئەم هەژمارە بە گووگڵ/فەیسبووک/ئەپڵ چوویتە ژوورەوە — تکایە بەو ڕێگەیە بچۆرە ژوورەوە.');
    }
    if (!verifyPassword($password, $user['password'])) {
        jsonErr(401, 'وشەی نهێنی هەڵەیە.');
    }

    if (($user['status'] ?? 'active') === 'blocked' || ($user['status'] ?? 'active') === 'frozen') {
        jsonErr(403, 'هەژمارەکەت ڕاگیراوە (بلۆككراوە).');
    }

    echo json_encode([
        'success' => true,
        'token'   => generateToken($user['id'], $user['phone']),
        'user'    => [
            'id'             => $user['id'],
            'name'           => $user['name'],
            'phone'          => $user['phone'],
            'email'          => $user['email'],
            'role'           => $user['role'],
            'gender'         => $user['gender'],
            'governorate'    => $user['governorate'],
            'district'       => $user['district'],
            'sub_district'   => $user['sub_district'],
            'bio'            => $user['bio'],
            'avatar'         => $user['avatar'],
            'cover'          => $user['cover'],
            'company_name'   => $user['company_name'],
            'company_reg'    => $user['company_reg'],
            'company_phone'  => $user['company_phone'],
            'company_email'  => $user['company_email'],
            'industry'       => $user['industry'],
            'company_size'   => $user['company_size'] ?? null,
            'company_type'   => $user['company_type'] ?? null,
            'company_logo'   => $user['company_logo'] ?? null,
            'company_cover'  => $user['company_cover'] ?? null,
            'hiring_preferences' => $user['hiring_preferences'] ?? '{}',
            'favorite_categories' => $user['favorite_categories'] ?? '[]',
            'saved_jobs'     => $user['saved_jobs'] ?? '[]',
            'experience'     => $user['experience'] ?? '[]',
            'skills'         => $user['skills'] ?? '[]',
            'status'         => $user['status'] ?? 'active',
            'wallet_balance' => (int)$user['wallet_balance'],
            'ref_code'         => $user['ref_code'] ?? null,
            'verified'         => (int)($user['verified'] ?? 0),
            'plan'             => $user['plan'] ?? 'free',
            'plan_credits'     => (int)($user['plan_credits'] ?? 0),
            'plan_boost_until' => $user['plan_boost_until'] ?? null,
            'created_at'       => $user['created_at'] ?? null,
        ]
    ]);
    exit(0);
}

// ================================================================
// 3b. Auth: Social Sign-In (Google / Facebook / Apple via Supabase)
//     POST /auth/social  { access_token: "<supabase session access token>" }
//
// The frontend runs the actual OAuth flow through Supabase's JS client and
// gets back a Supabase session — this endpoint verifies that session's JWT
// (signature checked against Supabase's own public keys, nothing taken on
// trust) and either links it to an existing phone-based account with the
// same verified email, or creates a brand new one. Either way we hand back
// our own normal session token, so every other endpoint needs zero changes.
// ================================================================
if (preg_match('#/auth/social$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'social_login')) jsonErr(429, 'Too many requests. Please wait.');

    $input = safeJson();
    $accessToken = trim($input['access_token'] ?? '');
    if (empty($accessToken)) jsonErr(400, 'Access token required.');

    $claims = verifySupabaseJwt($accessToken);
    if (!$claims) jsonErr(401, 'Invalid or expired sign-in token.');

    $supabaseUserId = (string)($claims['sub'] ?? '');
    if (empty($supabaseUserId)) jsonErr(401, 'Invalid sign-in token.');

    $email = sanitize((string)($claims['email'] ?? ''), 150);
    $provider = sanitize((string)($claims['app_metadata']['provider'] ?? 'social'), 20);
    $metadata = is_array($claims['user_metadata'] ?? null) ? $claims['user_metadata'] : [];
    $name = sanitize(
        (string)($metadata['full_name'] ?? $metadata['name'] ?? ($email !== '' ? explode('@', $email)[0] : 'بەکارهێنەری نوێ')),
        100
    );
    $avatar = sanitize((string)($metadata['avatar_url'] ?? $metadata['picture'] ?? ''), 800000);

    // 1. Already signed in with this provider before?
    $stmt = $pdo->prepare('SELECT * FROM users WHERE supabase_user_id = ?');
    $stmt->execute([$supabaseUserId]);
    $user = $stmt->fetch();

    // 2. First time — but a phone-based account already exists with this
    // same (provider-verified) email. Link rather than duplicate.
    if (!$user && $email !== '') {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND supabase_user_id IS NULL');
        $stmt->execute([$email]);
        $existing = $stmt->fetch();
        if ($existing) {
            $pdo->prepare('UPDATE users SET supabase_user_id = ?, auth_provider = ? WHERE id = ?')
                ->execute([$supabaseUserId, $provider, $existing['id']]);
            $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
            $stmt->execute([$existing['id']]);
            $user = $stmt->fetch();
        }
    }

    // 3. Genuinely new person.
    $isNewUser = false;
    if (!$user) {
        $isNewUser = true;
        $userId  = 'usr_' . time() . rand(10, 99);
        $refCode = 'ISHK-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
        // Social sign-up always starts as 'freelancer' below — role is picked
        // properly later, during RegisterProfileChoicePage's "complete your
        // profile" step.
        $primaryFree = getPrimaryFreePlan($pdo, 'freelancer');

        $pdo->prepare('
            INSERT INTO users (
                id, name, phone, email, password, role, avatar,
                wallet_balance, ref_code, status, supabase_user_id, auth_provider, plan, plan_credits, created_at
            ) VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $userId, $name, $email !== '' ? $email : null, 'freelancer', $avatar,
            25000, $refCode, 'active', $supabaseUserId, $provider,
            $primaryFree['id'] ?? null, (int)($primaryFree['credits'] ?? 0),
            date('Y-m-d H:i:s'),
        ]);

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
    }

    if (($user['status'] ?? 'active') === 'blocked' || ($user['status'] ?? 'active') === 'frozen') {
        jsonErr(403, 'هەژمارەکەت ڕاگیراوە (بلۆككراوە).');
    }

    echo json_encode([
        'success' => true,
        'token'   => generateToken($user['id'], $user['phone'] ?? ''),
        'user'    => [
            'id'             => $user['id'],
            'name'           => $user['name'],
            'phone'          => $user['phone'],
            'email'          => $user['email'],
            'role'           => $user['role'],
            'gender'         => $user['gender'],
            'governorate'    => $user['governorate'],
            'district'       => $user['district'],
            'sub_district'   => $user['sub_district'],
            'bio'            => $user['bio'],
            'avatar'         => $user['avatar'],
            'cover'          => $user['cover'],
            'company_name'   => $user['company_name'],
            'company_reg'    => $user['company_reg'],
            'company_phone'  => $user['company_phone'],
            'company_email'  => $user['company_email'],
            'industry'       => $user['industry'],
            'company_size'   => $user['company_size'] ?? null,
            'company_type'   => $user['company_type'] ?? null,
            'company_logo'   => $user['company_logo'] ?? null,
            'company_cover'  => $user['company_cover'] ?? null,
            'hiring_preferences' => $user['hiring_preferences'] ?? '{}',
            'favorite_categories' => $user['favorite_categories'] ?? '[]',
            'saved_jobs'     => $user['saved_jobs'] ?? '[]',
            'experience'     => $user['experience'] ?? '[]',
            'skills'         => $user['skills'] ?? '[]',
            'status'         => $user['status'] ?? 'active',
            'wallet_balance' => (int)$user['wallet_balance'],
            'ref_code'         => $user['ref_code'] ?? null,
            'verified'         => (int)($user['verified'] ?? 0),
            'plan'             => $user['plan'] ?? 'free',
            'plan_credits'     => (int)($user['plan_credits'] ?? 0),
            'plan_boost_until' => $user['plan_boost_until'] ?? null,
            'authProvider'     => $user['auth_provider'] ?? 'password',
            'created_at'       => $user['created_at'] ?? null,
        ],
        'isNewUser' => $isNewUser,
    ]);
    exit(0);
}

// ================================================================
// 3b. OAuth: Authorize  POST /oauth/authorize  (requires token — the logged-in
// user confirming the connection, not the client app)
// { client_id, redirect_uri } -> { code }
// ================================================================
// 3b. OAuth: Authorize  POST /oauth/authorize  (requires token — the logged-in
// user confirming the connection, not the client app)
// { client_id, redirect_uri } -> { code }
// ================================================================
if (preg_match('#/oauth/authorize$#', $uri) && $method === 'POST') {
    $user = requireAuth($pdo);
    $input = safeJson();
    $clientId = sanitize($input['client_id'] ?? '', 50);
    $redirectUri = sanitize($input['redirect_uri'] ?? '', 255);

    $client = OAUTH_CLIENTS[$clientId] ?? null;
    if (!$client) jsonErr(400, 'Unknown client.');

    $isAllowedUri = in_array($redirectUri, $client['redirect_uris'], true);
    if (!$isAllowedUri) {
        $parsedTarget = parse_url($redirectUri);
        foreach ($client['redirect_uris'] as $allowedUri) {
            $parsedAllowed = parse_url($allowedUri);
            if (($parsedTarget['host'] ?? '') === ($parsedAllowed['host'] ?? '') && ($parsedTarget['path'] ?? '') === ($parsedAllowed['path'] ?? '')) {
                $isAllowedUri = true;
                break;
            }
        }
    }
    if (!$isAllowedUri) jsonErr(400, 'Invalid redirect URI.');

    $code = bin2hex(random_bytes(32));
    $now = date('Y-m-d H:i:s');
    $expires = date('Y-m-d H:i:s', time() + 300); // 5 minutes

    // Clean up any old unused codes for this user+client
    $pdo->prepare('DELETE FROM oauth_codes WHERE user_id = ? AND client_id = ?')->execute([$user['id'], $clientId]);

    $pdo->prepare('INSERT INTO oauth_codes (code, user_id, client_id, redirect_uri, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$code, $user['id'], $clientId, $redirectUri, $now, $expires]);

    echo json_encode(['success' => true, 'code' => $code]);
    exit(0);
}

// ================================================================
// 3c. OAuth: Token Exchange  POST /oauth/token  (server-to-server —
// authenticated by client_id + client_secret, NOT a user token)
// { client_id, client_secret, code, redirect_uri } -> { token, user }
// ================================================================
if (preg_match('#/oauth/token$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'oauth_token')) jsonErr(429, 'Too many requests.');
    $input = safeJson();
    $clientId = sanitize($input['client_id'] ?? '', 50);
    $clientSecret = trim($input['client_secret'] ?? '');
    $redirectUri = sanitize($input['redirect_uri'] ?? '', 255);
    $code = sanitize($input['code'] ?? '', 64);

    $client = OAUTH_CLIENTS[$clientId] ?? null;
    if (!$client || !hash_equals($client['secret'], $clientSecret)) jsonErr(401, 'Invalid client credentials.');

    // Look up the code by code and client_id
    $stmt = $pdo->prepare('SELECT * FROM oauth_codes WHERE code = ? AND client_id = ?');
    $stmt->execute([$code, $clientId]);
    $authCode = $stmt->fetch();
    if (!$authCode || $authCode['used'] || strtotime($authCode['expires_at']) < time()) {
        jsonErr(400, 'Invalid, expired, or already-used code.');
    }
    $pdo->prepare('UPDATE oauth_codes SET used = 1 WHERE code = ?')->execute([$code]);

    $userStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $userStmt->execute([$authCode['user_id']]);
    $user = $userStmt->fetch();
    if (!$user) jsonErr(404, 'Account no longer exists.');

    // Only ever the fields the connect screen actually disclosed (name,
    // phone, plan) — email used to ride along here too despite never being
    // shown to the user or read by Karnama's own linking code.
    echo json_encode([
        'success' => true,
        'token'   => generateToken($user['id'], (string)($user['phone'] ?? $user['email'] ?? $user['id'])),
        'user'    => [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'phone' => $user['phone'] ?? '',
            'plan'  => $user['plan'] ?? 'free',
        ],
    ]);
    exit(0);
}

// ================================================================
// 3d. Zera Console: Read-only Stats  GET /console/stats?token=...
// ================================================================
if (preg_match('#/console/stats$#', $uri) && $method === 'GET') {
    $token = $_GET['token'] ?? '';
    if (!hash_equals(CONSOLE_STATS_TOKEN, $token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit(0);
    }

    $userCount = (int)$pdo->query('SELECT COUNT(*) c FROM users')->fetch()['c'];
    $freelancerCount = (int)$pdo->query("SELECT COUNT(*) c FROM users WHERE role = 'freelancer'")->fetch()['c'];
    $employerCount = (int)$pdo->query("SELECT COUNT(*) c FROM users WHERE role = 'employer'")->fetch()['c'];
    $jobCount = (int)$pdo->query("SELECT COUNT(*) c FROM jobs WHERE status = 'active'")->fetch()['c'];
    $applicationCount = (int)$pdo->query('SELECT COUNT(*) c FROM applications')->fetch()['c'];
    $applicationRevenue = (int)$pdo->query("SELECT COALESCE(SUM(fee_paid),0) c FROM applications WHERE payment_status = 'approved'")->fetch()['c'];
    $planRevenue = (int)$pdo->query("SELECT COALESCE(SUM(price),0) c FROM plan_purchases WHERE status = 'approved'")->fetch()['c'];
    $pendingPayouts = (int)$pdo->query("SELECT COUNT(*) c FROM applications WHERE payment_status = 'pending'")->fetch()['c'];

    $recent = $pdo->query('SELECT job_title, company_name, created_at FROM applications ORDER BY created_at DESC LIMIT 5')->fetchAll();

    header('Access-Control-Allow-Origin: https://zeraworld.com');
    header('Cache-Control: no-store');
    echo json_encode([
        'userCount' => $userCount,
        'freelancerCount' => $freelancerCount,
        'employerCount' => $employerCount,
        'jobCount' => $jobCount,
        'applicationCount' => $applicationCount,
        'revenue' => $applicationRevenue + $planRevenue,
        'pendingPayouts' => $pendingPayouts,
        'recentActivity' => $recent,
    ]);
    exit(0);
}

// ================================================================
// 3e. Zera Console: Full Admin-Panel Aggregate Feed  GET /console/ishkhwaz-panel?token=...
// Same token/trust model as /console/stats above — aggregate-only, no PII
// (no phone/email/wallet, no per-user rows). Individual-record management
// (block a user, edit a job, answer a support message) stays in the real,
// role-gated admin app at ishkhwaz.zeraworld.com/admin; this feed only
// powers the read-only analytics view embedded in the Zera Group console.
// ================================================================
if (preg_match('#/console/ishkhwaz-panel$#', $uri) && $method === 'GET') {
    $token = $_GET['token'] ?? '';
    if (!hash_equals(CONSOLE_STATS_TOKEN, $token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit(0);
    }

    // Revenue by month — last 12 months, application fees + plan purchases, both approved-only.
    $revRows = $pdo->query("
        SELECT DATE_FORMAT(verified_at, '%Y-%m') ym, SUM(fee_paid) amt
        FROM applications WHERE payment_status = 'approved' AND verified_at IS NOT NULL AND verified_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY ym
    ")->fetchAll(PDO::FETCH_KEY_PAIR);
    $planRevRows = $pdo->query("
        SELECT DATE_FORMAT(verified_at, '%Y-%m') ym, SUM(price) amt
        FROM plan_purchases WHERE status = 'approved' AND verified_at IS NOT NULL AND verified_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY ym
    ")->fetchAll(PDO::FETCH_KEY_PAIR);
    $revenueByMonth = [];
    for ($i = 11; $i >= 0; $i--) {
        $ym = date('Y-m', strtotime("-$i months"));
        $revenueByMonth[] = ['month' => $ym, 'amount' => (int)($revRows[$ym] ?? 0) + (int)($planRevRows[$ym] ?? 0)];
    }

    // Leaderboard — top 5 freelancers by total revenue generated (their own app fees + plan purchases).
    $leaders = $pdo->query("
        SELECT u.id, u.name, u.governorate,
               COALESCE(a.total, 0) + COALESCE(p.total, 0) AS revenue,
               (SELECT j.category FROM applications a2 JOIN jobs j ON j.id = a2.job_id WHERE a2.freelancer_id = u.id GROUP BY j.category ORDER BY COUNT(*) DESC LIMIT 1) AS top_category,
               (SELECT COUNT(*) FROM applications a3 WHERE a3.freelancer_id = u.id) AS applied_count,
               (SELECT COUNT(*) FROM applications a4 WHERE a4.freelancer_id = u.id AND a4.status = 'accepted') AS accepted_count
        FROM users u
        LEFT JOIN (SELECT freelancer_id, SUM(fee_paid) total FROM applications WHERE payment_status = 'approved' GROUP BY freelancer_id) a ON a.freelancer_id = u.id
        LEFT JOIN (SELECT user_id, SUM(price) total FROM plan_purchases WHERE status = 'approved' GROUP BY user_id) p ON p.user_id = u.id
        WHERE u.role = 'freelancer'
        ORDER BY revenue DESC LIMIT 5
    ")->fetchAll();
    foreach ($leaders as &$l) {
        $l['revenue'] = (int)$l['revenue'];
        $l['rate'] = $l['applied_count'] > 0 ? round(100 * $l['accepted_count'] / $l['applied_count']) : 0;
    }
    unset($l);

    // City distribution — real governorate counts across freelancers + employers.
    $cityDist = $pdo->query("SELECT governorate, COUNT(*) c FROM users WHERE role IN ('freelancer','employer') GROUP BY governorate ORDER BY c DESC")->fetchAll();

    // Plan tiers with real subscriber counts + real revenue.
    $plans = $pdo->query("
        SELECT t.id, t.name_ku, t.name_en, t.price, t.credits, t.boost_days,
               (SELECT COUNT(*) FROM users u WHERE u.plan = t.id) AS subs,
               COALESCE((SELECT SUM(price) FROM plan_purchases pp WHERE pp.plan = t.id AND pp.status = 'approved'), 0) AS revenue
        FROM plan_tiers t WHERE t.is_active = 1 ORDER BY t.sort_order ASC, t.price ASC
    ")->fetchAll();

    // Database table sizes — real, from information_schema (works cross-DB without a COUNT(*) per table).
    $dbTables = $pdo->query("
        SELECT table_name AS `name`, table_rows AS `rows`, ROUND((data_length + index_length) / 1024) AS size_kb
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE() AND table_name IN ('users','jobs','applications','plan_purchases','plan_tiers','categories','push_notifications','messages')
        ORDER BY (data_length + index_length) DESC
    ")->fetchAll();
    $dbTotalKb = 0;
    foreach ($dbTables as $t) $dbTotalKb += (int)$t['size_kb'];

    // Needs-attention queue — real pending items, not a fabricated backlog.
    $pendingApps = (int)$pdo->query("SELECT COUNT(*) c FROM applications WHERE payment_status = 'pending'")->fetch()['c'];
    $pendingAppsOld = (int)$pdo->query("SELECT COUNT(*) c FROM applications WHERE payment_status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)")->fetch()['c'];
    $pendingPlans = $pdo->query("SELECT COUNT(*) c, COALESCE(SUM(price),0) amt FROM plan_purchases WHERE status = 'pending'")->fetch();

    // Plan-purchase funnel — real counts by status, not page-view analytics we don't track.
    $funnel = $pdo->query("SELECT status, COUNT(*) c FROM plan_purchases GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);

    header('Access-Control-Allow-Origin: https://zeraworld.com');
    header('Cache-Control: no-store');
    echo json_encode([
        'revenueByMonth' => $revenueByMonth,
        'leaders' => $leaders,
        'cityDist' => $cityDist,
        'plans' => $plans,
        'dbTables' => $dbTables,
        'dbTotalKb' => $dbTotalKb,
        'pendingApplications' => $pendingApps,
        'pendingApplicationsOver48h' => $pendingAppsOld,
        'pendingPlanPurchases' => (int)$pendingPlans['c'],
        'pendingPlanPurchasesAmount' => (int)$pendingPlans['amt'],
        'planFunnel' => [
            'requested' => array_sum($funnel),
            'pending' => (int)($funnel['pending'] ?? 0),
            'approved' => (int)($funnel['approved'] ?? 0),
            'rejected' => (int)($funnel['rejected'] ?? 0),
        ],
    ]);
    exit(0);
}

// ================================================================
// 3f. Zera Console SSO: Mint a real owner session  POST /admin/console-token
// Server-to-server only (console-api calls this, never a browser) — proves
// identity purely by possessing CONSOLE_ADMIN_MINT_SECRET, then issues a
// real, normal session token for the platform's owner account.
// ================================================================
if (preg_match('#/admin/console-token$#', $uri) && $method === 'POST') {
    $headers = getallheaders();
    $secret = str_replace('Bearer ', '', $headers['Authorization'] ?? $headers['authorization'] ?? '');
    if (!hash_equals(CONSOLE_ADMIN_MINT_SECRET, $secret)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit(0);
    }

    $owner = $pdo->query("SELECT * FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1")->fetch();
    if (!$owner) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No owner account exists.']);
        exit(0);
    }

    echo json_encode([
        'success' => true,
        'token' => generateToken($owner['id'], $owner['phone']),
        'user' => [
            'id' => $owner['id'],
            'name' => $owner['name'],
            'phone' => $owner['phone'],
            'role' => $owner['role'],
        ],
    ]);
    exit(0);
}

// ================================================================
// 4. Auth: Get Own Profile  GET /auth/me  (requires token)
// ================================================================
if (preg_match('#/auth/me$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    echo json_encode([
        'success' => true,
        'user'    => [
            'id'             => $authUser['id'],
            'name'           => $authUser['name'],
            'phone'          => $authUser['phone'],
            'email'          => $authUser['email'],
            'role'           => $authUser['role'],
            'gender'         => $authUser['gender'],
            'governorate'    => $authUser['governorate'],
            'district'       => $authUser['district'],
            'sub_district'   => $authUser['sub_district'],
            'bio'            => $authUser['bio'],
            'avatar'         => $authUser['avatar'],
            'cover'          => $authUser['cover'],
            'company_name'   => $authUser['company_name'],
            'company_reg'    => $authUser['company_reg'],
            'company_phone'  => $authUser['company_phone'],
            'company_email'  => $authUser['company_email'],
            'industry'       => $authUser['industry'],
            'company_size'   => $authUser['company_size'] ?? null,
            'company_type'   => $authUser['company_type'] ?? null,
            'company_logo'   => $authUser['company_logo'] ?? null,
            'company_cover'  => $authUser['company_cover'] ?? null,
            'hiring_preferences' => $authUser['hiring_preferences'] ?? '{}',
            'favorite_categories' => $authUser['favorite_categories'] ?? '[]',
            'saved_jobs'     => $authUser['saved_jobs'] ?? '[]',
            'experience'     => $authUser['experience'] ?? '[]',
            'skills'         => $authUser['skills'] ?? '[]',
            'status'         => $authUser['status'] ?? 'active',
            'wallet_balance' => (int)$authUser['wallet_balance'],
            'ref_code'       => $authUser['ref_code'] ?? null,
            'verified'       => (int)($authUser['verified'] ?? 0),
            'profile_views'  => (int)($authUser['profile_views'] ?? 0),
            'plan'             => $authUser['plan'] ?? 'free',
            'plan_credits'     => (int)($authUser['plan_credits'] ?? 0),
            'plan_boost_until' => $authUser['plan_boost_until'] ?? null,
            'created_at'       => $authUser['created_at'] ?? null,
        ]
    ]);
    exit(0);
}

// ================================================================
// 5. Auth: Update Own Profile  POST /auth/me  (requires token)
// ================================================================
if (preg_match('#/auth/me$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'update_profile')) jsonErr(429, 'Too many requests.');

    $authUser = requireAuth($pdo); // Validates token — only the owner can update themselves
    $input    = safeJson();

    $name        = sanitize($input['name']        ?? $authUser['name'],        100);
    $email       = sanitize($input['email']       ?? $authUser['email'] ?? '', 150);
    $governorate = sanitize($input['governorate'] ?? $authUser['governorate'], 100);
    $district    = sanitize($input['district']    ?? $authUser['district'],    100);
    $subDistrict = sanitize($input['sub_district'] ?? $authUser['sub_district'], 100);
    $bio         = sanitize($input['bio']         ?? $authUser['bio'] ?? '',   500);
    $avatar      = sanitize($input['avatar']      ?? $authUser['avatar'] ?? '', 800000);
    $cover       = sanitize($input['cover']       ?? $authUser['cover'] ?? '', 800000);
    $gender      = in_array($input['gender'] ?? '', ['male', 'female']) ? $input['gender'] : $authUser['gender'];

    // Freelancer-only extras: skills, favorite categories, saved jobs, work experience/portfolio
    $skills = $input['skills'] ?? null;
    if (is_array($skills)) $skills = json_encode(array_values($skills));
    if (!is_string($skills)) $skills = $authUser['skills'] ?? '[]';

    $favCats = $input['favorite_categories'] ?? null;
    if (is_array($favCats)) $favCats = json_encode(array_values($favCats));
    if (!is_string($favCats)) $favCats = $authUser['favorite_categories'] ?? '[]';

    $savedJobs = $input['saved_jobs'] ?? null;
    if (is_array($savedJobs)) $savedJobs = json_encode(array_values($savedJobs));
    if (!is_string($savedJobs)) $savedJobs = $authUser['saved_jobs'] ?? '[]';

    $experience = $input['experience'] ?? null;
    if (is_array($experience)) $experience = json_encode(array_values($experience));
    if (!is_string($experience)) $experience = $authUser['experience'] ?? '[]';

    // Self-service freelancer/employer toggle only — admin/owner stays reachable
    // only via /admin/users/update, gated to an owner. Mainly here so a fresh
    // Google/Facebook/Apple sign-up (created with the default role, since there
    // was no registration form to pick one) can actually choose freelancer vs
    // employer when they finish their profile.
    $role = in_array($input['role'] ?? '', ['freelancer', 'employer'], true) ? $input['role'] : $authUser['role'];

    $companyName     = sanitize($input['company_name']     ?? $authUser['company_name']     ?? '', 200);
    $companyReg      = sanitize($input['company_reg']      ?? $authUser['company_reg']      ?? '', 100);
    $companyPhone    = sanitize($input['company_phone']    ?? $authUser['company_phone']    ?? '', 30);
    $companyEmail    = sanitize($input['company_email']    ?? $authUser['company_email']    ?? '', 150);
    $industry        = sanitize($input['industry']         ?? $authUser['industry']         ?? '', 100);
    $companySize     = in_array($input['company_size'] ?? '', ['small', 'medium', 'large'], true) ? $input['company_size'] : ($authUser['company_size'] ?? null);
    $companyType     = in_array($input['company_type'] ?? '', ['sole_proprietor', 'partnership', 'government', 'private'], true) ? $input['company_type'] : ($authUser['company_type'] ?? null);
    // Deliberately separate from avatar (personal photo) — this is the
    // business's own brand mark, shown on job listings/dashboard/public
    // company page instead.
    $companyLogo     = sanitize($input['company_logo'] ?? $authUser['company_logo'] ?? '', 800000);
    // Same separation as company_logo — the business's own background photo,
    // independent of `cover` (the account holder's personal profile background).
    $companyCover    = sanitize($input['company_cover'] ?? $authUser['company_cover'] ?? '', 800000);
    $hiringPrefs     = $input['hiring_preferences'] ?? null;
    if (is_array($hiringPrefs)) $hiringPrefs = json_encode($hiringPrefs, JSON_UNESCAPED_UNICODE);
    if (!is_string($hiringPrefs)) $hiringPrefs = $authUser['hiring_preferences'] ?? '{}';

    $pdo->prepare('
        UPDATE users SET
            name = ?, email = ?, governorate = ?, district = ?, sub_district = ?,
            bio = ?, avatar = ?, cover = ?, gender = ?, skills = ?,
            favorite_categories = ?, saved_jobs = ?, experience = ?, role = ?,
            company_name = ?, company_reg = ?, company_phone = ?, company_email = ?, industry = ?,
            company_size = ?, company_type = ?, hiring_preferences = ?, company_logo = ?, company_cover = ?
        WHERE id = ?
    ')->execute([
        $name, $email, $governorate, $district, $subDistrict, $bio, $avatar, $cover, $gender, $skills,
        $favCats, $savedJobs, $experience, $role,
        $companyName, $companyReg, $companyPhone, $companyEmail, $industry,
        $companySize, $companyType, $hiringPrefs, $companyLogo, $companyCover,
        $authUser['id'],
    ]);

    // An employer's logo/cover is really one account-level identity, not a
    // per-job setting — so a change here (e.g. from the profile page) also
    // updates every job already posted, exactly like CompanyBrandingModal's
    // manual "apply to all" button does, just automatic. Only touches the
    // fields that actually changed, so per-job customization done via that
    // modal isn't clobbered on an unrelated profile save (e.g. editing bio).
    if ($role === 'employer') {
        $logoChanged  = $companyLogo  !== ($authUser['company_logo']  ?? '');
        $coverChanged = $companyCover !== ($authUser['company_cover'] ?? '');
        if ($logoChanged || $coverChanged) {
            $sets = [];
            $vals = [];
            if ($logoChanged)  { $sets[] = 'company_logo = ?'; $vals[] = $companyLogo; }
            if ($coverChanged) { $sets[] = 'company_cover = ?'; $vals[] = $companyCover; }
            $vals[] = $authUser['id'];
            $pdo->prepare('UPDATE jobs SET ' . implode(', ', $sets) . ' WHERE company_id = ?')->execute($vals);
        }
    }

    $updated = $pdo->prepare('SELECT id, name, phone, email, role, gender, governorate, district, sub_district, bio, avatar, cover, status, wallet_balance, skills, favorite_categories, saved_jobs, experience, company_name, company_reg, company_phone, company_email, industry, company_size, company_type, hiring_preferences, company_logo, company_cover, created_at FROM users WHERE id = ?');
    $updated->execute([$authUser['id']]);

    echo json_encode(['success' => true, 'message' => 'پرۆفایلەکەت نوێکرایەوە.', 'user' => $updated->fetch()]);
    exit(0);
}

// ================================================================
// 5. Jobs: List  GET /jobs
// ================================================================
if (preg_match('#/jobs$#', $uri) && $method === 'GET') {
    // Lazy auto-archive — no cron on this host, so a job past its own real
    // deadline is swept to 'closed' the moment anyone next asks for the list.
    // String-prefix comparison, not a date cast — `deadline` is client-supplied and not
    // guaranteed to be in a format MySQL's date functions can parse; a plain ISO-format
    // (YYYY-MM-DD...) prefix compares correctly lexicographically either way, and just
    // silently skips (rather than errors on) anything malformed, same as before.
    $pdo->exec("UPDATE jobs SET status = 'closed' WHERE status = 'active' AND deadline IS NOT NULL AND deadline != '' AND LEFT(deadline, 10) < DATE_FORMAT(CURDATE(), '%Y-%m-%d')");

    // Optional auth — a guest (or anyone) still gets every active job. An
    // authenticated employer also sees their OWN pending/rejected jobs (so
    // "my jobs" in their dashboard doesn't just silently drop a posting
    // while it's awaiting review); admin/owner sees every job regardless
    // of status, since they're the ones who need to review the queue.
    $jobAuthUser = optionalAuthUser($pdo);

    $where = 'j.status = \'active\'';
    $params = [];
    if ($jobAuthUser) {
        if (in_array($jobAuthUser['role'] ?? '', ['admin', 'owner'], true)) {
            $where = '1=1';
        } elseif (($jobAuthUser['role'] ?? '') === 'employer') {
            $where = '(j.status = \'active\' OR j.company_id = ?)';
            $params[] = $jobAuthUser['id'];
        }
    }

    $stmt = $pdo->prepare(
        "SELECT j.*,
                (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applications_count,
                (SELECT verified FROM users u WHERE u.id = j.company_id) AS company_verified,
                (SELECT ROUND(AVG(TIMESTAMPDIFF(SECOND, a.created_at, a.accepted_at) / 3600), 1)
                   FROM applications a WHERE a.company_id = j.company_id AND a.accepted_at IS NOT NULL) AS company_avg_response_hours
         FROM jobs j WHERE {$where}
         ORDER BY (j.boosted_until IS NOT NULL AND j.boosted_until > NOW()) DESC, j.created_at DESC"
    );
    $stmt->execute($params);
    $jobs = $stmt->fetchAll();
    echo json_encode(['success' => true, 'count' => count($jobs), 'jobs' => $jobs]);
    exit(0);
}

// ================================================================
// 5b. Share previews — GET /share/job/{id} and GET /share/company/{id}.
// No auth (link-preview crawlers never send an Authorization header).
// A social-media/messaging crawler (WhatsApp, Telegram, Facebook, X, ...)
// gets a tiny static HTML page with real per-item Open Graph tags, since
// this app is a client-rendered SPA and index.html only ever has one fixed
// generic card otherwise. A real visitor (anything not on the crawler list)
// gets redirected straight into the actual app at the same deep link the
// share buttons already build client-side.
// ================================================================
function isLinkPreviewCrawler(): bool {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if ($ua === '') return false;
    $bots = ['facebookexternalhit', 'Facebot', 'WhatsApp', 'TelegramBot', 'Twitterbot',
              'LinkedInBot', 'Slackbot', 'Discordbot', 'redditbot', 'Pinterest',
              'SkypeUriPreview', 'vkShare', 'Googlebot', 'bingbot'];
    foreach ($bots as $b) if (stripos($ua, $b) !== false) return true;
    return false;
}

function renderSharePreview(string $title, string $description, string $image, string $humanUrl): void {
    $esc = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8">'
        . '<meta property="og:type" content="website">'
        . '<meta property="og:title" content="' . $esc($title) . '">'
        . '<meta property="og:description" content="' . $esc($description) . '">'
        . '<meta property="og:image" content="' . $esc($image) . '">'
        . '<meta property="og:url" content="' . $esc($humanUrl) . '">'
        . '<meta name="twitter:card" content="summary_large_image">'
        . '<meta name="twitter:title" content="' . $esc($title) . '">'
        . '<meta name="twitter:description" content="' . $esc($description) . '">'
        . '<meta name="twitter:image" content="' . $esc($image) . '">'
        . '<title>' . $esc($title) . '</title></head>'
        . '<body><a href="' . $esc($humanUrl) . '">' . $esc($title) . '</a></body></html>';
}

$origin = (($_SERVER['HTTPS'] ?? '') !== '' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'ishkhwaz.zeraworld.com');
$defaultShareImage = $origin . '/icon-512x512-v2.png';

// Logos/covers are stored as inline base64 data: URIs (no real image
// hosting in this app), which og:image cannot use at all — crawlers need
// a real fetchable HTTP(S) URL, so a data: URI here means "no usable image."
function realImageUrlOrFallback(?string $img, string $fallback): string {
    if ($img && stripos($img, 'data:') !== 0) return $img;
    return $fallback;
}

if (preg_match('#/share/job/([^/]+)$#', $uri, $m) && $method === 'GET') {
    $jobId = $m[1];
    $stmt = $pdo->prepare('SELECT title_ku, description, company_name, company_logo FROM jobs WHERE id = ?');
    $stmt->execute([$jobId]);
    $job = $stmt->fetch();
    if (!$job) { http_response_code(404); echo 'Job not found'; exit(0); }

    $title = ($job['title_ku'] ?: 'هەلی کار') . ' — ' . ($job['company_name'] ?: 'ئیش خواز');
    $desc = mb_substr($job['description'] ?: 'بینینی وردەکاری ئەم هەلی کارە لە ئیش خواز.', 0, 200);
    $image = realImageUrlOrFallback($job['company_logo'], $defaultShareImage);
    $humanUrl = $origin . '/search?company=' . urlencode($job['company_name'] ?: '') . '&job=' . urlencode($jobId);

    if (isLinkPreviewCrawler()) {
        renderSharePreview($title, $desc, $image, $humanUrl);
    } else {
        header('Location: ' . $humanUrl, true, 302);
    }
    exit(0);
}

if (preg_match('#/share/company/([^/]+)$#', $uri, $m) && $method === 'GET') {
    $companyId = $m[1];
    $stmt = $pdo->prepare("SELECT company_name, company_logo, company_cover, industry FROM users WHERE id = ? AND role = 'employer'");
    $stmt->execute([$companyId]);
    $company = $stmt->fetch();
    if (!$company) { http_response_code(404); echo 'Company not found'; exit(0); }

    $title = $company['company_name'] ?: 'کۆمپانیا لە ئیش خواز';
    $desc = $company['industry'] ? "کۆمپانیایەک لە بواری {$company['industry']} — بینینی هەلی کارەکانیان لە ئیش خواز." : 'بینینی پرۆفایل و هەلی کارەکانی ئەم کۆمپانیایە لە ئیش خواز.';
    $image = realImageUrlOrFallback($company['company_cover'] ?: $company['company_logo'], $defaultShareImage);
    $humanUrl = $origin . '/search?company=' . urlencode($company['company_name'] ?: '');

    if (isLinkPreviewCrawler()) {
        renderSharePreview($title, $desc, $image, $humanUrl);
    } else {
        header('Location: ' . $humanUrl, true, 302);
    }
    exit(0);
}

// ================================================================
// 6. Jobs: Create  POST /jobs  (requires token, employer only)
// ================================================================
if (preg_match('#/jobs$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    if ($authUser['role'] !== 'employer' && $authUser['role'] !== 'admin' && $authUser['role'] !== 'owner') {
        jsonErr(403, 'تەنها ئیشدەران دەتوانن کار بنووسن.');
    }

    $input  = safeJson();
    $jobId  = 'job_' . time() . rand(10, 99);

    // Skills: accept array or JSON string
    $skills = $input['required_skills'] ?? '[]';
    if (is_array($skills)) $skills = json_encode($skills);
    if (!is_string($skills)) $skills = '[]';

    $pdo->prepare('
        INSERT INTO jobs (
            id, company_id, company_name, company_logo, company_cover, company_phone, company_email,
            title_ku, category, job_type, workplace_type,
            governorate_id, location_detail, location_name, lat, lng,
            salary_min, salary_max, salary_period,
            description, required_skills, fee_amount, deadline,
            company_reg, company_industry,
            status, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?
        )
    ')->execute([
        $jobId,
        $authUser['id'],
        sanitize(firstNonEmpty($input['company_name'] ?? null, $authUser['company_name'] ?? null, $authUser['name'] ?? null), 200),
        sanitize(firstNonEmpty($input['company_logo'] ?? null, $input['photo'] ?? null, $authUser['company_logo'] ?? null, $authUser['avatar'] ?? null), 800000),
        sanitize(firstNonEmpty($input['company_cover'] ?? null, $authUser['company_cover'] ?? null, $authUser['cover'] ?? null), 800000),
        sanitize($input['company_phone'] ?? $authUser['phone'] ?? '', 30),
        sanitize($input['company_email'] ?? $authUser['email'] ?? '', 150),
        sanitize($input['title_ku'] ?? $input['title'] ?? 'کاری نوێ', 200),
        sanitize($input['category'] ?? 'cat_other', 50),
        in_array($input['job_type'] ?? '', ['fullTime','partTime','contract','internship','remote'], true) ? $input['job_type'] : 'fullTime',
        in_array($input['workplace_type'] ?? '', ['onSite','remote','hybrid'], true) ? $input['workplace_type'] : 'onSite',
        sanitize($input['governorate_id'] ?? 'sulaymaniyah', 50),
        sanitize($input['location_detail'] ?? '', 300),
        sanitize($input['location_name'] ?? '', 300),
        isset($input['lat']) && is_numeric($input['lat']) ? (float)$input['lat'] : null,
        isset($input['lng']) && is_numeric($input['lng']) ? (float)$input['lng'] : null,
        (int)($input['salary_min'] ?? 500000),
        (int)($input['salary_max'] ?? 1200000),
        'monthly',
        sanitize($input['description'] ?? '', 3000),
        $skills,
        (int)($input['fee_amount'] ?? getSetting($pdo, 'cv_fee_amount', '2500')),
        !empty($input['deadline']) ? sanitize($input['deadline'], 20) : null,
        sanitize($input['company_reg'] ?? '', 100),
        sanitize($input['company_industry'] ?? '', 100),
        // A regular employer's posting waits for admin review before it's
        // visible to anyone browsing; admin/owner posting one themselves
        // (they're the approver) skips the queue — there's no one else to
        // approve it and no reason to make them self-approve.
        in_array($authUser['role'] ?? '', ['admin', 'owner'], true) ? 'active' : 'pending',
        date('Y-m-d H:i:s'),
    ]);

    if (in_array($authUser['role'] ?? '', ['admin', 'owner'], true)) {
        notifyAdmins($pdo, 'job_created', ['id' => $jobId, 'company_id' => $authUser['id']]);
    } else {
        notifyAdmins($pdo, 'job_pending_review', ['id' => $jobId, 'company_id' => $authUser['id']]);
    }

    // Real alert fan-out — only to freelancers/saved-searches that actually match.
    $newJobForAlerts = [
        'title_ku' => $input['title_ku'] ?? $input['title'] ?? 'کاری نوێ',
        'company_name' => $input['company_name'] ?? $authUser['company_name'] ?? $authUser['name'],
        'category' => $input['category'] ?? 'cat_other',
        'job_type' => in_array($input['job_type'] ?? '', ['fullTime','partTime','contract','internship','remote'], true) ? $input['job_type'] : 'fullTime',
        'governorate_id' => $input['governorate_id'] ?? 'sulaymaniyah',
        'salary_min' => (int)($input['salary_min'] ?? 500000),
        'required_skills' => $skills,
    ];
    notifyMatchingFreelancers($pdo, $newJobForAlerts);
    notifyMatchingSavedSearches($pdo, $newJobForAlerts);

    echo json_encode(['success' => true, 'job_id' => $jobId, 'message' => 'ئیشەکە بە سەرکەوتوویی بڵاوکرایەوە!']);
    exit(0);
}

// ================================================================
// 6b. Jobs: Update  POST /jobs/update  (owner employer, or admin/owner)
// ================================================================
// Negative lookbehind excludes /admin/jobs/update — without it this unanchored
// pattern also matches that route (since it too ends in "/jobs/update"), and
// being checked first here would silently swallow every admin edit request,
// applying only this handler's narrower field set (no `status`, e.g.) instead
// of ever reaching /admin/jobs/update's full one.
if (preg_match('#(?<!admin)/jobs/update$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $jobId = sanitize($input['id'] ?? $input['job_id'] ?? '', 50);
    if (empty($jobId)) jsonErr(400, 'Job ID required.');

    $existing = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $existing->execute([$jobId]);
    $existing = $existing->fetch();
    if (!$existing) jsonErr(404, 'ئیشەکە نەدۆزرایەوە.');

    $isOwner = $existing['company_id'] === $authUser['id'];
    $isAdmin = in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if (!$isOwner && !$isAdmin) jsonErr(403, 'تەنها کۆمپانیاکە دەتوانێت ئەم کارە بگۆڕێت.');

    $skills = $input['required_skills'] ?? $existing['required_skills'];
    if (is_array($skills)) $skills = json_encode($skills);
    if (!is_string($skills)) $skills = $existing['required_skills'];

    $lat = isset($input['lat']) && is_numeric($input['lat']) ? (float)$input['lat'] : $existing['lat'];
    $lng = isset($input['lng']) && is_numeric($input['lng']) ? (float)$input['lng'] : $existing['lng'];

    $pdo->prepare('
        UPDATE jobs SET
            title_ku = ?, company_logo = ?, company_cover = ?, category = ?, job_type = ?, workplace_type = ?,
            governorate_id = ?, location_detail = ?, lat = ?, lng = ?, location_name = ?,
            salary_min = ?, salary_max = ?,
            description = ?, required_skills = ?, deadline = ?
        WHERE id = ?
    ')->execute([
        sanitize($input['title_ku'] ?? $input['title'] ?? $existing['title_ku'], 200),
        sanitize($input['company_logo'] ?? $input['photo'] ?? $existing['company_logo'] ?? '', 800000),
        sanitize($input['company_cover'] ?? $existing['company_cover'] ?? '', 800000),
        sanitize($input['category'] ?? $existing['category'], 50),
        in_array($input['job_type'] ?? '', ['fullTime','partTime','contract','internship','remote'], true) ? $input['job_type'] : $existing['job_type'],
        in_array($input['workplace_type'] ?? '', ['onSite','remote','hybrid'], true) ? $input['workplace_type'] : $existing['workplace_type'],
        sanitize($input['governorate_id'] ?? $existing['governorate_id'], 50),
        sanitize($input['location_detail'] ?? $existing['location_detail'] ?? '', 300),
        $lat,
        $lng,
        sanitize($input['location_name'] ?? $existing['location_name'] ?? '', 300),
        isset($input['salary_min']) ? (int)$input['salary_min'] : $existing['salary_min'],
        isset($input['salary_max']) ? (int)$input['salary_max'] : $existing['salary_max'],
        sanitize($input['description'] ?? $existing['description'] ?? '', 3000),
        $skills,
        !empty($input['deadline']) ? sanitize($input['deadline'], 20) : $existing['deadline'],
        $jobId,
    ]);

    $updated = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $updated->execute([$jobId]);
    echo json_encode(['success' => true, 'job' => $updated->fetch(), 'message' => 'کارەکە نوێکرایەوە.']);
    exit(0);
}

// ================================================================
// 6c. Jobs: Delete  POST /jobs/delete  (owner employer, or admin/owner)
// ================================================================
// Same /admin/jobs/delete shadowing concern as /jobs/update above — harmless
// today since both handlers delete identically, but excluded for correctness
// and so a future divergence between them doesn't silently misbehave.
if (preg_match('#(?<!admin)/jobs/delete$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $jobId = sanitize($input['id'] ?? $input['job_id'] ?? '', 50);
    if (empty($jobId)) jsonErr(400, 'Job ID required.');

    $existing = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $existing->execute([$jobId]);
    $existing = $existing->fetch();
    if (!$existing) jsonErr(404, 'ئیشەکە نەدۆزرایەوە.');

    $isOwner = $existing['company_id'] === $authUser['id'];
    $isAdmin = in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if (!$isOwner && !$isAdmin) jsonErr(403, 'تەنها کۆمپانیاکە دەتوانێت ئەم کارە بسڕێتەوە.');

    $pdo->prepare('DELETE FROM applications WHERE job_id = ?')->execute([$jobId]);
    $pdo->prepare('DELETE FROM jobs WHERE id = ?')->execute([$jobId]);
    if ($isAdmin) notifyAdmins($pdo, 'job_deleted', ['id' => $jobId]);
    echo json_encode(['success' => true, 'message' => 'کارەکە سڕایەوە.']);
    exit(0);
}

// Jobs: register a real view  POST /jobs/view  (public — called when a
// jobseeker actually opens a job's detail view; counts opens, not unique visitors)
if (preg_match('#/jobs/view$#', $uri) && $method === 'POST') {
    $input = safeJson();
    $jobId = sanitize($input['id'] ?? $input['job_id'] ?? '', 50);
    if (empty($jobId)) jsonErr(400, 'Job ID required.');
    $pdo->prepare('UPDATE jobs SET views = COALESCE(views, 0) + 1 WHERE id = ?')->execute([$jobId]);
    echo json_encode(['success' => true]);
    exit(0);
}

// Jobs: Boost  POST /jobs/boost  — real wallet-funded pin to the top of the
// list for a set number of days, at an admin-configurable price.
if (preg_match('#/jobs/boost$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $jobId = sanitize($input['id'] ?? $input['job_id'] ?? '', 50);
    if (empty($jobId)) jsonErr(400, 'Job ID required.');

    $job = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $job->execute([$jobId]);
    $job = $job->fetch();
    if (!$job) jsonErr(404, 'ئیشەکە نەدۆزرایەوە.');

    $isOwner = $job['company_id'] === $authUser['id'];
    $isAdmin = in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if (!$isOwner && !$isAdmin) jsonErr(403, 'تەنها کۆمپانیاکە دەتوانێت ئەم کارە بەرزبکاتەوە.');

    $price = (int)getSetting($pdo, 'job_boost_price', '5000');
    $days  = (int)getSetting($pdo, 'job_boost_days', '3');

    $wallet = $pdo->prepare('SELECT wallet_balance FROM users WHERE id = ?');
    $wallet->execute([$authUser['id']]);
    $balance = (int)($wallet->fetch()['wallet_balance'] ?? 0);
    if ($balance < $price) jsonErr(402, "کیسەکەت پارەی پێویست نییە. پێویستە {$price} IQD، {$balance} IQD ماوە.");

    $boostedUntil = date('Y-m-d H:i:s', strtotime("+{$days} days"));
    $pdo->prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?')->execute([$price, $authUser['id']]);
    $pdo->prepare('UPDATE jobs SET boosted_until = ? WHERE id = ?')->execute([$boostedUntil, $jobId]);

    echo json_encode(['success' => true, 'boosted_until' => $boostedUntil, 'price' => $price, 'wallet_balance' => $balance - $price]);
    exit(0);
}

// ================================================================
// 7. Freelancers: List  GET /freelancers  (phone hidden)
// ================================================================
if (preg_match('#/freelancers$#', $uri) && $method === 'GET') {
    // Only expose safe public fields — never expose phone/email raw
    $stmt = $pdo->query("
        SELECT id, name, role, gender, governorate, district, sub_district, skills, bio, avatar, cover, status, profile_views, plan, plan_boost_until, created_at, experience, favorite_categories, verified
        FROM users WHERE role = 'freelancer' AND status = 'active'
        ORDER BY (plan_boost_until IS NOT NULL AND plan_boost_until > NOW()) DESC, created_at DESC
    ");
    $freelancers = $stmt->fetchAll();
    echo json_encode(['success' => true, 'count' => count($freelancers), 'freelancers' => $freelancers]);
    exit(0);
}

// Register a real profile view  POST /freelancers/view  (despite the path,
// works for any profile — freelancer or company — so company analytics has
// real view data too, not just freelancers; kept at this URL since it's
// what every existing caller already uses).
// Works for both guests (bumps the plain counter only) and signed-in
// viewers (also logs who, for plans that grant "see who viewed you").
if (preg_match('#/freelancers/view$#', $uri) && $method === 'POST') {
    $input = safeJson();
    $id = sanitize($input['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'Freelancer ID required.');
    $pdo->prepare('UPDATE users SET profile_views = COALESCE(profile_views, 0) + 1 WHERE id = ?')->execute([$id]);

    $viewer = optionalAuthUser($pdo);
    if ($viewer && $viewer['id'] !== $id) {
        $pdo->prepare('INSERT INTO profile_views_log (id, profile_id, viewer_id, viewer_name, viewer_company_name, viewed_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute(['pv_' . time() . '_' . rand(1000, 9999), $id, $viewer['id'], $viewer['name'], $viewer['company_name'] ?? null, date('Y-m-d H:i:s')]);
    }

    echo json_encode(['success' => true]);
    exit(0);
}

// Freelancers: who viewed my profile  GET /profile-viewers  (own plan-gated)
if (preg_match('#/profile-viewers$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    if (!getPlanCapabilities($pdo, $authUser['plan'] ?? null, $authUser['role'] ?? null)['can_see_profile_viewers']) {
        jsonErr(403, 'پلانی ئێستات ئەم تایبەتمەندییە لەخۆناگرێت — پلانەکەت بەرزبکەرەوە بۆ بینینی ئەوانەی سەیری پرۆفایلت کردووە.');
    }
    $stmt = $pdo->prepare('SELECT viewer_id, viewer_name, viewer_company_name, viewed_at FROM profile_views_log WHERE profile_id = ? ORDER BY viewed_at DESC LIMIT 100');
    $stmt->execute([$authUser['id']]);
    echo json_encode(['success' => true, 'viewers' => $stmt->fetchAll()]);
    exit(0);
}

// ================================================================
// 7b. Categories: List  GET /categories  (public)
// ================================================================
if (preg_match('#/categories$#', $uri) && $method === 'GET') {
    $cats = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, name_ku ASC')->fetchAll();
    echo json_encode(['success' => true, 'categories' => $cats]);
    exit(0);
}

// ================================================================
// 7b2. Plan Tiers: List  GET /plans  (public — the Pro/VIP cards shown on
//      the Plans page; admin-managed via /admin/plans/add|update|delete
//      below. Not to be confused with /admin/plans, which lists PURCHASES
//      of these tiers, not the tiers themselves.)
// ================================================================
if (preg_match('#/plans$#', $uri) && $method === 'GET') {
    $tiers = $pdo->query('SELECT * FROM plan_tiers WHERE is_active = 1 ORDER BY sort_order ASC, price ASC')->fetchAll();
    echo json_encode(['success' => true, 'plans' => $tiers]);
    exit(0);
}

// Admin: List EVERY plan tier, including inactive ones — the admin panel
// needs to see (and be able to re-enable) a disabled plan, which the public
// /plans above deliberately never returns.
if (preg_match('#/admin/plan-tiers$#', $uri) && $method === 'GET') {
    requireAdmin($pdo);
    $tiers = $pdo->query('SELECT * FROM plan_tiers ORDER BY sort_order ASC, price ASC')->fetchAll();
    echo json_encode(['success' => true, 'plans' => $tiers]);
    exit(0);
}

// ================================================================
// 7c. Settings: List  GET /settings  (public — every value here is safe to
//     expose; it's what powers the CV fee shown pre-payment and the FastPay
//     number shown to freelancers, neither of which requires login to see)
// ================================================================
if (preg_match('#/settings$#', $uri) && $method === 'GET') {
    $rows = $pdo->query('SELECT `key`, value FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $r) $settings[$r['key']] = $r['value'];
    echo json_encode(['success' => true, 'settings' => $settings]);
    exit(0);
}

// ================================================================
// 7d. Settings: Update  POST /admin/settings/update  (admin/owner only)
// ================================================================
if (preg_match('#/admin/settings/update$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $key   = sanitize($input['key'] ?? '', 100);
    $value = sanitize($input['value'] ?? '', 500);
    if (empty($key)) jsonErr(400, 'Setting key required.');

    $pdo->prepare('INSERT INTO settings (`key`, value, updated_at) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)')
        ->execute([$key, $value, date('Y-m-d H:i:s')]);

    echo json_encode(['success' => true, 'key' => $key, 'value' => $value]);
    exit(0);
}

// ================================================================
// 8. Applications: List  GET /applications  (requires token)
// ================================================================
if (preg_match('#/applications$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);

    // Admin/owner = return ALL applications for the dashboard
    if (in_array($authUser['role'] ?? '', ['admin', 'owner'], true)) {
        $stmt = $pdo->query('SELECT * FROM applications ORDER BY created_at DESC');
        $apps = $stmt->fetchAll();
        echo json_encode(['success' => true, 'count' => count($apps), 'applications' => $apps]);
        exit(0);
    }

    // Regular user = own applications only. Employers only ever see CVs admin has
    // already payment-verified — that's the point where it becomes "theirs" to decide on.
    if ($authUser['role'] === 'employer') {
        $stmt = $pdo->prepare("SELECT * FROM applications WHERE company_id = ? AND payment_status = 'approved' ORDER BY created_at DESC");
        $stmt->execute([$authUser['id']]);
    } else {
        $stmt = $pdo->prepare('SELECT * FROM applications WHERE freelancer_id = ? ORDER BY created_at DESC');
        $stmt->execute([$authUser['id']]);
    }
    $apps = $stmt->fetchAll();
    echo json_encode(['success' => true, 'count' => count($apps), 'applications' => $apps]);
    exit(0);
}

// ================================================================
// 9. Applications: Submit  POST /applications  (requires token)
// ================================================================
if (preg_match('#/applications$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'apply')) jsonErr(429, 'Too many requests.');

    $authUser = requireAuth($pdo);
    $input    = safeJson();
    $jobId    = sanitize($input['job_id'] ?? '', 50);

    if (empty($jobId)) jsonErr(400, 'ناسنامەی کارەکە پێویستە.');

    // Look up the job server-side — never trust client-supplied company/title,
    // and this is also what lets us know exactly who to notify.
    $jobStmt = $pdo->prepare('SELECT id, company_id, company_name, title_ku, fee_amount FROM jobs WHERE id = ?');
    $jobStmt->execute([$jobId]);
    $job = $jobStmt->fetch();
    if (!$job) jsonErr(404, 'ئیشەکە نەدۆزرایەوە.');

    // A company can't apply to its own job posting.
    if ($job['company_id'] === $authUser['id']) jsonErr(400, 'ناتوانیت سیڤی بۆ هەلی کاری خۆت بنێریت.');

    // Duplicate check
    $dup = $pdo->prepare('SELECT id FROM applications WHERE job_id = ? AND freelancer_id = ?');
    $dup->execute([$jobId, $authUser['id']]);
    if ($dup->fetch()) jsonErr(400, 'پێشتر سیڤیت ناردووە بۆ ئەم کارە.');

    // A real plan credit skips the admin payment-verification wait entirely —
    // it was already paid for up front when the plan itself was purchased and verified.
    // Admin/owner accounts skip the credit requirement entirely, same as
    // every other plan-gated perk — they're never meant to be blocked by
    // the consumer plan system. Tracked separately from a real credit so
    // the decrement below only ever touches an actual purchased credit.
    $isPlanExempt = in_array($authUser['role'] ?? null, ['admin', 'owner'], true);
    $hasRealCredit = (int)($authUser['plan_credits'] ?? 0) > 0;
    $hasCredit = $isPlanExempt || $hasRealCredit;
    $appStatus = $hasCredit ? 'active' : 'pending_payment_verification';
    $paymentStatus = $hasCredit ? 'approved' : 'pending';

    // The fee actually charged/recorded: whatever this specific job was
    // posted with (an employer can override it per-job, see POST /jobs),
    // falling back to the current global cv_fee_amount setting — never a
    // silent, un-editable column default that the admin panel can't reach.
    $feeAmount = (int)($job['fee_amount'] ?? getSetting($pdo, 'cv_fee_amount', '2500'));

    $appId = 'app_' . time() . rand(10, 99);
    $pdo->prepare('
        INSERT INTO applications (id, job_id, job_title, company_name, company_id, freelancer_id, freelancer_name, freelancer_phone, cover_letter, cv_url, payment_method, payment_tx_id, status, payment_status, fee_paid, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $appId,
        $jobId,
        $job['title_ku'],
        $job['company_name'],
        $job['company_id'],
        $authUser['id'],
        $authUser['name'],
        $authUser['phone'],
        sanitize($input['cover_letter'] ?? '', 2000),
        sanitize($input['cv_url'] ?? '', 800000),
        $hasCredit ? 'Plan Credit' : sanitize($input['payment_method'] ?? 'FastPay', 50),
        $hasCredit ? 'PLAN-CREDIT' : sanitize($input['payment_tx_id'] ?? 'FP-' . rand(10000, 99999), 100),
        $appStatus,
        $paymentStatus,
        $feeAmount,
        date('Y-m-d H:i:s'),
    ]);

    if ($hasCredit) {
        if ($hasRealCredit) {
            $pdo->prepare('UPDATE users SET plan_credits = plan_credits - 1 WHERE id = ?')->execute([$authUser['id']]);
        }
        // Paid for already — the company gets to see it immediately, same as a
        // just-approved payment.
        if ($job['company_id']) {
            notifyUser($pdo, $job['company_id'], 'سیڤی نوێ چاوەڕوانە 📄',
                "سیڤی {$authUser['name']} بۆ \"{$job['title_ku']}\" ئامادەیە بۆ بڕیاردان", '/dashboard');
            // Dedicated event (beyond the generic notification) so the
            // dashboard's pending-applicant badge/list updates instantly.
            pusherTrigger(['private-user-' . $job['company_id']], 'new-application', ['application_id' => $appId, 'job_id' => $jobId]);
        }
    }
    // Else: intentionally NOT notifying the company yet — the CV sits with
    // admin for payment verification first, same as before plans existed.

    echo json_encode(['success' => true, 'application_id' => $appId, 'used_plan_credit' => $hasCredit]);
    exit(0);
}

// Applications: Withdraw  POST /applications/withdraw  (freelancer, own
// application only, and only before any real payment has been verified —
// once admin approves the payment it's a real transaction and can't be undone here)
if (preg_match('#/applications/withdraw$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $appId = sanitize($input['id'] ?? $input['application_id'] ?? '', 50);
    if (empty($appId)) jsonErr(400, 'Application ID required.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ? AND freelancer_id = ?');
    $app->execute([$appId, $authUser['id']]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'داواکارییەکە نەدۆزرایەوە.');
    if ($app['payment_status'] === 'approved') jsonErr(400, 'ناتوانرێت داواکارییەک کە پارەکەی پشکنراوە پاشگەز بکرێتەوە.');

    $pdo->prepare('DELETE FROM applications WHERE id = ?')->execute([$appId]);
    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// 10. Applications: Verify Payment  POST /applications/verify
//     (Admin only)
// ================================================================
if (preg_match('#/applications/.*?/verify$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input  = safeJson();
    preg_match('#/applications/([^/]+)/verify$#', $uri, $m);
    $appId  = $m[1] ?? sanitize($input['application_id'] ?? '', 50);
    $status = ($input['status'] ?? '') === 'rejected' ? 'rejected' : 'approved';

    if (empty($appId)) jsonErr(400, 'Application ID required.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$appId]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');

    $pdo->prepare('UPDATE applications SET status = ?, payment_status = ?, verified_at = ? WHERE id = ?')
        ->execute([$status, $status, date('Y-m-d H:i:s'), $appId]);

    if ($status === 'approved' && $app['company_id']) {
        // This is the moment the company actually gets to see/act on it.
        notifyUser($pdo, $app['company_id'], 'سیڤی نوێ چاوەڕوانە 📄',
            "سیڤی {$app['freelancer_name']} بۆ \"{$app['job_title']}\" پشکنرا و ئامادەیە بۆ بڕیاردان", '/dashboard');
    } elseif ($status === 'rejected' && $app['freelancer_id']) {
        notifyUser($pdo, $app['freelancer_id'], 'پارەدانەکەت پەسەند نەکرا',
            "پارەدانی سیڤیت بۆ \"{$app['job_title']}\" پەسەند نەکرا — تکایە پەیوەندی بە پشتیوانی بکە", '/cvs');
    }

    echo json_encode(['success' => true, 'application_id' => $appId, 'status' => $status]);
    exit(0);
}

// ================================================================
// Disputes — real recourse for a rejected FastPay payment (application fee
// or plan purchase). A user files one, an admin (from the Zera Console —
// Ishkhwaz has no admin UI of its own) works it in a real message thread,
// and resolves it as a wallet refund, an overturned approval, or a denial.
// ================================================================

function disputeTargetRow(PDO $pdo, string $type, string $id): ?array {
    if ($type === 'application') {
        $stmt = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    } elseif ($type === 'plan_purchase') {
        $stmt = $pdo->prepare('SELECT * FROM plan_purchases WHERE id = ?');
    } else {
        return null;
    }
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}
function disputeOwnerId(array $row, string $type): string {
    return $type === 'application' ? $row['freelancer_id'] : $row['user_id'];
}
function disputeAmount(array $row, string $type): int {
    return (int)($type === 'application' ? ($row['fee_paid'] ?? 0) : ($row['price'] ?? 0));
}
function disputeMessages(PDO $pdo, string $disputeId): array {
    $stmt = $pdo->prepare('SELECT * FROM dispute_messages WHERE dispute_id = ? ORDER BY created_at ASC');
    $stmt->execute([$disputeId]);
    return $stmt->fetchAll();
}
function ishkhwazOwnerId(PDO $pdo): ?string {
    $row = $pdo->query("SELECT id FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1")->fetch();
    return $row['id'] ?? null;
}

// POST /disputes  { target_type, target_id, reason }
if (preg_match('#/disputes$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'dispute')) jsonErr(429, 'Too many requests.');
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $type = in_array($input['target_type'] ?? '', ['application', 'plan_purchase'], true) ? $input['target_type'] : '';
    $targetId = sanitize($input['target_id'] ?? '', 64);
    $reason = trim(sanitize($input['reason'] ?? '', 2000));
    if (empty($type) || empty($targetId)) jsonErr(400, 'Target required.');
    if (mb_strlen($reason) < 5) jsonErr(400, 'تکایە هۆکارەکە بە ورد بنووسە.');

    $target = disputeTargetRow($pdo, $type, $targetId);
    if (!$target) jsonErr(404, 'Not found.');
    if (disputeOwnerId($target, $type) !== $authUser['id']) jsonErr(403, 'Forbidden.');
    $rejectedField = $type === 'application' ? ($target['payment_status'] ?? '') : ($target['status'] ?? '');
    if ($rejectedField !== 'rejected') jsonErr(400, 'تەنها پارەدانی ڕەتکراوە دەکرێت شکایەتی لەسەر تۆمار بکرێت.');

    $existing = $pdo->prepare("SELECT id FROM disputes WHERE target_type = ? AND target_id = ? AND status = 'open'");
    $existing->execute([$type, $targetId]);
    if ($existing->fetch()) jsonErr(409, 'پێشتر شکایەتێکی کراوەت هەیە بۆ ئەمە.');

    $id = 'disp_' . time() . rand(100, 999);
    $now = date('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO disputes (id, target_type, target_id, user_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $type, $targetId, $authUser['id'], $reason, 'open', $now]);
    $pdo->prepare('INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute(['dmsg_' . time() . rand(100, 999), $id, $authUser['id'], 'user', $reason, $now]);

    notifyAdmins($pdo, 'dispute_opened', ['id' => $id, 'target_type' => $type]);
    $ownerId = ishkhwazOwnerId($pdo);
    if ($ownerId) notifyUser($pdo, $ownerId, 'شکایەتی نوێ 🚩', "{$authUser['name']} شکایەتێکی نوێ تۆمار کرد", '/cvs');

    echo json_encode(['success' => true, 'dispute' => ['id' => $id, 'target_type' => $type, 'target_id' => $targetId, 'status' => 'open', 'created_at' => $now, 'messages' => disputeMessages($pdo, $id)]]);
    exit(0);
}

// GET /disputes — own disputes, or (admin/owner) every open+resolved dispute
if (preg_match('#/disputes$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $isAdmin = in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if ($isAdmin) {
        $stmt = $pdo->query("SELECT * FROM disputes ORDER BY (status = 'open') DESC, created_at DESC LIMIT 200");
    } else {
        $stmt = $pdo->prepare('SELECT * FROM disputes WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$authUser['id']]);
    }
    $disputes = $stmt->fetchAll();
    foreach ($disputes as &$d) {
        $d['messages'] = disputeMessages($pdo, $d['id']);
        $target = disputeTargetRow($pdo, $d['target_type'], $d['target_id']);
        $d['amount'] = $target ? disputeAmount($target, $d['target_type']) : 0;
        $d['target_label'] = $target ? ($d['target_type'] === 'application' ? ($target['job_title'] ?? '') : ($target['plan'] ?? '')) : '';
    }
    unset($d);
    echo json_encode(['success' => true, 'disputes' => $disputes]);
    exit(0);
}

// POST /disputes/{id}/messages  { body }
if (preg_match('#/disputes/([^/]+)/messages$#', $uri, $m) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $disputeId = $m[1];
    $body = trim(sanitize((safeJson())['body'] ?? '', 2000));
    if ($body === '') jsonErr(400, 'Message body required.');

    $stmt = $pdo->prepare('SELECT * FROM disputes WHERE id = ?');
    $stmt->execute([$disputeId]);
    $dispute = $stmt->fetch();
    if (!$dispute) jsonErr(404, 'Dispute not found.');
    $isAdmin = in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if (!$isAdmin && $dispute['user_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');
    if ($dispute['status'] !== 'open') jsonErr(400, 'ئەم شکایەتە داخراوە.');

    $now = date('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute(['dmsg_' . time() . rand(100, 999), $disputeId, $authUser['id'], $isAdmin ? 'admin' : 'user', $body, $now]);

    if ($isAdmin) {
        notifyUser($pdo, $dispute['user_id'], 'وەڵامی شکایەتەکەت', 'سەرپەرشتیار وەڵامی دایەوە', '/cvs');
    } else {
        $ownerId = ishkhwazOwnerId($pdo);
        if ($ownerId) notifyUser($pdo, $ownerId, 'پەیامی نوێ لە شکایەتێک', "{$authUser['name']} وەڵامی دایەوە", '/cvs');
    }

    echo json_encode(['success' => true, 'messages' => disputeMessages($pdo, $disputeId)]);
    exit(0);
}

// POST /disputes/{id}/resolve  { status: resolved_refunded|resolved_approved|resolved_denied, note }  (admin only)
if (preg_match('#/disputes/([^/]+)/resolve$#', $uri, $m) && $method === 'POST') {
    $admin = requireAdmin($pdo);
    $disputeId = $m[1];
    $input = safeJson();
    $status = $input['status'] ?? '';
    if (!in_array($status, ['resolved_refunded', 'resolved_approved', 'resolved_denied'], true)) jsonErr(400, 'Invalid status.');
    $note = trim(sanitize($input['note'] ?? '', 1000));

    $stmt = $pdo->prepare('SELECT * FROM disputes WHERE id = ?');
    $stmt->execute([$disputeId]);
    $dispute = $stmt->fetch();
    if (!$dispute) jsonErr(404, 'Dispute not found.');
    if ($dispute['status'] !== 'open') jsonErr(400, 'ئەم شکایەتە پێشتر داخراوە.');

    $target = disputeTargetRow($pdo, $dispute['target_type'], $dispute['target_id']);
    if (!$target) jsonErr(404, 'Original record no longer exists.');

    if ($status === 'resolved_refunded') {
        $amount = disputeAmount($target, $dispute['target_type']);
        if ($amount > 0) {
            $pdo->prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?')->execute([$amount, $dispute['user_id']]);
        }
    } elseif ($status === 'resolved_approved') {
        if ($dispute['target_type'] === 'application') {
            $pdo->prepare("UPDATE applications SET status = 'approved', payment_status = 'approved', verified_at = ? WHERE id = ?")
                ->execute([date('Y-m-d H:i:s'), $target['id']]);
            if ($target['company_id']) {
                notifyUser($pdo, $target['company_id'], 'سیڤی نوێ چاوەڕوانە 📄', "سیڤی {$target['freelancer_name']} بۆ \"{$target['job_title']}\" ئامادەیە بۆ بڕیاردان", '/dashboard');
            }
        } else {
            applyPlanPurchaseResult($pdo, $target, 'approved');
        }
    }
    // resolved_denied: no data change beyond closing the dispute itself.

    $now = date('Y-m-d H:i:s');
    $pdo->prepare("UPDATE disputes SET status = ?, resolution_note = ?, resolved_by = ?, resolved_at = ? WHERE id = ?")
        ->execute([$status, $note, $admin['id'], $now, $disputeId]);

    $outcomeLabel = $status === 'resolved_refunded' ? 'پارەکەت گەڕێنرایەوە بۆ جزدانەکەت' : ($status === 'resolved_approved' ? 'داواکارییەکەت پەسەندکرا' : 'شکایەتەکەت ڕەتکرایەوە');
    $pdo->prepare('INSERT INTO dispute_messages (id, dispute_id, sender_id, sender_role, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute(['dmsg_' . time() . rand(100, 999), $disputeId, $admin['id'], 'admin', $note !== '' ? $note : $outcomeLabel, $now]);
    notifyUser($pdo, $dispute['user_id'], 'ئەنجامی شکایەتەکەت', $outcomeLabel, '/cvs');

    echo json_encode(['success' => true, 'dispute' => ['id' => $disputeId, 'status' => $status, 'messages' => disputeMessages($pdo, $disputeId)]]);
    exit(0);
}

// ================================================================
// Milestones — real project-tracking + payment-confirmation for an accepted
// application. Ishkhwaz never holds the money (that still moves employer ->
// freelancer directly); this gives both sides a structured, notified,
// paper-trailed record instead of the pipeline just going quiet after "accepted".
// ================================================================

// POST /milestones  { application_id, title, amount }  (employer only)
if (preg_match('#/milestones$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $appId = sanitize($input['application_id'] ?? '', 64);
    $title = trim(sanitize($input['title'] ?? '', 200));
    $amount = (int)($input['amount'] ?? 0);
    if (empty($appId) || $title === '' || $amount <= 0) jsonErr(400, 'Title and a positive amount are required.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$appId]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');
    if ($app['company_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');
    if (($app['company_status'] ?? '') !== 'accepted') jsonErr(400, 'تەنها بۆ کاندیدی وەرگیراو دەکرێت قۆناغ زیاد بکرێت.');

    $countStmt = $pdo->prepare('SELECT COUNT(*) c FROM milestones WHERE application_id = ?');
    $countStmt->execute([$appId]);
    $sortOrder = (int)$countStmt->fetch()['c'];

    $id = 'ms_' . time() . rand(100, 999);
    $now = date('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO milestones (id, application_id, title, amount, status, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $appId, $title, $amount, 'pending', $sortOrder, $now]);

    if ($app['freelancer_id']) {
        notifyUser($pdo, $app['freelancer_id'], 'قۆناغی نوێی پڕۆژە', "\"{$title}\" ({$amount} IQD) زیادکرا بۆ \"{$app['job_title']}\"", '/cvs');
    }
    echo json_encode(['success' => true, 'milestone' => ['id' => $id, 'application_id' => $appId, 'title' => $title, 'amount' => $amount, 'status' => 'pending', 'created_at' => $now]]);
    exit(0);
}

// GET /milestones?application_id=X
if (preg_match('#/milestones$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $appId = sanitize($_GET['application_id'] ?? '', 64);
    if (empty($appId)) jsonErr(400, 'application_id required.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$appId]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');
    $isAdmin = in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if (!$isAdmin && $app['freelancer_id'] !== $authUser['id'] && $app['company_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');

    $stmt = $pdo->prepare('SELECT * FROM milestones WHERE application_id = ? ORDER BY sort_order ASC, created_at ASC');
    $stmt->execute([$appId]);
    echo json_encode(['success' => true, 'milestones' => $stmt->fetchAll()]);
    exit(0);
}

// POST /milestones/{id}/submit  { note }  (freelancer only)
if (preg_match('#/milestones/([^/]+)/submit$#', $uri, $m) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $ms = $pdo->prepare('SELECT * FROM milestones WHERE id = ?');
    $ms->execute([$m[1]]);
    $ms = $ms->fetch();
    if (!$ms) jsonErr(404, 'Milestone not found.');
    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$ms['application_id']]);
    $app = $app->fetch();
    if (!$app || $app['freelancer_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');
    if ($ms['status'] !== 'pending') jsonErr(400, 'ئەم قۆناغە پێشتر ناردراوە.');

    $note = trim(sanitize((safeJson())['note'] ?? '', 1000));
    $now = date('Y-m-d H:i:s');
    $pdo->prepare("UPDATE milestones SET status = 'submitted', freelancer_note = ?, submitted_at = ? WHERE id = ?")->execute([$note, $now, $m[1]]);
    if ($app['company_id']) {
        notifyUser($pdo, $app['company_id'], 'قۆناغێک ئامادەیە بۆ پێداچوونەوە', "\"{$ms['title']}\" لەلایەن {$app['freelancer_name']}ەوە تەواو بوو", '/dashboard');
    }
    echo json_encode(['success' => true]);
    exit(0);
}

// POST /milestones/{id}/confirm  { note }  (employer only — confirms it was really paid)
if (preg_match('#/milestones/([^/]+)/confirm$#', $uri, $m) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $ms = $pdo->prepare('SELECT * FROM milestones WHERE id = ?');
    $ms->execute([$m[1]]);
    $ms = $ms->fetch();
    if (!$ms) jsonErr(404, 'Milestone not found.');
    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$ms['application_id']]);
    $app = $app->fetch();
    if (!$app || $app['company_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');
    if ($ms['status'] !== 'submitted') jsonErr(400, 'ئەم قۆناغە هێشتا ئامادە نییە بۆ پشتڕاستکردنەوە.');

    $note = trim(sanitize((safeJson())['note'] ?? '', 1000));
    $now = date('Y-m-d H:i:s');
    $pdo->prepare("UPDATE milestones SET status = 'confirmed_paid', employer_note = ?, confirmed_at = ? WHERE id = ?")->execute([$note, $now, $m[1]]);
    if ($app['freelancer_id']) {
        notifyUser($pdo, $app['freelancer_id'], 'پارەدانی قۆناغ پشتڕاستکرایەوە ✓', "\"{$ms['title']}\" ({$ms['amount']} IQD) وەک دراو نیشانەکرا", '/cvs');
    }
    echo json_encode(['success' => true]);
    exit(0);
}

// POST /milestones/{id}/delete  (employer only, only while still pending)
if (preg_match('#/milestones/([^/]+)/delete$#', $uri, $m) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $ms = $pdo->prepare('SELECT * FROM milestones WHERE id = ?');
    $ms->execute([$m[1]]);
    $ms = $ms->fetch();
    if (!$ms) jsonErr(404, 'Milestone not found.');
    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$ms['application_id']]);
    $app = $app->fetch();
    if (!$app || $app['company_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');
    if ($ms['status'] !== 'pending') jsonErr(400, 'تەنها قۆناغی چاوەڕوان دەسڕدرێتەوە.');
    $pdo->prepare('DELETE FROM milestones WHERE id = ?')->execute([$m[1]]);
    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// Company analytics — real day-by-day trends, not just a current snapshot.
// GET /analytics/company?days=14  (employer/admin/owner only)
// ================================================================
if (preg_match('#/analytics/company$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    if (!in_array($authUser['role'] ?? '', ['employer', 'admin', 'owner'], true)) jsonErr(403, 'Forbidden.');
    $days = max(1, min(90, (int)($_GET['days'] ?? 14)));
    $companyId = $authUser['id'];

    // Real daily buckets — every day in the window gets a row even with
    // zero activity, so the frontend never has to guess at gaps.
    $viewsStmt = $pdo->prepare("
        SELECT DATE(viewed_at) d, COUNT(*) c FROM profile_views_log
        WHERE profile_id = ? AND viewed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(viewed_at)
    ");
    $viewsStmt->execute([$companyId, $days]);
    $viewsByDay = [];
    foreach ($viewsStmt->fetchAll() as $r) $viewsByDay[$r['d']] = (int)$r['c'];

    $appsStmt = $pdo->prepare("
        SELECT DATE(created_at) d, COUNT(*) c FROM applications
        WHERE company_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
    ");
    $appsStmt->execute([$companyId, $days]);
    $appsByDay = [];
    foreach ($appsStmt->fetchAll() as $r) $appsByDay[$r['d']] = (int)$r['c'];

    $series = [];
    for ($i = $days - 1; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime("-{$i} days"));
        $series[] = ['date' => $d, 'views' => $viewsByDay[$d] ?? 0, 'applications' => $appsByDay[$d] ?? 0];
    }

    echo json_encode([
        'success' => true,
        'days' => $days,
        'series' => $series,
        'totals' => [
            'views' => array_sum($viewsByDay),
            'applications' => array_sum($appsByDay),
        ],
    ]);
    exit(0);
}

// ================================================================
// Ratings — either side of a hired (accepted) application can rate the
// other, once. Tied to a real application, never a free-floating review.
// ================================================================

// POST /ratings  { application_id, rating (1-5), comment }
if (preg_match('#/ratings$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $appId = sanitize($input['application_id'] ?? '', 64);
    $rating = (int)($input['rating'] ?? 0);
    $comment = trim(sanitize($input['comment'] ?? '', 500));
    if (empty($appId)) jsonErr(400, 'application_id required.');
    if ($rating < 1 || $rating > 5) jsonErr(400, 'هەڵسەنگاندن دەبێت لە نێوان ١ تا ٥ بێت.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$appId]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');
    if (($app['company_status'] ?? '') !== 'accepted') jsonErr(400, 'تەنها بۆ داواکاری وەرگیراو دەکرێت هەڵسەنگاندن بنووسرێت.');

    if ($app['freelancer_id'] === $authUser['id']) {
        $rateeId = $app['company_id']; $raterRole = 'freelancer';
    } elseif ($app['company_id'] === $authUser['id']) {
        $rateeId = $app['freelancer_id']; $raterRole = 'employer';
    } else {
        jsonErr(403, 'Forbidden.');
    }
    if (empty($rateeId)) jsonErr(400, 'ئەم داواکارییە لایەنی بەرامبەری دیارینەکراوە.');

    $existing = $pdo->prepare('SELECT id FROM ratings WHERE application_id = ? AND rater_id = ?');
    $existing->execute([$appId, $authUser['id']]);
    if ($existing->fetch()) jsonErr(409, 'پێشتر هەڵسەنگاندنت نووسیوە بۆ ئەمە.');

    $id = 'rate_' . time() . rand(100, 999);
    $now = date('Y-m-d H:i:s');
    try {
        $pdo->prepare('INSERT INTO ratings (id, application_id, rater_id, rater_role, ratee_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([$id, $appId, $authUser['id'], $raterRole, $rateeId, $rating, $comment ?: null, $now]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') jsonErr(409, 'پێشتر هەڵسەنگاندنت نووسیوە بۆ ئەمە.');
        throw $e;
    }

    notifyUser($pdo, $rateeId, 'هەڵسەنگاندنی نوێ ⭐', "{$authUser['name']} هەڵسەنگاندنێکی نوێت پێدا ({$rating}/٥)", '/profile');

    echo json_encode(['success' => true, 'rating' => ['id' => $id, 'application_id' => $appId, 'rating' => $rating, 'comment' => $comment, 'created_at' => $now]]);
    exit(0);
}

// GET /ratings/{userId} — public, no auth (shown on public profiles)
if (preg_match('#/ratings/([^/]+)$#', $uri, $m) && $method === 'GET') {
    $rateeId = $m[1];
    $stmt = $pdo->prepare('SELECT id, rater_role, rating, comment, created_at FROM ratings WHERE ratee_id = ? ORDER BY created_at DESC LIMIT 100');
    $stmt->execute([$rateeId]);
    $ratings = $stmt->fetchAll();
    $count = count($ratings);
    $average = $count > 0 ? round(array_sum(array_column($ratings, 'rating')) / $count, 1) : 0;
    echo json_encode(['success' => true, 'ratings' => $ratings, 'average' => $average, 'count' => $count]);
    exit(0);
}

// Fetches full job rows for a recommended-id list, in that exact order,
// with each job's AI (or overlap-score) reason attached.
function hydrateRecommendedJobs(PDO $pdo, array $jobIds, array $reasons): array {
    if (empty($jobIds)) return [];
    $placeholders = implode(',', array_fill(0, count($jobIds), '?'));
    $stmt = $pdo->prepare("SELECT * FROM jobs WHERE id IN ($placeholders) AND status = 'active'");
    $stmt->execute($jobIds);
    $byId = [];
    foreach ($stmt->fetchAll() as $row) $byId[$row['id']] = $row;

    $out = [];
    foreach ($jobIds as $id) {
        if (!isset($byId[$id])) continue; // job since closed/deleted — skip, don't error
        $job = $byId[$id];
        $job['recommend_reason'] = $reasons[$id] ?? null;
        $out[] = $job;
    }
    return $out;
}

// ================================================================
// AI-powered job recommendations — real matching, not decorative. A cheap
// skills/category/city overlap score always runs first; once the candidate
// actually has a CV or listed skills, one real OpenAI call ranks the
// shortlist and writes a one-line Kurdish reason per pick. Cached per user
// (keyed by a hash of their own matching signals) so a profile that hasn't
// changed doesn't re-spend an API call on every page load.
// ================================================================
if (preg_match('#/jobs/recommended$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);

    $skills = json_decode($authUser['skills'] ?? '[]', true);
    $skills = is_array($skills) ? $skills : [];
    $favCats = json_decode($authUser['favorite_categories'] ?? '[]', true);
    $favCats = is_array($favCats) ? $favCats : [];
    $governorate = $authUser['governorate'] ?? '';
    $cvUrl = $authUser['cv_url'] ?? '';
    $hasCvSignal = !empty($cvUrl) || count($skills) > 0;

    $profileHash = md5(json_encode([$skills, $favCats, $governorate, $authUser['bio'] ?? '', !empty($cvUrl)]));

    $cacheStmt = $pdo->prepare('SELECT * FROM job_recommendations WHERE user_id = ?');
    $cacheStmt->execute([$authUser['id']]);
    $cached = $cacheStmt->fetch();
    if ($cached && $cached['profile_hash'] === $profileHash && strtotime($cached['generated_at']) > time() - 6 * 3600) {
        $jobIds = json_decode($cached['job_ids'], true) ?: [];
        $reasons = json_decode($cached['reasons'] ?? '{}', true) ?: [];
        echo json_encode(['success' => true, 'jobs' => hydrateRecommendedJobs($pdo, $jobIds, $reasons), 'aiPowered' => (bool)$cached['ai_powered']]);
        exit(0);
    }

    $pool = $pdo->query("SELECT id, title_ku, category, governorate_id, salary_min, salary_max, company_name, required_skills, description FROM jobs WHERE status = 'active' ORDER BY created_at DESC LIMIT 200")->fetchAll();

    $scored = [];
    foreach ($pool as $job) {
        $score = 0;
        if ($job['category'] && in_array($job['category'], $favCats, true)) $score += 3;
        if ($governorate && $job['governorate_id'] === $governorate) $score += 1;
        $haystack = mb_strtolower(($job['required_skills'] ?? '') . ' ' . ($job['description'] ?? ''));
        foreach ($skills as $s) {
            if (is_string($s) && $s !== '' && mb_strpos($haystack, mb_strtolower($s)) !== false) $score += 2;
        }
        if ($score > 0) $scored[] = ['job' => $job, 'score' => $score];
    }
    usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
    $candidates = array_slice($scored, 0, 15);

    $jobIds = [];
    $reasons = [];
    $aiPowered = false;

    if (!empty($candidates) && $hasCvSignal) {
        $profileSummary = json_encode([
            'skills' => $skills, 'favorite_categories' => $favCats, 'governorate' => $governorate,
            'bio' => mb_substr((string)($authUser['bio'] ?? ''), 0, 500),
        ], JSON_UNESCAPED_UNICODE);
        $candidateList = json_encode(array_map(fn($c) => [
            'id' => $c['job']['id'], 'title' => $c['job']['title_ku'], 'category' => $c['job']['category'],
            'city' => $c['job']['governorate_id'], 'salary_min' => (int)$c['job']['salary_min'], 'salary_max' => (int)$c['job']['salary_max'],
        ], $candidates), JSON_UNESCAPED_UNICODE);

        $system = "You are a job-matching assistant for Ishkhwaz, a Kurdistan (Sorani Kurdish) job marketplace. You'll get a candidate's profile and a shortlist of open jobs. Pick the best 5-8 matches, best first. Respond with ONLY a raw JSON array, no markdown fences, no commentary: [{\"id\":\"<job id>\",\"reason\":\"<one short Sorani Kurdish sentence, max ~12 words, saying why this job fits this candidate>\"}]";
        $userPrompt = "Candidate profile:\n{$profileSummary}\n\nCandidate jobs:\n{$candidateList}";
        $raw = callOpenAI($system, $userPrompt, 700);
        if ($raw !== null) {
            $clean = trim(preg_replace('#^```(json)?|```$#m', '', $raw));
            $parsed = json_decode($clean, true);
            $validIds = array_column(array_map(fn($c) => $c['job'], $candidates), 'id');
            if (is_array($parsed)) {
                foreach ($parsed as $row) {
                    $rid = $row['id'] ?? '';
                    if (in_array($rid, $validIds, true) && !in_array($rid, $jobIds, true)) {
                        $jobIds[] = $rid;
                        $reasons[$rid] = sanitize((string)($row['reason'] ?? ''), 300);
                    }
                }
            }
            if (!empty($jobIds)) $aiPowered = true;
        }
    }

    if (empty($jobIds)) {
        // No AI signal (no CV/skills yet) or the AI call failed/returned
        // nothing usable — the cheap overlap score is still real, just not
        // AI-explained.
        $jobIds = array_map(fn($c) => $c['job']['id'], array_slice($candidates, 0, 8));
    }

    $now = date('Y-m-d H:i:s');
    $pdo->prepare('
        INSERT INTO job_recommendations (user_id, job_ids, reasons, ai_powered, profile_hash, generated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE job_ids = VALUES(job_ids), reasons = VALUES(reasons), ai_powered = VALUES(ai_powered), profile_hash = VALUES(profile_hash), generated_at = VALUES(generated_at)
    ')->execute([$authUser['id'], json_encode($jobIds), json_encode($reasons, JSON_UNESCAPED_UNICODE), $aiPowered ? 1 : 0, $profileHash, $now]);

    echo json_encode(['success' => true, 'jobs' => hydrateRecommendedJobs($pdo, $jobIds, $reasons), 'aiPowered' => $aiPowered]);
    exit(0);
}

// ================================================================
// 11. Applications: Company Status  POST /applications/*/company-status
//     (Employer: own applications only)
// ================================================================
if (preg_match('#/applications/.*?/company-status$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    if ($authUser['role'] !== 'employer') jsonErr(403, 'Forbidden.');

    $input  = safeJson();
    preg_match('#/applications/([^/]+)/company-status$#', $uri, $m);
    $appId  = $m[1] ?? sanitize($input['application_id'] ?? '', 50);
    $status = in_array($input['company_status'] ?? '', ['accepted', 'rejected', 'pending'])
        ? $input['company_status'] : 'pending';

    if (empty($appId)) jsonErr(400, 'Application ID required.');

    // Ownership check — an employer may only decide on applications for their own jobs.
    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ? AND company_id = ?');
    $app->execute([$appId, $authUser['id']]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');

    $pdo->prepare('UPDATE applications SET company_status = ?, accepted_at = ? WHERE id = ?')
        ->execute([$status, date('Y-m-d H:i:s'), $appId]);

    if ($status !== 'pending' && $app['freelancer_id']) {
        $label = $status === 'accepted' ? 'وەرگیرایت! 🎉' : 'ڕەتکرایەوە';
        notifyUser($pdo, $app['freelancer_id'], "داواکارییەکەت {$label}",
            "\"{$app['job_title']}\" لەلایەن {$app['company_name']}", '/cvs');
    }

    echo json_encode(['success' => true, 'application_id' => $appId, 'company_status' => $status]);
    exit(0);
}

// ================================================================
// 11b. Messages: real in-app thread tied to one application. A company may
// only message once it can actually see the applicant (payment_status
// approved — the same point it becomes visible in their list at all); the
// freelancer who applied can always message about their own application.
// ================================================================
if (preg_match('#/messages/send$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'message')) jsonErr(429, 'Too many requests.');
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $appId = sanitize($input['application_id'] ?? '', 50);
    $body  = trim(sanitize($input['body'] ?? '', 2000));
    if (empty($appId) || $body === '') jsonErr(400, 'Application ID and message body required.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$appId]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');

    $isFreelancer = $app['freelancer_id'] === $authUser['id'];
    $isCompany    = $app['company_id'] === $authUser['id'] && $app['payment_status'] === 'approved';
    if (!$isFreelancer && !$isCompany) jsonErr(403, 'Forbidden.');

    // Direct messaging is a plan perk on the freelancer side — an employer
    // can always message once they've unlocked the applicant, but whether
    // the freelancer can message back/first depends on their own plan.
    if ($isFreelancer && !getPlanCapabilities($pdo, $authUser['plan'] ?? null, $authUser['role'] ?? null)['can_message']) {
        jsonErr(403, 'پلانی ئێستات پەیامنانی ڕاستەوخۆ لەگەڵ کۆمپانیاکان لەخۆناگرێت — پلانەکەت بەرزبکەرەوە.');
    }

    $receiverId = $isFreelancer ? $app['company_id'] : $app['freelancer_id'];
    if (empty($receiverId)) jsonErr(400, 'No counterpart to message yet.');

    $id = 'msg_' . time() . '_' . rand(1000, 9999);
    $pdo->prepare('INSERT INTO messages (id, application_id, sender_id, receiver_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$id, $appId, $authUser['id'], $receiverId, $body, date('Y-m-d H:i:s')]);

    notifyUser($pdo, $receiverId, 'پەیامی نوێ لە ' . ($authUser['company_name'] ?? $authUser['name']),
        mb_substr($body, 0, 120), '/messages');

    // Rich event (beyond the generic notification above) so an already-open
    // thread/inbox can append the real message instantly instead of just
    // knowing "something happened" and needing another fetch.
    pusherTrigger(['private-user-' . $receiverId], 'new-message', [
        'application_id' => $appId,
        'message' => ['id' => $id, 'application_id' => $appId, 'sender_id' => $authUser['id'], 'receiver_id' => $receiverId, 'body' => $body, 'created_at' => date('Y-m-d H:i:s')],
    ]);

    echo json_encode(['success' => true, 'id' => $id]);
    exit(0);
}

// GET /messages/thread?application_id=X — the two-party message history,
// marks the authenticated user's inbound messages as read.
if (preg_match('#/messages/thread$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $appId = sanitize($_GET['application_id'] ?? '', 50);
    if (empty($appId)) jsonErr(400, 'Application ID required.');

    $app = $pdo->prepare('SELECT * FROM applications WHERE id = ?');
    $app->execute([$appId]);
    $app = $app->fetch();
    if (!$app) jsonErr(404, 'Application not found.');
    if ($app['freelancer_id'] !== $authUser['id'] && $app['company_id'] !== $authUser['id']) jsonErr(403, 'Forbidden.');

    $pdo->prepare("UPDATE messages SET read_at = ? WHERE application_id = ? AND receiver_id = ? AND read_at IS NULL")
        ->execute([date('Y-m-d H:i:s'), $appId, $authUser['id']]);

    $stmt = $pdo->prepare('SELECT * FROM messages WHERE application_id = ? ORDER BY created_at ASC');
    $stmt->execute([$appId]);
    echo json_encode(['success' => true, 'messages' => $stmt->fetchAll()]);
    exit(0);
}

// GET /messages/threads — every application the user is a party to that has
// at least one real message, with the last message and a real unread count.
if (preg_match('#/messages/threads$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $stmt = $pdo->prepare("
        SELECT a.id AS application_id, a.job_title, a.company_name, a.freelancer_name,
               a.freelancer_id, a.company_id,
               uf.avatar AS freelancer_avatar,
               uc.avatar AS company_avatar,
               (SELECT body FROM messages m WHERE m.application_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
               (SELECT created_at FROM messages m WHERE m.application_id = a.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
               (SELECT COUNT(*) FROM messages m WHERE m.application_id = a.id AND m.receiver_id = ? AND m.read_at IS NULL) AS unread_count
        FROM applications a
        LEFT JOIN users uf ON uf.id = a.freelancer_id
        LEFT JOIN users uc ON uc.id = a.company_id
        WHERE (a.freelancer_id = ? OR a.company_id = ?)
          AND EXISTS (SELECT 1 FROM messages m WHERE m.application_id = a.id)
        ORDER BY last_message_at DESC
    ");
    $stmt->execute([$authUser['id'], $authUser['id'], $authUser['id']]);
    echo json_encode(['success' => true, 'threads' => $stmt->fetchAll()]);
    exit(0);
}

// ================================================================
// 11c. Saved Searches: a persisted filter combo that alerts its owner when a
// newly posted job matches (see notifyMatchingSavedSearches above).
// ================================================================
if (preg_match('#/saved-searches$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $stmt = $pdo->prepare('SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$authUser['id']]);
    echo json_encode(['success' => true, 'searches' => $stmt->fetchAll()]);
    exit(0);
}

if (preg_match('#/saved-searches$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();

    // Real plan-gated limit — free accounts get 1, pro 5, vip unlimited.
    $limits = ['free' => 1, 'pro' => 5, 'vip' => 999];
    $limit = $limits[$authUser['plan'] ?? 'free'] ?? 1;
    $existing = $pdo->prepare('SELECT COUNT(*) c FROM saved_searches WHERE user_id = ?');
    $existing->execute([$authUser['id']]);
    if ((int)$existing->fetch()['c'] >= $limit) {
        jsonErr(403, "پلانی {$authUser['plan']}ت تەنها ڕێگە بە {$limit} گەڕانی پاشەکەوتکراو دەدات — پلانەکەت بەرزبکەرەوە بۆ زیاتر.");
    }

    $id = 'search_' . time() . rand(10, 99);
    $pdo->prepare('INSERT INTO saved_searches (id, user_id, label, category, job_type, governorate_id, min_salary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([
            $id, $authUser['id'],
            sanitize($input['label'] ?? '', 100),
            sanitize($input['category'] ?? 'all', 50),
            sanitize($input['job_type'] ?? 'all', 30),
            sanitize($input['governorate_id'] ?? 'all', 50),
            (int)($input['min_salary'] ?? 0),
            date('Y-m-d H:i:s'),
        ]);
    echo json_encode(['success' => true, 'id' => $id]);
    exit(0);
}

if (preg_match('#/saved-searches/delete$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $id = sanitize($input['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'Search ID required.');
    $pdo->prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?')->execute([$id, $authUser['id']]);
    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// Plans — one-time purchase (Pro/VIP), real FastPay-proof + admin
// verification, same trust model already proven on CV application payments.
// ================================================================
if (preg_match('#/plans/purchase$#', $uri) && $method === 'POST') {
    if (!rateLimitCheck($pdo, $clientIp, 'plan_purchase')) jsonErr(429, 'Too many requests.');
    $authUser = requireAuth($pdo);
    $input = safeJson();
    $planId = sanitize($input['plan'] ?? '', 30);
    if (empty($planId)) jsonErr(400, 'Invalid plan.');

    $tierStmt = $pdo->prepare('SELECT * FROM plan_tiers WHERE id = ? AND is_active = 1');
    $tierStmt->execute([$planId]);
    $tier = $tierStmt->fetch();
    if (!$tier) jsonErr(400, 'Invalid plan.');

    $plan = $planId;
    $price = (int)$tier['price'];
    $id = 'planbuy_' . time() . rand(10, 99);

    // A free (or admin-comped) plan has nothing to actually pay — grant it
    // immediately instead of sending a 0 IQD request to Zera Payment, which
    // it would just reject.
    if ($price <= 0) {
        $pdo->prepare('INSERT INTO plan_purchases (id, user_id, plan, price, payment_method, payment_tx_id, status, created_at) VALUES (?, ?, ?, 0, ?, ?, ?, ?)')
            ->execute([$id, $authUser['id'], $plan, 'Free', 'N/A', 'pending', date('Y-m-d H:i:s')]);

        $purchase = $pdo->prepare('SELECT * FROM plan_purchases WHERE id = ?');
        $purchase->execute([$id]);
        applyPlanPurchaseResult($pdo, $purchase->fetch(), 'approved');

        echo json_encode(['success' => true, 'id' => $id, 'price' => 0]);
        exit(0);
    }

    // Real payment, not manual proof — Zera Payment hosts the actual wallet
    // screenshot/verification step; our own /webhooks/zera-payment endpoint
    // is what credits the plan the moment their admin approves it.
    $payment = createZeraPayment($price, $id, (string)($authUser['name'] ?? ''), (string)($authUser['phone'] ?? ''));
    if (!$payment['ok']) {
        $message = match ($payment['reason']) {
            // The one failure mode an admin can actually go fix right now —
            // worth naming specifically instead of a generic "try again".
            'no_wallet' => 'هیچ جۆرە قیستەیەکی چالاک لە دەروازەی پارەدان دانەمەزراوە — پێویستە ئەدمین لە پانێڵی پارەدان لانی کەم یەک جۆر قیستە چالاک بکات.',
            default => 'ناتوانرێت پەیوەندی بە دەروازەی پارەدان بکرێت. تکایە دواتر هەوڵبدەرەوە.',
        };
        jsonErr(502, $message);
    }

    // Not 'pending' yet — that status is reserved for "customer actually
    // submitted proof, now awaiting review" (see the SUBMITTED webhook
    // below). Until then this purchase attempt shouldn't block the Buy
    // button or show a review spinner; PlansPage.jsx only checks for
    // status === 'pending', so anything else here is effectively invisible
    // to it by design.
    $pdo->prepare('INSERT INTO plan_purchases (id, user_id, plan, price, payment_method, payment_tx_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([
            $id, $authUser['id'], $plan, $price,
            'ZeraPayment', $payment['transactionId'],
            'awaiting_payment', date('Y-m-d H:i:s'),
        ]);

    echo json_encode(['success' => true, 'id' => $id, 'price' => $price, 'paymentUrl' => $payment['paymentUrl']]);
    exit(0);
}

if (preg_match('#/plans/my-purchases$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $stmt = $pdo->prepare('SELECT * FROM plan_purchases WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$authUser['id']]);
    echo json_encode(['success' => true, 'purchases' => $stmt->fetchAll()]);
    exit(0);
}

if (preg_match('#/admin/plans$#', $uri) && $method === 'GET') {
    requireAdmin($pdo);
    $stmt = $pdo->query("
        SELECT p.*, u.name AS user_name, u.phone AS user_phone
        FROM plan_purchases p JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
    ");
    echo json_encode(['success' => true, 'purchases' => $stmt->fetchAll()]);
    exit(0);
}

if (preg_match('#/admin/plans/verify$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id = sanitize($input['id'] ?? '', 50);
    $status = ($input['status'] ?? '') === 'rejected' ? 'rejected' : 'approved';
    if (empty($id)) jsonErr(400, 'Purchase ID required.');

    $purchase = $pdo->prepare('SELECT * FROM plan_purchases WHERE id = ?');
    $purchase->execute([$id]);
    $purchase = $purchase->fetch();
    if (!$purchase) jsonErr(404, 'Purchase not found.');
    if ($purchase['status'] !== 'pending') jsonErr(400, 'Already processed.');

    applyPlanPurchaseResult($pdo, $purchase, $status);

    echo json_encode(['success' => true, 'id' => $id, 'status' => $status]);
    exit(0);
}

// ================================================================
// Admin: Plan Tiers CRUD — the actual Pro/VIP/etc. definitions (price,
// credits, boost days). Not to be confused with the /admin/plans and
// /admin/plans/verify endpoints just above, which handle purchases OF
// these tiers, not the tiers themselves.
// ================================================================

// Admin: Add Plan  POST /admin/plans/add
if (preg_match('#/admin/plans/add$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input  = safeJson();
    $nameKu = sanitize($input['name_ku'] ?? '', 50);
    if (empty($nameKu)) jsonErr(400, 'ناوی پلان پێویستە.');

    $id = sanitize($input['id'] ?? '', 30);
    if (empty($id)) {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $nameKu));
        $id = trim($slug, '_') . '_' . substr(bin2hex(random_bytes(2)), 0, 4);
    }

    $existing = $pdo->prepare('SELECT id FROM plan_tiers WHERE id = ?');
    $existing->execute([$id]);
    if ($existing->fetch()) jsonErr(400, 'ئەم ناسنامەیە پێشتر بەکارهاتووە.');

    $maxOrder = (int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) m FROM plan_tiers')->fetch()['m'];

    // Only ever one featured ("best choice") plan at a time.
    if (!empty($input['featured'])) {
        $pdo->exec('UPDATE plan_tiers SET featured = 0');
    }

    // Only ever one "primary free" plan — the one every new user is placed
    // on automatically at registration.
    if (!empty($input['is_primary_free'])) {
        $pdo->exec('UPDATE plan_tiers SET is_primary_free = 0');
    }

    // Features: [{ok: bool, label: string}, ...] — fully admin-authored, not
    // auto-generated. Anything malformed just falls back to an empty list
    // rather than rejecting the whole request over one bad bullet.
    $features = [];
    if (is_array($input['features'] ?? null)) {
        foreach ($input['features'] as $f) {
            $label = sanitize((string)($f['label'] ?? ''), 200);
            if ($label !== '') $features[] = ['ok' => !empty($f['ok']), 'label' => $label];
        }
    }

    $audience = in_array($input['audience'] ?? '', ['freelancer', 'employer', 'both'], true) ? $input['audience'] : 'both';

    $pdo->prepare('
        INSERT INTO plan_tiers (id, name_ku, name_en, tagline, icon, color, price, credits, boost_days, features, featured, is_primary_free, can_message, can_receive_invitations, can_see_profile_viewers, sort_order, audience, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    ')->execute([
            $id, $nameKu,
            sanitize($input['name_en'] ?? '', 50),
            sanitize($input['tagline'] ?? '', 150),
            sanitize($input['icon'] ?? 'Star', 20),
            sanitize($input['color'] ?? 'lime', 20),
            max(0, (int)($input['price'] ?? 0)),
            max(0, (int)($input['credits'] ?? 0)),
            max(0, (int)($input['boost_days'] ?? 0)),
            json_encode($features, JSON_UNESCAPED_UNICODE),
            !empty($input['featured']) ? 1 : 0,
            !empty($input['is_primary_free']) ? 1 : 0,
            array_key_exists('can_message', $input) ? (!empty($input['can_message']) ? 1 : 0) : 1,
            array_key_exists('can_receive_invitations', $input) ? (!empty($input['can_receive_invitations']) ? 1 : 0) : 1,
            !empty($input['can_see_profile_viewers']) ? 1 : 0,
            $maxOrder + 1,
            $audience,
            date('Y-m-d H:i:s'),
        ]);

    notifyAdmins($pdo, 'plan_added', ['id' => $id]);
    echo json_encode(['success' => true, 'id' => $id]);
    exit(0);
}

// Admin: Update Plan  POST /admin/plans/update
if (preg_match('#/admin/plans/update$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 30);
    if (empty($id)) jsonErr(400, 'Plan ID required.');

    $existing = $pdo->prepare('SELECT * FROM plan_tiers WHERE id = ?');
    $existing->execute([$id]);
    $existing = $existing->fetch();
    if (!$existing) jsonErr(404, 'Plan not found.');

    // Only ever one featured ("best choice") plan at a time.
    if (!empty($input['featured'])) {
        $pdo->exec('UPDATE plan_tiers SET featured = 0');
    }

    // Only ever one "primary free" plan — the one every new user is placed
    // on automatically at registration.
    if (!empty($input['is_primary_free'])) {
        $pdo->exec('UPDATE plan_tiers SET is_primary_free = 0');
    }

    // Features are replaced wholesale when provided (the admin UI always
    // sends the full current list back) — otherwise left exactly as they were.
    $features = $existing['features'];
    if (is_array($input['features'] ?? null)) {
        $clean = [];
        foreach ($input['features'] as $f) {
            $label = sanitize((string)($f['label'] ?? ''), 200);
            if ($label !== '') $clean[] = ['ok' => !empty($f['ok']), 'label' => $label];
        }
        $features = json_encode($clean, JSON_UNESCAPED_UNICODE);
    }

    $audience = in_array($input['audience'] ?? '', ['freelancer', 'employer', 'both'], true) ? $input['audience'] : ($existing['audience'] ?? 'both');

    $pdo->prepare('
        UPDATE plan_tiers SET
            name_ku = ?, name_en = ?, tagline = ?, icon = ?, color = ?,
            price = ?, credits = ?, boost_days = ?, features = ?, featured = ?, is_primary_free = ?,
            can_message = ?, can_receive_invitations = ?, can_see_profile_viewers = ?, audience = ?, is_active = ?
        WHERE id = ?
    ')->execute([
            sanitize($input['name_ku'] ?? $existing['name_ku'], 50),
            array_key_exists('name_en', $input) ? sanitize($input['name_en'], 50) : $existing['name_en'],
            array_key_exists('tagline', $input) ? sanitize($input['tagline'], 150) : $existing['tagline'],
            array_key_exists('icon', $input) ? sanitize($input['icon'], 20) : $existing['icon'],
            array_key_exists('color', $input) ? sanitize($input['color'], 20) : $existing['color'],
            isset($input['price']) ? max(0, (int)$input['price']) : $existing['price'],
            isset($input['credits']) ? max(0, (int)$input['credits']) : $existing['credits'],
            isset($input['boost_days']) ? max(0, (int)$input['boost_days']) : $existing['boost_days'],
            $features,
            array_key_exists('featured', $input) ? (!empty($input['featured']) ? 1 : 0) : $existing['featured'],
            array_key_exists('is_primary_free', $input) ? (!empty($input['is_primary_free']) ? 1 : 0) : $existing['is_primary_free'],
            array_key_exists('can_message', $input) ? (!empty($input['can_message']) ? 1 : 0) : $existing['can_message'],
            array_key_exists('can_receive_invitations', $input) ? (!empty($input['can_receive_invitations']) ? 1 : 0) : $existing['can_receive_invitations'],
            array_key_exists('can_see_profile_viewers', $input) ? (!empty($input['can_see_profile_viewers']) ? 1 : 0) : $existing['can_see_profile_viewers'],
            $audience,
            array_key_exists('is_active', $input) ? (!empty($input['is_active']) ? 1 : 0) : $existing['is_active'],
            $id,
        ]);

    notifyAdmins($pdo, 'plan_updated', ['id' => $id]);
    echo json_encode(['success' => true]);
    exit(0);
}

// Admin: Delete Plan  POST /admin/plans/delete
// Purchases already made against this plan keep their own historical price
// and stay in plan_purchases untouched — only the tier definition itself
// (and the ability to buy it again) goes away.
if (preg_match('#/admin/plans/delete$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 30);
    if (empty($id)) jsonErr(400, 'Plan ID required.');
    $pdo->prepare('DELETE FROM plan_tiers WHERE id = ?')->execute([$id]);
    notifyAdmins($pdo, 'plan_deleted', ['id' => $id]);
    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// AI writing assist  POST /ai/write  { kind, input: {...} }
// kind: 'cv_summary' | 'cv_experience' | 'job_description' — one endpoint,
// dispatched server-side so the prompt (and the OpenAI key) never touch the
// frontend. Every kind fails soft with a real error message rather than a
// silent empty string, so the calling UI can just show it and let the user
// keep typing manually.
// ================================================================
if (preg_match('#/ai/write$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    if (!rateLimitCheck($pdo, $clientIp, 'ai_write')) jsonErr(429, 'زۆر جار داواتکرد. کەمێک چاوەڕوان بە.');

    $input = safeJson();
    $kind = sanitize($input['kind'] ?? '', 40);
    $d = is_array($input['input'] ?? null) ? $input['input'] : [];

    // Shared quality bar for every kind below — this is what actually fixes
    // "AI Kurdish sounds off": be explicit about the exact dialect/register,
    // ban literal English-calque phrasing, tell it to code-switch (keep
    // English) for technical terms instead of inventing an awkward Kurdish
    // word for them — which is genuinely how Kurdish tech professionals
    // write — and anchor it with a real native-quality example.
    $kurdishQualityBar = "Write in natural, fluent Central Kurdish (Sorani, Arabic-based script — کوردیی ناوەندی), exactly as an educated native professional from Slemani or Hewlêr would write it. Rules:\n"
        . "- Register: use زمانی بازاڕی — the natural, everyday colloquial Kurdish a professional actually speaks/writes in real business life — NOT stiff formal/literary/journalistic Kurdish (وتاری فەرمی ڕۆژنامەیی). It must read like a real person describing themselves to a colleague, never like a government announcement or textbook passage.\n"
        . "- Never invent a Kurdish word. If you don't know the natural Sorani word for something, either use a simpler common synonym, or — for technical/domain terms (programming languages, software, tools, job titles like 'React developer', 'Excel', 'Photoshop') — just keep the English term as-is in Latin letters. This code-switching is completely normal and expected in real Kurdish professional writing; do not force-translate it.\n"
        . "- Do not literally translate English sentence structure — express the idea the way a Kurdish speaker naturally would.\n"
        . "- Correct Sorani grammar only (izafe, verb conjugation, word order) — no Kurmanji/Badini forms.\n"
        . "- Always end on a complete, properly punctuated sentence — plan the length so you never get cut off mid-sentence.\n"
        . "- NEVER invent a specific fact that wasn't given to you — a year count, a named technology, a number of projects, a specific achievement or client result, or even a vague unverifiable claim like 'has worked for several years' or 'completed several successful projects.' This also covers invented OUTCOMES/success claims about something they manage or built, not just about themselves — e.g. if told someone manages a platform, do NOT add that the platform 'became well-known,' 'grew popular,' 'succeeded in its region,' or gained any users/reach/recognition unless that was explicitly stated. Only restate what was given; never extrapolate a result from it.\n"
        . "  BAD (fabricated, do not do this): input says only 'manages a job-search platform' -> output adds \"ماڵپەڕەکە لە ناوچەکەدا بەرز بووە\" (the platform became prominent in the region) or \"کاتی زۆر بەکارهێنەری بۆ دۆزیوەتەوە\" (it gained many users) — neither of those was in the input, both are invented.\n"
        . "  GOOD: input says only 'manages a job-search platform' -> output says only that they manage it, nothing about its success or reach.\n"
        . "  If the input notes are sparse or empty, DO NOT describe any work history, track record, or outcome at all — just state the person's role/title and genuine interest in it, in 1-2 short sentences, and stop there. A short honest text beats a longer one with any invented claim, however vague.\n"
        . "- Avoid generic filler and repeated intensifiers (e.g. don't say 'the highest quality' twice in the same text, don't say 'a variety of different things' with nothing concrete backing it) — every sentence should carry real content from the input, not padding.\n"
        . "Match this level of natural quality (topic differs, but match the register/fluency/simplicity exactly):\n";

    if ($kind === 'cv_summary') {
        $fullName = sanitize($d['fullName'] ?? '', 150);
        $jobTitle = sanitize($d['jobTitle'] ?? '', 150);
        $notes    = sanitize($d['notes'] ?? '', 1500);
        $example = "من گەشەپێدەرێکی وێبم و زیاتر لە سێ ساڵە لەگەڵ React و Node.js کار دەکەم. لە چەند پڕۆژەیەکی جیاوازدا بەشداری تیمی کردووە و توانیوومە چارەسەری گونجاو بدۆزمەوە بۆ کێشە ئاڵۆزەکان. هەمیشە حەزم لەوەیە فێری تەکنەلۆژیای نوێ ببم و بەرهەمێکی باشتر و خێراتر بۆ کڕیار دابین بکەم.";
        $system = $kurdishQualityBar . $example . "\n\nWrite ONLY the final text — no preamble, no quotes, no markdown, no label. Output 3-4 sentences: a confident, first-person professional CV summary.";
        $user = "Job title: {$jobTitle}\nName: {$fullName}\nNotes/background from the candidate (may be rough or incomplete — turn it into polished professional prose): {$notes}";
        $text = callOpenAI($system, $user, 400);
        if ($text !== null) $text = polishKurdish($text, 400);
    } elseif ($kind === 'cv_experience') {
        $role    = sanitize($d['role'] ?? '', 150);
        $company = sanitize($d['company'] ?? '', 150);
        $notes   = sanitize($d['notes'] ?? '', 1500);
        $example = "وەک گەشەپێدەری پێشەوە لە کۆمپانیاکەدا، بەرپرسیار بووم لە دیزاین و جێبەجێکردنی ڕووکاری بەکارهێنەر بۆ چەند پڕۆژەیەکی گەورە. لەگەڵ تیمەکەدا هەوڵمدا کێشەکانی کارایی چارەسەر بکەم و کاتی بارکردنی ماڵپەڕەکە کەم بکەمەوە.";
        $system = $kurdishQualityBar . $example . "\n\nWrite ONLY the final text — no preamble, no quotes, no markdown, no label. Output 2-3 concise first-person sentences describing this work experience's responsibilities and achievements.";
        $user = "Role: {$role}\nCompany: {$company}\nNotes from the candidate (may be rough — turn it into polished professional prose, don't invent specific numbers/facts that weren't mentioned): {$notes}";
        $text = callOpenAI($system, $user, 320);
        if ($text !== null) $text = polishKurdish($text, 320);
    } elseif ($kind === 'job_description') {
        $title       = sanitize($d['title'] ?? '', 150);
        $category    = sanitize($d['category'] ?? '', 100);
        $jobType     = sanitize($d['jobType'] ?? '', 50);
        $workplace   = sanitize($d['workplaceType'] ?? '', 50);
        $skills      = sanitize($d['skills'] ?? '', 500);
        $notes       = sanitize($d['notes'] ?? '', 1500);
        $example = "کۆمپانیاکەمان بۆ بەشی فرۆشتن بەدوای کەسێکی چالاک و بەئارەزوودا دەگەڕێت. کارمەندەکە بەرپرسیارە لە وەڵامدانەوەی کڕیاران، ناساندنی بەرهەمەکان، و یارمەتیدان بۆ گەیشتن بە ئامانجی فرۆشتن. پێویستە کەسەکە توانای گفتوگۆکردنی باش هەبێت و بتوانێت لەژێر فشاردا کاربکات. لە بەرامبەردا، کۆمپانیاکەمان مووچەیەکی گونجاو و کەشێکی کاری هاوکارانە پێشکەش دەکات.";
        $system = $kurdishQualityBar . $example . "\n\nWrite ONLY the final text — no preamble, no quotes, no markdown headers, no label. Output 120-220 words covering: responsibilities, requirements/qualifications, and what the employer offers. Short clear paragraphs, no fake statistics.";
        $user = "Job title: {$title}\nCategory: {$category}\nJob type: {$jobType}\nWorkplace: {$workplace}\nDesired skills: {$skills}\nEmployer notes (may be rough — turn into a polished posting, don't invent specific facts not mentioned): {$notes}";
        $text = callOpenAI($system, $user, 800);
        if ($text !== null) $text = polishKurdish($text, 800);
    } else {
        jsonErr(400, 'Unknown AI request kind.');
    }

    if ($text === null) jsonErr(502, 'AI ئێستا بەردەست نییە. تکایە دواتر هەوڵبدەرەوە یان بە دەست بنووسە.');
    echo json_encode(['success' => true, 'text' => $text]);
    exit(0);
}

// Server-to-server helper shared by the two Karnama endpoints below —
// bootstraps (or reuses) a Karnama account already linked to this Ish-khwaz
// user and returns a real Karnama session token for it. Never exposed to
// the browser directly; only this backend ever sees the OAuth client secret.
function karnamaBootstrapToken(array $authUser, string $rawToken): string {
    $karnamaSecret = OAUTH_CLIENTS['karnama']['secret'];
    $ch = curl_init(KARNAMA_API_BASE . '/account/ishkhwaz-bootstrap');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'ishkhwazUserId' => $authUser['id'],
            'ishkhwazName'   => $authUser['name'],
            'ishkhwazPhone'  => $authUser['phone'],
            'ishkhwazToken'  => $rawToken,
        ], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $karnamaSecret, 'Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $boot = ($raw !== false) ? json_decode($raw, true) : null;
    if ($status < 200 || $status >= 300 || empty($boot['success']) || empty($boot['token'])) {
        jsonErr(502, 'ناتوانرێت پەیوەندی بە ڕاژەکاری سیڤی بکرێت. تکایە دواتر هەوڵبدەرەوە.');
    }
    return $boot['token'];
}

// ================================================================
// Karnama integration: build a CV from Ish-khwaz's own "Make CV" page, with
// the whole design-picking experience staying on Ish-khwaz itself.
// POST /karnama/create-resume  { resume: {...schema-shaped CV data, incl.
//   templateId/accentColor as chosen in Ish-khwaz's own template picker} }
// Auto-provisions (or reuses) a Karnama account already linked to this
// Ish-khwaz user and saves the resume there via Karnama's own real /resumes
// endpoint — reusing its existing validation, premium-template gating, and
// storage — purely so the plan-based CV limits stay enforced centrally and
// the CV can be re-opened from Karnama later. No redirect, no separate
// Karnama login screen; the actual template rendering and PDF export happen
// entirely in Ish-khwaz's own UI.
// ================================================================
if (preg_match('#/karnama/create-resume$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $headers = getallheaders();
    $rawToken = str_replace('Bearer ', '', $headers['Authorization'] ?? $headers['authorization'] ?? '');

    $input = safeJson();
    $resume = $input['resume'] ?? null;
    if (!is_array($resume)) jsonErr(400, 'زانیاری سیڤی پێویستە.');

    $karnamaToken = karnamaBootstrapToken($authUser, $rawToken);

    // Deterministic, not random — one per Ishkhwaz user, always. A random id
    // here meant every resubmit (retry after an error, double-tap, etc.)
    // created a BRAND NEW resume on Karnama instead of updating the same
    // one, silently eating into Karnama's own separate "N total resumes"
    // plan cap until it was exhausted and every further attempt failed with
    // an unrelated "upgrade your plan" error.
    if (empty($resume['id'])) {
        $resume['id'] = 'ishk_cv_' . $authUser['id'];
    }
    if (empty($resume['templateId'])) {
        $resume['templateId'] = 'free-modern-minimal';
    }
    $ch = curl_init(KARNAMA_API_BASE . '/resumes');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['resume' => $resume], JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $karnamaToken, 'Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $raw2 = curl_exec($ch);
    $status2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $saveRes = ($raw2 !== false) ? json_decode($raw2, true) : null;
    if ($status2 < 200 || $status2 >= 300 || empty($saveRes['success'])) {
        // Surface Karnama's own message (e.g. the premium-slot-limit text)
        // through so the picker can show a real, specific error.
        jsonErr($status2 >= 400 && $status2 < 500 ? $status2 : 502, $saveRes['message'] ?? 'سیڤیەکە پاشەکەوت نەکرا.');
    }

    echo json_encode(['success' => true, 'resumeId' => $resume['id']]);
    exit(0);
}

// ================================================================
// Karnama integration: premium CV design-slot status.
// GET /karnama/status
// Tells Ish-khwaz's own template picker how many premium ("pro-*") designs
// this user may use and how many they've already used, so it can grey out
// designs beyond that limit before the user picks one and hits a save error.
// ================================================================
if (preg_match('#/karnama/status$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    $headers = getallheaders();
    $rawToken = str_replace('Bearer ', '', $headers['Authorization'] ?? $headers['authorization'] ?? '');

    $karnamaToken = karnamaBootstrapToken($authUser, $rawToken);

    $ch = curl_init(KARNAMA_API_BASE . '/account/ishkhwaz-status');
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $karnamaToken],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = ($raw !== false) ? json_decode($raw, true) : null;
    if ($status < 200 || $status >= 300 || empty($data['success'])) {
        jsonErr(502, 'ناتوانرێت دۆخی سیڤی وەربگیرێت.');
    }

    echo json_encode([
        'success' => true,
        'premiumCvLimit' => $data['premiumCvLimit'] ?? 1,
        'premiumCvUsed' => $data['premiumCvUsed'] ?? 0,
    ]);
    exit(0);
}

// ================================================================
// Zera Payment webhook  POST /webhooks/zera-payment
// Fires when a plan purchase's payment is approved or rejected on Zera
// Payment's side — this is what actually credits the plan automatically,
// same effect as an admin manually approving it via /admin/plans/verify.
// ================================================================
if (preg_match('#/webhooks/zera-payment$#', $uri) && $method === 'POST') {
    $rawBody = file_get_contents('php://input');
    $headers = getallheaders();
    $signature = $headers['X-Zera-Signature'] ?? $headers['x-zera-signature'] ?? null;

    if (!verifyZeraWebhookSignature($rawBody, $signature)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid signature.']);
        exit(0);
    }

    $data = json_decode($rawBody, true) ?? [];
    $purchaseId = $data['externalReference'] ?? '';
    $zeraStatus = $data['status'] ?? '';
    if (empty($purchaseId) || !in_array($zeraStatus, ['SUBMITTED', 'APPROVED', 'REJECTED'], true)) {
        // Not an error — EXPIRED updates and anything else are simply not
        // actionable here, but we still return 200 so Zera Payment doesn't
        // retry a webhook we deliberately have nothing to do with.
        echo json_encode(['success' => true, 'ignored' => true]);
        exit(0);
    }

    $purchase = $pdo->prepare('SELECT * FROM plan_purchases WHERE id = ?');
    $purchase->execute([$purchaseId]);
    $purchase = $purchase->fetch();
    if (!$purchase) {
        echo json_encode(['success' => true, 'ignored' => true]);
        exit(0);
    }

    // SUBMITTED — the customer actually uploaded proof of payment. This is
    // the moment the purchase becomes genuinely "pending review"; before
    // this it was just an unpaid link and never blocked the Buy button.
    if ($zeraStatus === 'SUBMITTED') {
        if ($purchase['status'] === 'awaiting_payment') {
            $pdo->prepare('UPDATE plan_purchases SET status = ? WHERE id = ?')->execute(['pending', $purchaseId]);
            notifyAdmins($pdo, 'plan_purchase_pending', ['id' => $purchaseId, 'user_id' => $purchase['user_id'], 'plan' => $purchase['plan']]);
        }
        echo json_encode(['success' => true]);
        exit(0);
    }

    // Already processed (e.g. a retried webhook delivery) — nothing left to do.
    if ($purchase['status'] !== 'pending') {
        echo json_encode(['success' => true, 'ignored' => true]);
        exit(0);
    }

    applyPlanPurchaseResult($pdo, $purchase, $zeraStatus === 'APPROVED' ? 'approved' : 'rejected');

    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// 12. Notifications: List  GET /notifications  (own + broadcast; auth optional)
// ================================================================
if (preg_match('#/notifications$#', $uri) && $method === 'GET') {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = str_replace('Bearer ', '', $auth);
    $data = $token ? validateToken($token) : null;

    if ($data) {
        $stmt = $pdo->prepare('SELECT id, title, body, target_url, created_at FROM push_notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([$data['uid']]);
    } else {
        $stmt = $pdo->query('SELECT id, title, body, target_url, created_at FROM push_notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50');
    }
    echo json_encode(['success' => true, 'notifications' => $stmt->fetchAll()]);
    exit(0);
}

// ================================================================
// 13. Notifications: Send  POST /notifications/send  (Admin only)
// ================================================================
if (preg_match('#/notifications/send$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input  = safeJson();
    $id     = 'notif_' . time() . '_' . rand(1000, 9999);
    $title  = sanitize($input['title']      ?? 'ئیش خواز', 200);
    $body   = sanitize($input['body']       ?? '', 500);
    $url    = sanitize($input['target_url'] ?? '/', 300);
    $sentBy = sanitize($input['sent_by']    ?? 'Admin', 100);

    $pdo->prepare('INSERT INTO push_notifications (id, title, body, target_url, sent_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$id, $title, $body, $url, $sentBy, date('Y-m-d H:i:s')]);

    // Actually push to every subscribed device — reaches lock screens even with the app closed.
    $payload = json_encode(['title' => $title, 'body' => $body, 'url' => $url]);
    $subs = $pdo->query('SELECT endpoint, p256dh, auth FROM push_subscriptions')->fetchAll();
    $pushed = 0;
    $deadEndpoints = [];
    foreach ($subs as $sub) {
        if (sendWebPush($sub, $payload)) {
            $pushed++;
        } else {
            $deadEndpoints[] = $sub['endpoint'];
        }
    }
    // Prune subscriptions that are gone (uninstalled app / expired) so the list stays clean
    if (!empty($deadEndpoints)) {
        $placeholders = implode(',', array_fill(0, count($deadEndpoints), '?'));
        $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint IN ($placeholders)")->execute($deadEndpoints);
    }

    echo json_encode([
        'success' => true,
        'notification' => ['id' => $id, 'title' => $title, 'body' => $body],
        'pushed_to' => $pushed,
        'total_subscriptions' => count($subs),
    ]);
    exit(0);
}

// ================================================================
// 14. Push Subscribe  POST /push/subscribe
// ================================================================
if (preg_match('#/push/subscribe$#', $uri) && $method === 'POST') {
    $input    = safeJson();
    $endpoint = sanitize($input['endpoint'] ?? '', 1000);
    if (!empty($endpoint)) {
        // Associate with whoever's logged in, if anyone — needed to target notifications
        // at a specific user instead of only ever broadcasting to everyone.
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        $tokenData = validateToken(str_replace('Bearer ', '', $auth));
        $userId = $tokenData['uid'] ?? null;

        $id = 'sub_' . md5($endpoint);
        $pdo->prepare('REPLACE INTO push_subscriptions (id, endpoint, p256dh, auth, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$id, $endpoint, sanitize($input['p256dh'] ?? '', 200), sanitize($input['auth'] ?? '', 100), $userId, date('Y-m-d H:i:s')]);
    }
    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// Pusher: private channel auth  POST /pusher/auth
// pusher-js posts this as a normal form body (not JSON), so it's read via
// $_POST directly rather than safeJson(). A user may only ever authenticate
// their own private-user-{id} channel; an admin/owner is additionally
// allowed onto the one shared private-admin-panel channel every admin
// session subscribes to (see notifyAdmins() above) — never anyone else's.
// ================================================================
if (preg_match('#/pusher/auth$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $channelName = $_POST['channel_name'] ?? '';
    $socketId = $_POST['socket_id'] ?? '';
    if (empty($channelName) || empty($socketId)) jsonErr(400, 'Missing channel_name/socket_id.');

    $isOwnChannel = $channelName === ('private-user-' . $authUser['id']);
    $isAdminChannel = $channelName === 'private-admin-panel' && in_array($authUser['role'] ?? '', ['admin', 'owner'], true);
    if (!$isOwnChannel && !$isAdminChannel) jsonErr(403, 'Forbidden channel.');

    $signature = hash_hmac('sha256', $socketId . ':' . $channelName, PUSHER_SECRET);
    echo json_encode(['auth' => PUSHER_KEY . ':' . $signature]);
    exit(0);
}

// ================================================================
// Invitations — an employer proactively sending a CV/job offer to a freelancer
// ================================================================

// Send an invitation  POST /invitations  (employer only)
if (preg_match('#/invitations$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    if ($authUser['role'] !== 'employer') jsonErr(403, 'تەنها کۆمپانیاکان دەتوانن ئۆفەر بنێرن.');

    $input = safeJson();
    $freelancerId = sanitize($input['freelancer_id'] ?? '', 50);
    $jobTitle = sanitize($input['job_title'] ?? '', 200);
    if (empty($freelancerId) || empty($jobTitle)) jsonErr(400, 'ناسنامەی فریلانسەر و ناونیشانی کار پێویستن.');

    $freelancer = $pdo->prepare("SELECT id, name, plan FROM users WHERE id = ? AND role = 'freelancer'");
    $freelancer->execute([$freelancerId]);
    $freelancer = $freelancer->fetch();
    if (!$freelancer) jsonErr(404, 'فریلانسەر نەدۆزرایەوە.');

    // Receiving a proactive job offer is a plan perk of the freelancer's own
    // plan — a free-tier freelancer simply isn't invitable yet.
    if (!getPlanCapabilities($pdo, $freelancer['plan'] ?? null)['can_receive_invitations']) {
        jsonErr(403, 'پلانی ئەم فریلانسەرە ئۆفەری ڕاستەوخۆ وەرناگرێت.');
    }

    $id = 'inv_' . time() . rand(10, 99);
    $companyName = $authUser['company_name'] ?: $authUser['name'];
    $pdo->prepare('
        INSERT INTO invitations (id, company_id, company_name, freelancer_id, freelancer_name, job_title, salary_offer, message, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ')->execute([
        $id, $authUser['id'], $companyName, $freelancerId, $freelancer['name'],
        $jobTitle, sanitize($input['salary_offer'] ?? '', 50), sanitize($input['message'] ?? '', 1000),
        'pending', date('Y-m-d H:i:s'),
    ]);

    notifyUser($pdo, $freelancerId, 'ئۆفەری کاری نوێ 💼', "{$companyName} ئۆفەرێکی نارد بۆت: \"{$jobTitle}\"", '/cvs');

    echo json_encode(['success' => true, 'invitation_id' => $id]);
    exit(0);
}

// List invitations  GET /invitations  (role-aware: sent for employer, received for freelancer)
if (preg_match('#/invitations$#', $uri) && $method === 'GET') {
    $authUser = requireAuth($pdo);
    if ($authUser['role'] === 'employer') {
        $stmt = $pdo->prepare('SELECT * FROM invitations WHERE company_id = ? ORDER BY created_at DESC');
    } else {
        $stmt = $pdo->prepare('SELECT * FROM invitations WHERE freelancer_id = ? ORDER BY created_at DESC');
    }
    $stmt->execute([$authUser['id']]);
    echo json_encode(['success' => true, 'invitations' => $stmt->fetchAll()]);
    exit(0);
}

// Respond to an invitation  POST /invitations/*/respond  (freelancer only, own invitation)
if (preg_match('#/invitations/.*?/respond$#', $uri) && $method === 'POST') {
    $authUser = requireAuth($pdo);
    $input = safeJson();
    preg_match('#/invitations/([^/]+)/respond$#', $uri, $m);
    $invId = $m[1] ?? '';
    $status = in_array($input['status'] ?? '', ['accepted', 'rejected'], true) ? $input['status'] : null;
    if (empty($invId) || !$status) jsonErr(400, 'Invalid request.');

    $inv = $pdo->prepare('SELECT * FROM invitations WHERE id = ? AND freelancer_id = ?');
    $inv->execute([$invId, $authUser['id']]);
    $inv = $inv->fetch();
    if (!$inv) jsonErr(404, 'Invitation not found.');

    $pdo->prepare('UPDATE invitations SET status = ?, responded_at = ? WHERE id = ?')
        ->execute([$status, date('Y-m-d H:i:s'), $invId]);

    $label = $status === 'accepted' ? 'قبووڵکرا ✓' : 'ڕەتکرایەوە';
    notifyUser($pdo, $inv['company_id'], "ئۆفەرەکەت {$label}",
        "{$authUser['name']} ئۆفەرەکەت بۆ \"{$inv['job_title']}\" {$label}", '/dashboard');

    echo json_encode(['success' => true]);
    exit(0);
}

// ================================================================
// ADMIN ROUTES — All protected by requireAdmin(): caller's own signed token + role check
// ================================================================

// Admin: Live Guard Security Monitoring  GET /admin/security/live
// Proxies Guard's read-only status feed for this site server-to-server, so the
// admin panel can show real live scan/uptime data instead of a static claim.
// Fails soft (never 500s the admin panel just because Guard is briefly down).
if (preg_match('#/admin/security/live$#', $uri) && $method === 'GET') {
    requireAdmin($pdo);

    $ch = curl_init(GUARD_STATUS_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 6,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = ($raw !== false && $status >= 200 && $status < 300) ? json_decode($raw, true) : null;

    echo json_encode([
        'success' => true,
        'available' => $data !== null,
        'guard' => $data, // { hostname, url, intervalSeconds, latest, history } or null if unreachable
    ]);
    exit(0);
}

// Admin: List All Users  GET /admin/users
// Every user, every role, with every field the admin panel's edit form
// actually shows — password hash excluded. Not paginated: this is a small
// jobs marketplace, not a scale where a few thousand rows is a real problem.
if (preg_match('#/admin/users$#', $uri) && $method === 'GET') {
    requireAdmin($pdo);
    $users = $pdo->query('
        SELECT id, name, phone, email, role, gender, governorate, district, sub_district, bio, avatar, cover,
               status, wallet_balance, ref_code, verified, skills, favorite_categories,
               company_name, company_reg, company_phone, company_email, industry, company_size, company_type,
               company_logo, company_cover, hiring_preferences, plan, plan_credits, plan_boost_until, created_at
        FROM users ORDER BY created_at DESC
    ')->fetchAll();
    echo json_encode(['success' => true, 'users' => $users]);
    exit(0);
}

// Admin: Full Database Inspector  GET /admin/database
if (preg_match('#/admin/database$#', $uri) && $method === 'GET') {
    requireAdmin($pdo);
    // Strip password hashes from output
    $users = $pdo->query('SELECT id, name, phone, email, role, governorate, district, sub_district, bio, avatar, status, wallet_balance, ref_code, verified, plan, plan_credits, plan_boost_until, profile_views, created_at FROM users ORDER BY created_at DESC')->fetchAll();
    $jobs  = $pdo->query('SELECT * FROM jobs ORDER BY created_at DESC')->fetchAll();
    $apps  = $pdo->query('SELECT * FROM applications ORDER BY created_at DESC')->fetchAll();

    $sizeRow = $pdo->query("
        SELECT SUM(data_length + index_length) AS bytes
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
    ")->fetch();

    echo json_encode([
        'success' => true,
        'engine' => 'pdo_mysql',
        'tables' => ['users' => $users, 'jobs' => $jobs, 'applications' => $apps],
        'db_size_bytes' => (int)($sizeRow['bytes'] ?? 0),
    ]);
    exit(0);
}

// Admin: Add User  POST /admin/users/add
if (preg_match('#/admin/users/add$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input    = safeJson();
    $userId   = 'usr_' . time() . rand(10, 99);
    $password = sanitize($input['password'] ?? bin2hex(random_bytes(6)), 100);

    $pdo->prepare('INSERT INTO users (id, name, phone, email, password, role, wallet_balance, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([
            $userId,
            sanitize($input['name']  ?? 'بەکارهێنەری نوێ', 100),
            sanitize($input['phone'] ?? '0750' . rand(1000000, 9999999), 20),
            sanitize($input['email'] ?? '', 150),
            hashPassword($password),
            in_array($input['role'] ?? '', ['freelancer', 'employer', 'admin', 'owner']) ? $input['role'] : 'freelancer',
            (int)($input['wallet_balance'] ?? 0),
            'active',
            date('Y-m-d H:i:s'),
        ]);
    notifyAdmins($pdo, 'user_added', ['id' => $userId]);
    echo json_encode(['success' => true, 'user_id' => $userId]);
    exit(0);
}

// Admin: Update User  POST /admin/users/update
if (preg_match('#/admin/users/update$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'User ID required.');

    $target = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $target->execute([$id]);
    $target = $target->fetch();
    if (!$target) jsonErr(404, 'User not found.');

    $name    = sanitize($input['name']  ?? $target['name'], 100);
    $email   = sanitize($input['email'] ?? $target['email'] ?? '', 150);
    $role    = in_array($input['role'] ?? '', ['freelancer', 'employer', 'admin', 'owner']) ? $input['role'] : $target['role'];
    $wallet  = isset($input['wallet_balance']) && is_numeric($input['wallet_balance']) ? (int)$input['wallet_balance'] : (int)$target['wallet_balance'];

    // Plan ids are entirely admin-authored (plan_tiers is admin-managed, not a
    // fixed free/pro/vip set) — validate against the real table instead of a
    // stale hardcoded list, or any custom plan an admin created would get
    // silently rejected here. Empty string explicitly clears the plan.
    if (array_key_exists('plan', $input) && $input['plan'] === '') {
        $plan = null;
    } elseif (!empty($input['plan'])) {
        $planCheck = $pdo->prepare('SELECT id FROM plan_tiers WHERE id = ?');
        $planCheck->execute([sanitize($input['plan'], 30)]);
        $plan = $planCheck->fetch() ? $input['plan'] : ($target['plan'] ?? null);
    } else {
        $plan = $target['plan'] ?? null;
    }
    $planCredits = isset($input['plan_credits']) && is_numeric($input['plan_credits']) ? (int)$input['plan_credits'] : (int)($target['plan_credits'] ?? 0);
    $planBoostUntil = array_key_exists('plan_boost_until', $input) ? sanitize((string)$input['plan_boost_until'], 32) : ($target['plan_boost_until'] ?? null);

    // Full profile-field access, same fields /auth/me itself accepts — every
    // one already falls back to the existing DB value when omitted.
    $phone        = sanitize($input['phone']        ?? $target['phone']        ?? '', 30);
    $governorate  = sanitize($input['governorate']   ?? $target['governorate']  ?? '', 100);
    $district     = sanitize($input['district']      ?? $target['district']     ?? '', 100);
    $subDistrict  = sanitize($input['sub_district']   ?? $target['sub_district']  ?? '', 100);
    $bio          = sanitize($input['bio']            ?? $target['bio']           ?? '', 500);
    $avatar       = sanitize($input['avatar']         ?? $target['avatar']        ?? '', 800000);
    $cover        = sanitize($input['cover']          ?? $target['cover']         ?? '', 800000);
    $gender       = in_array($input['gender'] ?? '', ['male', 'female'], true) ? $input['gender'] : ($target['gender'] ?? 'male');
    $verified     = array_key_exists('verified', $input) ? (!empty($input['verified']) ? 1 : 0) : (int)($target['verified'] ?? 0);
    $status       = in_array($input['status'] ?? '', ['active', 'blocked', 'frozen'], true) ? $input['status'] : ($target['status'] ?? 'active');

    $companyName  = sanitize($input['company_name']  ?? $target['company_name']  ?? '', 200);
    $companyReg   = sanitize($input['company_reg']   ?? $target['company_reg']   ?? '', 100);
    $companyPhone = sanitize($input['company_phone'] ?? $target['company_phone'] ?? '', 30);
    $companyEmail = sanitize($input['company_email'] ?? $target['company_email'] ?? '', 150);
    $industry     = sanitize($input['industry']      ?? $target['industry']      ?? '', 100);
    $companySize  = in_array($input['company_size'] ?? '', ['small', 'medium', 'large'], true) ? $input['company_size'] : ($target['company_size'] ?? null);
    $companyType  = in_array($input['company_type'] ?? '', ['sole_proprietor', 'partnership', 'government', 'private'], true) ? $input['company_type'] : ($target['company_type'] ?? null);
    $companyLogo  = sanitize($input['company_logo']  ?? $target['company_logo']  ?? '', 800000);
    $companyCover = sanitize($input['company_cover'] ?? $target['company_cover'] ?? '', 800000);

    $skills = $input['skills'] ?? null;
    if (is_array($skills)) $skills = json_encode(array_values($skills));
    if (!is_string($skills)) $skills = $target['skills'] ?? '[]';

    $favCats = $input['favorite_categories'] ?? null;
    if (is_array($favCats)) $favCats = json_encode(array_values($favCats));
    if (!is_string($favCats)) $favCats = $target['favorite_categories'] ?? '[]';

    $hiringPrefs = $input['hiring_preferences'] ?? null;
    if (is_array($hiringPrefs)) $hiringPrefs = json_encode($hiringPrefs, JSON_UNESCAPED_UNICODE);
    if (!is_string($hiringPrefs)) $hiringPrefs = $target['hiring_preferences'] ?? '{}';

    // Only an owner can promote/demote another account to or from admin/owner
    if (in_array($role, ['admin', 'owner'], true) && $role !== $target['role'] && ($adminUser['role'] ?? '') !== 'owner') {
        jsonErr(403, 'Forbidden: only an owner can grant admin/owner roles.');
    }

    // Never allow the last remaining owner to be demoted — the platform must always have one
    if ($target['role'] === 'owner' && $role !== 'owner') {
        $ownerCount = (int)$pdo->query("SELECT COUNT(*) c FROM users WHERE role = 'owner'")->fetch()['c'];
        if ($ownerCount <= 1) jsonErr(403, 'ناتوانرێت دوایین ئەژمێری خاوەن لابدرێت.');
    }

    $pdo->prepare('
        UPDATE users SET
            name = ?, email = ?, role = ?, wallet_balance = ?, plan = ?, plan_credits = ?, plan_boost_until = ?,
            phone = ?, governorate = ?, district = ?, sub_district = ?, bio = ?, avatar = ?, cover = ?, gender = ?,
            verified = ?, status = ?, company_name = ?, company_reg = ?, company_phone = ?, company_email = ?,
            industry = ?, company_size = ?, company_type = ?, company_logo = ?, company_cover = ?,
            skills = ?, favorite_categories = ?, hiring_preferences = ?
        WHERE id = ?
    ')->execute([
            $name, $email, $role, $wallet, $plan, $planCredits, $planBoostUntil,
            $phone, $governorate, $district, $subDistrict, $bio, $avatar, $cover, $gender,
            $verified, $status, $companyName, $companyReg, $companyPhone, $companyEmail,
            $industry, $companySize, $companyType, $companyLogo, $companyCover,
            $skills, $favCats, $hiringPrefs,
            $id,
        ]);

    notifyAdmins($pdo, 'user_updated', ['id' => $id]);

    $updated = $pdo->prepare('SELECT id, name, phone, email, role, gender, governorate, district, sub_district, bio, avatar, cover, status, wallet_balance, ref_code, verified, skills, favorite_categories, company_name, company_reg, company_phone, company_email, industry, company_size, company_type, company_logo, company_cover, hiring_preferences, plan, plan_credits, plan_boost_until, created_at FROM users WHERE id = ?');
    $updated->execute([$id]);
    echo json_encode(['success' => true, 'user' => $updated->fetch()]);
    exit(0);
}

// Admin: Block/Unblock User  POST /admin/users/block
if (preg_match('#/admin/users/block$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input  = safeJson();
    $id     = sanitize($input['id'] ?? $_GET['id'] ?? '', 50);
    $status = in_array($input['status'] ?? '', ['active', 'blocked', 'frozen'], true) ? $input['status'] : 'blocked';

    if (empty($id)) jsonErr(400, 'User ID required.');

    $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
    $target->execute([$id]);
    $target = $target->fetch();
    if ($target && $target['role'] === 'owner') jsonErr(403, 'ناتوانرێت ئەژمێری خاوەن ڕابگیرێت.');

    $pdo->prepare('UPDATE users SET status = ? WHERE id = ?')->execute([$status, $id]);
    notifyAdmins($pdo, 'user_blocked', ['id' => $id, 'status' => $status]);
    echo json_encode(['success' => true, 'id' => $id, 'status' => $status]);
    exit(0);
}

// Admin: Verify/Unverify a company  POST /admin/users/verify
if (preg_match('#/admin/users/verify$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input    = safeJson();
    $id       = sanitize($input['id'] ?? '', 50);
    $verified = !empty($input['verified']) ? 1 : 0;
    if (empty($id)) jsonErr(400, 'User ID required.');

    $pdo->prepare('UPDATE users SET verified = ? WHERE id = ?')->execute([$verified, $id]);
    notifyAdmins($pdo, 'user_verified', ['id' => $id, 'verified' => $verified]);
    echo json_encode(['success' => true, 'id' => $id, 'verified' => $verified]);
    exit(0);
}

// Admin: Delete User  POST /admin/users/delete
// If the account is a company (employer), cascade-deletes its jobs and any
// applications submitted against those jobs, so no orphaned listings remain.
// Owner accounts can never be deleted through this endpoint.
if (preg_match('#/admin/users/delete$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'User ID required.');

    $target = $pdo->prepare('SELECT role FROM users WHERE id = ?');
    $target->execute([$id]);
    $target = $target->fetch();
    if ($target && $target['role'] === 'owner') jsonErr(403, 'ناتوانرێت ئەژمێری خاوەن بسڕدرێتەوە.');

    $jobIds = $pdo->prepare('SELECT id FROM jobs WHERE company_id = ?');
    $jobIds->execute([$id]);
    $jobIds = array_column($jobIds->fetchAll(), 'id');

    if (!empty($jobIds)) {
        $placeholders = implode(',', array_fill(0, count($jobIds), '?'));
        $pdo->prepare("DELETE FROM applications WHERE job_id IN ($placeholders)")->execute($jobIds);
        $pdo->prepare('DELETE FROM jobs WHERE company_id = ?')->execute([$id]);
    }

    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    notifyAdmins($pdo, 'user_deleted', ['id' => $id]);
    echo json_encode(['success' => true, 'jobs_deleted' => count($jobIds)]);
    exit(0);
}

// Admin: Delete Job  POST /admin/jobs/delete
// Cascades to that job's own applications too — same reasoning as deleting a
// company account (below): a job with no jobs page behind it shouldn't leave
// orphaned applications still pointing at a job_id that no longer exists.
if (preg_match('#/admin/jobs/delete$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'Job ID required.');
    $pdo->prepare('DELETE FROM applications WHERE job_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM jobs WHERE id = ?')->execute([$id]);
    notifyAdmins($pdo, 'job_deleted', ['id' => $id]);
    echo json_encode(['success' => true]);
    exit(0);
}

// Admin: Approve a pending job posting  POST /admin/jobs/approve  { id }
if (preg_match('#/admin/jobs/approve$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $id = sanitize((safeJson())['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'Job ID required.');
    $job = $pdo->prepare('SELECT company_id, title_ku FROM jobs WHERE id = ?');
    $job->execute([$id]);
    $job = $job->fetch();
    if (!$job) jsonErr(404, 'Job not found.');

    $pdo->prepare("UPDATE jobs SET status = 'active' WHERE id = ?")->execute([$id]);
    if ($job['company_id']) {
        notifyUser($pdo, $job['company_id'], 'کارەکەت پەسەندکرا ✓', "\"{$job['title_ku']}\" ئێستا بۆ هەموو کاندیدەکان دیارە.", '/dashboard');
    }
    echo json_encode(['success' => true]);
    exit(0);
}

// Admin: Reject a pending job posting  POST /admin/jobs/reject  { id, reason }
if (preg_match('#/admin/jobs/reject$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id = sanitize($input['id'] ?? '', 50);
    $reason = trim(sanitize($input['reason'] ?? '', 500));
    if (empty($id)) jsonErr(400, 'Job ID required.');
    $job = $pdo->prepare('SELECT company_id, title_ku FROM jobs WHERE id = ?');
    $job->execute([$id]);
    $job = $job->fetch();
    if (!$job) jsonErr(404, 'Job not found.');

    $pdo->prepare("UPDATE jobs SET status = 'rejected' WHERE id = ?")->execute([$id]);
    if ($job['company_id']) {
        $msg = $reason ? "\"{$job['title_ku']}\" ڕەتکرایەوە: {$reason}" : "\"{$job['title_ku']}\" ڕەتکرایەوە لەلایەن بەڕێوەبەرەوە.";
        notifyUser($pdo, $job['company_id'], 'کارەکەت ڕەتکرایەوە', $msg, '/dashboard');
    }
    echo json_encode(['success' => true]);
    exit(0);
}

// Admin: Update Job  POST /admin/jobs/update
// Full-field edit, unlike the owner-employer-only /jobs/update — an admin
// may edit ANY job regardless of who owns it. Every field falls back to the
// job's existing value when omitted.
if (preg_match('#/admin/jobs/update$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 50);
    if (empty($id)) jsonErr(400, 'Job ID required.');

    $existing = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $existing->execute([$id]);
    $existing = $existing->fetch();
    if (!$existing) jsonErr(404, 'Job not found.');

    $skills = $input['required_skills'] ?? null;
    if (is_array($skills)) $skills = json_encode($skills);
    if (!is_string($skills)) $skills = $existing['required_skills'];

    $pdo->prepare('
        UPDATE jobs SET
            title_ku = ?, category = ?, job_type = ?, workplace_type = ?, governorate_id = ?,
            location_detail = ?, location_name = ?, salary_min = ?, salary_max = ?,
            description = ?, required_skills = ?, deadline = ?, status = ?,
            company_name = ?, company_phone = ?, company_email = ?
        WHERE id = ?
    ')->execute([
        sanitize($input['title_ku'] ?? $input['title'] ?? $existing['title_ku'], 200),
        sanitize($input['category'] ?? $existing['category'], 50),
        in_array($input['job_type'] ?? '', ['fullTime', 'partTime', 'contract', 'internship', 'remote'], true) ? $input['job_type'] : $existing['job_type'],
        in_array($input['workplace_type'] ?? '', ['onSite', 'remote', 'hybrid'], true) ? $input['workplace_type'] : $existing['workplace_type'],
        sanitize($input['governorate_id'] ?? $existing['governorate_id'], 50),
        sanitize($input['location_detail'] ?? $existing['location_detail'] ?? '', 300),
        sanitize($input['location_name'] ?? $existing['location_name'] ?? '', 300),
        isset($input['salary_min']) ? (int)$input['salary_min'] : $existing['salary_min'],
        isset($input['salary_max']) ? (int)$input['salary_max'] : $existing['salary_max'],
        sanitize($input['description'] ?? $existing['description'] ?? '', 3000),
        $skills,
        array_key_exists('deadline', $input) ? (!empty($input['deadline']) ? sanitize($input['deadline'], 20) : null) : $existing['deadline'],
        in_array($input['status'] ?? '', ['active', 'closed', 'draft'], true) ? $input['status'] : $existing['status'],
        sanitize($input['company_name'] ?? $existing['company_name'], 200),
        sanitize($input['company_phone'] ?? $existing['company_phone'] ?? '', 30),
        sanitize($input['company_email'] ?? $existing['company_email'] ?? '', 150),
        $id,
    ]);

    notifyAdmins($pdo, 'job_updated', ['id' => $id]);
    $updated = $pdo->prepare('SELECT * FROM jobs WHERE id = ?');
    $updated->execute([$id]);
    echo json_encode(['success' => true, 'job' => $updated->fetch()]);
    exit(0);
}

// Admin: Add Category  POST /admin/categories/add
if (preg_match('#/admin/categories/add$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input  = safeJson();
    $nameKu = sanitize($input['name_ku'] ?? '', 100);
    if (empty($nameKu)) jsonErr(400, 'ناوی پۆل پێویستە.');

    $id = sanitize($input['id'] ?? '', 60);
    if (empty($id)) {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $input['name_en'] ?? $nameKu));
        $id = 'cat_' . trim($slug, '_') . '_' . substr(bin2hex(random_bytes(2)), 0, 4);
    }

    $maxOrder = (int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) m FROM categories')->fetch()['m'];
    $parentId = sanitize($input['parent_id'] ?? '', 64);

    $pdo->prepare('INSERT INTO categories (id, name_ku, name_en, icon, parent_id, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([
            $id, $nameKu,
            sanitize($input['name_en'] ?? '', 100),
            sanitize($input['icon'] ?? '💼', 20),
            $parentId !== '' ? $parentId : null,
            $maxOrder + 1,
            date('Y-m-d H:i:s'),
        ]);

    echo json_encode(['success' => true, 'category' => ['id' => $id, 'name_ku' => $nameKu]]);
    exit(0);
}

// Admin: Update Category  POST /admin/categories/update
if (preg_match('#/admin/categories/update$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 60);
    if (empty($id)) jsonErr(400, 'Category ID required.');

    $existing = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
    $existing->execute([$id]);
    $existing = $existing->fetch();
    if (!$existing) jsonErr(404, 'Category not found.');

    $parentId = array_key_exists('parent_id', $input) ? sanitize($input['parent_id'] ?? '', 64) : ($existing['parent_id'] ?? '');

    $pdo->prepare('UPDATE categories SET name_ku = ?, name_en = ?, icon = ?, parent_id = ?, sort_order = ? WHERE id = ?')
        ->execute([
            sanitize($input['name_ku'] ?? $existing['name_ku'], 100),
            sanitize($input['name_en'] ?? $existing['name_en'] ?? '', 100),
            sanitize($input['icon'] ?? $existing['icon'], 20),
            $parentId !== '' ? $parentId : null,
            isset($input['sort_order']) && is_numeric($input['sort_order']) ? (int)$input['sort_order'] : $existing['sort_order'],
            $id,
        ]);

    echo json_encode(['success' => true]);
    exit(0);
}

// Admin: Delete Category  POST /admin/categories/delete
if (preg_match('#/admin/categories/delete$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input = safeJson();
    $id    = sanitize($input['id'] ?? '', 60);
    if (empty($id)) jsonErr(400, 'Category ID required.');
    $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
    echo json_encode(['success' => true]);
    exit(0);
}

// Admin: Reset Database (requires BOTH admin key AND confirmation phrase)
if (preg_match('#/admin/reset-database$#', $uri) && $method === 'POST') {
    requireAdmin($pdo);
    $input   = safeJson();
    $confirm = $input['confirm'] ?? '';
    if ($confirm !== 'ISHKHWAZ_RESET_CONFIRMED') {
        jsonErr(400, 'Confirmation phrase required: ISHKHWAZ_RESET_CONFIRMED');
    }
    $pdo->exec('DELETE FROM jobs');
    $pdo->exec('DELETE FROM applications');
    $pdo->exec('DELETE FROM push_notifications');
    // Never deletes users by default — pass wipe_users=true to also wipe
    if (($input['wipe_users'] ?? false) === true) $pdo->exec('DELETE FROM users');
    echo json_encode(['success' => true, 'message' => 'Database reset complete.']);
    exit(0);
}

// ================================================================
// Fallback — generic 404
// ================================================================
http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Endpoint not found.']);
