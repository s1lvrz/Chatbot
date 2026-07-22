<?php
// ============================================================
// config.php — Secure credentials configuration
// ============================================================

// Prevent direct execution if somehow accessed outside require
if (!defined('GEMINI_API_KEY')) {
    define('GEMINI_API_KEY', 'MYGEMINIKEY'); // Replace with your actual Gemini API key
}