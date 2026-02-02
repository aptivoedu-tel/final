# Open Supabase Dashboard SQL Editor
# This script opens your Supabase SQL Editor in the default browser

$supabaseProjectId = "gkggwmxndvztbsibdyph"
$sqlEditorUrl = "https://supabase.com/dashboard/project/$supabaseProjectId/sql"

Write-Host "🚀 Opening Supabase SQL Editor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Project ID: $supabaseProjectId" -ForegroundColor Yellow
Write-Host "URL: $sqlEditorUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Green
Write-Host "1. Click 'New Query' in the SQL Editor" -ForegroundColor White
Write-Host "2. Copy the contents of 'COMPLETE_FIX_ADMIN_LOGIN.sql'" -ForegroundColor White
Write-Host "3. Paste into the editor and click 'RUN'" -ForegroundColor White
Write-Host ""

# Open in default browser
Start-Process $sqlEditorUrl

Write-Host "✅ Browser opened!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 For detailed instructions, see: COMPLETE_SOLUTION.md" -ForegroundColor Cyan
