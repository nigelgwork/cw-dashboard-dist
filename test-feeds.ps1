# Test SSRS ATOMSVC Feed Templates
# Run this script in Windows PowerShell to verify feeds work

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CW Dashboard - Feed Template Tester" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$today = Get-Date -Format "MM/dd/yyyy"

# Test 1: Project Summary Feed
Write-Host "1. Testing Project Summary Feed..." -ForegroundColor Yellow
$url1 = "http://ntl-ssrs-01/ReportServer?%2FConnectWise%20Reports%2FProject%20Management%2FProject%20Manager%20Summary%20Report&ThruDate=$today&rs:ParameterLanguage=&rs:Command=Render&rs:Format=ATOM&rc:ItemPath=Tablix3"
try {
    $response = Invoke-WebRequest -Uri $url1 -UseDefaultCredentials -TimeoutSec 60
    $entries = [regex]::Matches($response.Content, "<entry>")
    if ($entries.Count -gt 0) {
        Write-Host "   SUCCESS: $($entries.Count) projects found" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: 0 entries (may need different parameters)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Opportunities Feed
Write-Host "2. Testing Opportunities Feed..." -ForegroundColor Yellow
$url2 = "http://ntl-ssrs-01/ReportServer?%2FConnectWise%20Reports%2FSales%2FOpportunity%20List&rs:ParameterLanguage=&rs:Command=Render&rs:Format=ATOM&rc:ItemPath=Tablix3"
try {
    $response = Invoke-WebRequest -Uri $url2 -UseDefaultCredentials -TimeoutSec 60
    $entries = [regex]::Matches($response.Content, "<entry>")
    if ($entries.Count -gt 0) {
        Write-Host "   SUCCESS: $($entries.Count) opportunities found" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: 0 entries (may need different parameters)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Service Tickets Feed
Write-Host "3. Testing Service Tickets Feed..." -ForegroundColor Yellow
$startDate = (Get-Date).AddYears(-1).ToString("MM/dd/yyyy")
$url3 = "http://ntl-ssrs-01/ReportServer?%2FConnectWise%20Reports%2FService%20Tickets%2FClient%20Service%20Ticket%20Status&StartDate=$startDate&EndDate=$today&rs:ParameterLanguage=&rs:Command=Render&rs:Format=ATOM&rc:ItemPath=Tablix3"
try {
    $response = Invoke-WebRequest -Uri $url3 -UseDefaultCredentials -TimeoutSec 60
    $entries = [regex]::Matches($response.Content, "<entry>")
    if ($entries.Count -gt 0) {
        Write-Host "   SUCCESS: $($entries.Count) service tickets found" -ForegroundColor Green
    } else {
        Write-Host "   WARNING: 0 entries (may need different parameters)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Project Detail Feed (with a sample project ID)
Write-Host "4. Testing Project Detail Feed (project 1028)..." -ForegroundColor Yellow
$url4 = "http://ntl-ssrs-01/ReportServer?%2FConnectWise%20Reports%2FProject%20Management%2FProject%20Summary%20Detailed%20Report&ProjectNo=1028&ThruDate=$today&rs:ParameterLanguage=&rs:Command=Render&rs:Format=ATOM&rc:ItemPath=Tablix1"
try {
    $response = Invoke-WebRequest -Uri $url4 -UseDefaultCredentials -TimeoutSec 60
    $entries = [regex]::Matches($response.Content, "<entry>")
    if ($entries.Count -gt 0) {
        Write-Host "   SUCCESS: $($entries.Count) detail entries found" -ForegroundColor Green

        # Try to extract status
        if ($response.Content -match "d:Status[^>]*>([^<]+)<") {
            Write-Host "   Project Status: $($Matches[1])" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   WARNING: 0 entries for project 1028" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests passed, your templates should work in the app." -ForegroundColor White
Write-Host "Run 'npm run dev' and import templates from Settings > Data Feeds" -ForegroundColor White
