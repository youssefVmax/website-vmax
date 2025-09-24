$filePath = "c:\Users\Admin\Downloads\website-vmax\components\sales-dashboard.tsx"
$content = Get-Content $filePath -Raw

# Update import statement
$content = $content -replace 'import \{ DashboardCharts \} from ''\.\/dashboard-charts'';', 'import { EnhancedDashboardCharts } from ''./enhanced-dashboard-charts'';'

# Update component usage
$content = $content -replace '<DashboardCharts userRole=\{userRole\} user=\{user\} \/>', '<EnhancedDashboardCharts userRole={userRole} user={user} />'

Set-Content $filePath -Value $content
Write-Host "Updated sales dashboard to use enhanced charts"
