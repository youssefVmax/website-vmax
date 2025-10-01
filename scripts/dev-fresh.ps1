# PowerShell script to clear .next folder and start fresh development
Write-Host "🧹 Clearing Next.js cache and build files..." -ForegroundColor Yellow

# Clear .next folder
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Cleared .next folder" -ForegroundColor Green
} else {
    Write-Host "ℹ️ .next folder doesn't exist" -ForegroundColor Blue
}

# Clear node_modules/.cache if it exists
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ Cleared node_modules cache" -ForegroundColor Green
}

# Clear npm cache
Write-Host "🗑️ Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "🚀 Starting fresh development server..." -ForegroundColor Cyan
npm run dev
