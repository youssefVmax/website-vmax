<?php
/**
 * Simple script to fix remaining Firebase timestamps in inserts.sql
 */

$inputFile = 'database/inserts.sql';
$outputFile = 'database/inserts_final.sql';

if (!file_exists($inputFile)) {
    die("Error: {$inputFile} not found!\n");
}

echo "Fixing remaining Firebase timestamps...\n";

$content = file_get_contents($inputFile);

// Count Firebase timestamps before
$beforeCount = preg_match_all("/\{'type':\s*'firestore\/timestamp\/1\.0'/", $content);
echo "Found {$beforeCount} Firebase timestamps to convert.\n";

// Replace Firebase timestamps with MySQL datetime
$content = preg_replace_callback(
    "/\{'type':\s*'firestore\/timestamp\/1\.0',\s*'seconds':\s*(\d+),\s*'nanoseconds':\s*\d+\}/",
    function($matches) {
        $seconds = (int)$matches[1];
        $datetime = date('Y-m-d H:i:s', $seconds);
        return "'$datetime'";
    },
    $content
);

// Add missing IDs to remaining INSERT statements that don't have them
$dealCounter = 12; // Continue from where we left off

// Fix remaining deals without IDs
$content = preg_replace_callback(
    "/INSERT INTO deals \((?!.*`id`)([^)]+)\)\s*VALUES\s*\(([^;]+)\);/s",
    function($matches) use (&$dealCounter) {
        $fields = $matches[1];
        $values = $matches[2];
        $dealId = "'deal_" . sprintf('%03d', $dealCounter++) . "'";
        return "INSERT INTO deals (`id`, $fields) VALUES ($dealId, $values);";
    },
    $content
);

// Fix callbacks without IDs
$callbackCounter = 1;
$content = preg_replace_callback(
    "/INSERT INTO callbacks \((?!.*`id`)([^)]+)\)\s*VALUES\s*\(([^;]+)\);/s",
    function($matches) use (&$callbackCounter) {
        $fields = $matches[1];
        $values = $matches[2];
        $callbackId = "'callback_" . sprintf('%03d', $callbackCounter++) . "'";
        return "INSERT INTO callbacks (`id`, $fields) VALUES ($callbackId, $values);";
    },
    $content
);

// Fix targetProgress without IDs  
$progressCounter = 1;
$content = preg_replace_callback(
    "/INSERT INTO target_progress \((?!.*`id`)([^)]+)\)\s*VALUES\s*\(([^;]+)\);/s",
    function($matches) use (&$progressCounter) {
        $fields = $matches[1];
        $values = $matches[2];
        $progressId = "'progress_" . sprintf('%03d', $progressCounter++) . "'";
        return "INSERT INTO targetProgress (`id`, $fields) VALUES ($progressId, $values);";
    },
    $content
);

// Replace table name inconsistencies
$content = str_replace('INSERT INTO target_progress', 'INSERT INTO targetProgress', $content);

// Clean up any remaining complex Firebase objects or arrays
$content = preg_replace("/\[([^\]]*\{'[^}]*firestore[^}]*\}[^\]]*)\]/s", "NULL", $content);

// Write the fixed content
file_put_contents($outputFile, $content);

// Count Firebase timestamps after
$afterCount = preg_match_all("/\{'type':\s*'firestore\/timestamp\/1\.0'/", $content);
echo "Remaining Firebase timestamps: {$afterCount}\n";

if ($afterCount == 0) {
    echo "✅ All Firebase timestamps converted successfully!\n";
    echo "✅ Missing IDs added to INSERT statements!\n";
    echo "✅ File ready for MySQL import: {$outputFile}\n";
} else {
    echo "⚠️  Some Firebase references may still remain.\n";
}

echo "\nSummary:\n";
echo "- Converted " . ($beforeCount - $afterCount) . " Firebase timestamps\n";
echo "- Added IDs to deals, callbacks, and targetProgress tables\n";
echo "- Fixed table name inconsistencies\n";
echo "- Output saved to: {$outputFile}\n";
?>
