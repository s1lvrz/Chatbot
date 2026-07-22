<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json; charset=utf-8');

// Include security config from parent directory
require_once __DIR__ . '/../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$audioBase64 = $input['audio'] ?? '';
$mimeType    = $input['mimeType'] ?? 'audio/webm';

if (empty($audioBase64)) {
    http_response_code(400);
    echo json_encode(['error' => 'No audio data provided']);
    exit;
}

if (!defined('GEMINI_API_KEY') || GEMINI_API_KEY === 'AIzaSyYourActualGeminiApiKeyHere') {
    http_response_code(500);
    echo json_encode(['error' => 'Gemini API key is missing or not configured in config.php']);
    exit;
}

$model = 'gemini-3.6-flash';
$url   = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . GEMINI_API_KEY;

// Strict instruction to act ONLY as a transcription engine
$prompt = "You are a highly accurate transcription engine. Transcribe the following audio exactly as spoken in its original language (either English or Arabic). Do not translate it, do not answer it, and do not add any extra text, commentary, or punctuation outside of what was spoken.";

$body = json_encode([
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt],
                [
                    'inline_data' => [
                        'mime_type' => $mimeType,
                        'data'      => $audioBase64
                    ]
                ]
            ]
        ]
    ]
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
unset($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'cURL connection failure: ' . $curlErr]);
    exit;
}

$data = json_decode($response, true);
if ($httpCode >= 400) {
    http_response_code(502);
    echo json_encode(['error' => 'Gemini API rejected request', 'details' => $data]);
    exit;
}

$transcription = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

// Return the text back to the frontend
echo json_encode(['text' => trim($transcription)], JSON_UNESCAPED_UNICODE);