<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
// Set JSON response header with UTF-8 encoding for Arabic support
header('Content-Type: application/json; charset=utf-8');

// Include security config from parent directory
require_once __DIR__ . '/../config.php';

// Allow only HTTP POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Read and decode JSON payload from app.js
$input  = json_decode(file_get_contents('php://input'), true);
$prompt = isset($input['prompt']) ? trim($input['prompt']) : '';

if ($prompt === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Please provide a valid prompt']);
    exit;
}

// Verify API Key configuration
if (!defined('GEMINI_API_KEY') || GEMINI_API_KEY === 'AIzaSyYourActualGeminiApiKeyHere') {
    http_response_code(500);
    echo json_encode(['error' => 'Gemini API key is missing or not configured in config.php']);
    exit;
}

// Set up Gemini API request payload
$model = 'gemini-3.6-flash';
$url   = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . GEMINI_API_KEY;

$body = json_encode([
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ]
]);

// Initialize cURL Session
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
// Note: curl_close() is no longer needed (and is deprecated) as of PHP 8.5 —
// the CurlHandle object is automatically freed when it goes out of scope.
unset($ch);

// Handle Connection / Server Errors
if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'cURL connection failure: ' . $curlErr]);
    exit;
}

$data = json_decode($response, true);
if ($httpCode >= 400) {
    http_response_code(502);
    echo json_encode([
        'error' => 'Gemini API rejected request',
        'details' => $data
    ]);
    exit;
}

$reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'No response content returned from model.';

echo json_encode(['reply' => $reply], JSON_UNESCAPED_UNICODE);
