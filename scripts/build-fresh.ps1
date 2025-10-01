# PowerShell script to clear cache and build fresh for production
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

Write-Host "🔨 Building fresh production build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "🚀 Starting production server..." -ForegroundColor Cyan
    npm run start
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
