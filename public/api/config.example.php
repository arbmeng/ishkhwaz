<?php
// Ish-khwaz — config template. Copy to config.php and fill in real values;
// config.php itself is git-ignored and never committed.

define('TOKEN_SECRET', 'replace-with-a-long-random-hex-string');

// ---- Zera Payment (plan purchases) ----
define('ZERA_PAYMENT_API_KEY', 'replace-with-zera-payment-api-key');
define('ZERA_PAYMENT_WEBHOOK_SECRET', 'replace-with-zera-payment-webhook-secret');
define('ZERA_PAYMENT_BASE_URL', 'https://pay.example.com/api');

// ---- OpenAI ----
define('OPENAI_API_KEY', 'sk-replace-with-real-key');

// ---- Guard (site monitoring) ----
define('GUARD_STATUS_URL', 'https://guard.example.com/api/monitor/status/replace-with-real-id');

// ---- Zera Console read-only stats feed ----
define('CONSOLE_STATS_TOKEN', 'replace-with-shared-token');

// ---- Zera Console single-sign-on ----
define('CONSOLE_ADMIN_MINT_SECRET', 'replace-with-shared-secret');

// ---- OAuth-style "Connect" clients ----
define('OAUTH_CLIENTS', [
    'example_client' => [
        'secret' => 'replace-with-client-secret',
        'redirect_uris' => ['https://example.com/oauth/callback'],
    ],
]);

// ---- Database ----
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');
define('DB_USER', 'your_db_user');
define('DB_PASS', 'your_db_password');

// ---- Pusher ----
define('PUSHER_APP_ID',  'replace-with-app-id');
define('PUSHER_KEY',     'replace-with-key');
define('PUSHER_SECRET',  'replace-with-secret');
define('PUSHER_CLUSTER', 'ap2');

// ---- Web Push VAPID private key ----
define('VAPID_PRIVATE_KEY', 'replace-with-vapid-private-key');

// ---- SMTP (Gmail App Password) ----
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'your-gmail-address@gmail.com');
define('SMTP_APP_PASSWORD', 'replace-with-a-gmail-app-password');
define('SMTP_FROM_NAME', 'Your App Name');
