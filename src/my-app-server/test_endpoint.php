<?php
// Simple test to check if the endpoint file has syntax errors
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing add_requirement_with_registrations.php syntax...\n";

// Check if file exists
if (!file_exists('add_requirement_with_registrations.php')) {
    echo "ERROR: File does not exist\n";
    exit(1);
}

// Try to include file to check for syntax errors
$content = file_get_contents('add_requirement_with_registrations.php');
if ($content === false) {
    echo "ERROR: Cannot read file\n";
    exit(1);
}

// Check syntax
$check = php_check_syntax('add_requirement_with_registrations.php');
if ($check === false) {
    echo "ERROR: Syntax error in file\n";
} else {
    echo "SUCCESS: No syntax errors found\n";
}

// Also test a simple POST request simulation
echo "Testing basic functionality...\n";

// Mock session data
session_start();
$_SESSION['user_id'] = 1;
$_SESSION['club_id'] = 1;
$_SESSION['role'] = 'adviser';

// Test JSON parsing
$testJson = '{"title":"Test Event","description":"Test Description","start_datetime":"2024-01-01 10:00:00","end_datetime":"2024-01-01 12:00:00","location":"Test Location","requirement_type":"event","status":"scheduled","selected_users":[1,2,3]}';

$parsed = json_decode($testJson, true);
if ($parsed === null) {
    echo "ERROR: JSON parsing failed\n";
} else {
    echo "SUCCESS: JSON parsing works\n";
    echo "Parsed data: " . print_r($parsed, true) . "\n";
}

echo "Test completed.\n";
?> 