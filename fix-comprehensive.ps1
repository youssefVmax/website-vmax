$filePath = "c:\Users\Admin\Downloads\website-vmax\components\sales-dashboard.tsx"
$content = Get-Content $filePath -Raw

# Update import statement for comprehensive analytics
$content = $content -replace 'import ComprehensiveAnalyticsDashboard from ''\.\/comprehensive-analytics-dashboard'';', 'import { EnhancedComprehensiveAnalytics } from ''./enhanced-comprehensive-analytics'';'

# Update component usage
$content = $content -replace '<ComprehensiveAnalyticsDashboard[^>]*\/>', '<EnhancedComprehensiveAnalytics userRole={userRole} userId={user?.id} userName={user?.name} managedTeam={user?.managedTeam} />'

Set-Content $filePath -Value $content
Write-Host "Updated sales dashboard to use enhanced comprehensive analytics"
