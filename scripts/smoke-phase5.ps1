#!/usr/bin/env pwsh
# Phase 5 smoke test: SEO endpoints + analytics setting + admin dashboard
#
# Assumes backend on :4000, storefront on :3000, admin on :3001.
# Exits non-zero on first failure.
$ErrorActionPreference = "Stop"
$api   = "http://localhost:4000"
$store = "http://localhost:3000"
$admin = "http://localhost:3001"

function Pass($msg) { Write-Host "[ OK ] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }
function Step($msg) { Write-Host "[ .. ] $msg" -ForegroundColor Cyan }

# PowerShell's Invoke-WebRequest doesn't expose Content-Type reliably.
# We use curl for header checks; Invoke-WebRequest is fine for bodies.
# Note: curl.exe writes its own progress lines to stderr on some shells;
# we use --no-progress-meter and capture stdout as [string].
function Get-Status($url) {
  $line = curl.exe -s -o NUL -w "%{http_code} %{content_type}" $url
  return [string]$line
}
function Get-Body($url) {
  $raw = curl.exe -s $url
  if ($raw -is [array]) { return [string]::Join("`n", $raw) }
  return [string]$raw
}

# 1. Sitemap
Step "GET $api/sitemap.xml"
$line = Get-Status "$api/sitemap.xml"
$parts = $line -split ' ', 2
$code = $parts[0]
$ctype = $parts[1]
if ($code -ne '200') { Fail "sitemap status $code" }
if ($ctype -notmatch 'xml') { Fail "sitemap wrong content-type: $ctype" }
$body = Get-Body "$api/sitemap.xml"
if ($body -notmatch '<urlset') { Fail "sitemap missing <urlset>" }
if ($body -notmatch '/products/') { Fail "sitemap has no product URLs" }
if ($body -notmatch '/categories/') { Fail "sitemap has no category URLs" }
Pass "sitemap.xml is valid and includes products + categories"

# 2. Robots
Step "GET $api/robots.txt"
$line = Get-Status "$api/robots.txt"
$parts = $line -split ' ', 2
if ($parts[0] -ne '200') { Fail "robots status $($parts[0])" }
$body = Get-Body "$api/robots.txt"
if ($body -notmatch 'User-agent') { Fail "robots missing User-agent" }
if ($body -notmatch 'Sitemap:') { Fail "robots missing Sitemap:" }
Pass "robots.txt is valid"

# 3. Storefront serves Organization JSON-LD
Step "GET $store/ (look for JSON-LD)"
$html = Get-Body "$store/"
if ($html -notmatch 'application/ld\+json') { Fail "storefront home has no JSON-LD" }
if ($html -notmatch '"@type":"Organization"') { Fail "storefront home has no Organization JSON-LD" }
if ($html -notmatch '"@type":"WebSite"') { Fail "storefront home has no WebSite JSON-LD" }
Pass "storefront home serves Organization + WebSite JSON-LD"

# 4. PDP serves Product JSON-LD
Step "GET $store/products/floral-festive-dress (look for Product JSON-LD)"
$html = Get-Body "$store/products/floral-festive-dress"
if ($html -notmatch '"@type":"Product"') { Fail "PDP has no Product JSON-LD" }
if ($html -notmatch '"@type":"BreadcrumbList"') { Fail "PDP has no BreadcrumbList JSON-LD" }
if ($html -notmatch 'application/ld\+json') { Fail "PDP has no JSON-LD" }
Pass "PDP serves Product + BreadcrumbList JSON-LD"

# 5. Admin dashboard endpoint
Step "Login as admin + GET /api/admin/dashboard"
$body = @{ email = 'admin@anzara.com'; password = 'AnzaraAdmin@2026' } | ConvertTo-Json
$login = Invoke-WebRequest -Uri "$api/api/auth/admin/login" -Method POST -Headers @{ 'Content-Type' = 'application/json' } -Body $body -UseBasicParsing
$tok = ($login.Content | ConvertFrom-Json).data.accessToken
if (-not $tok) { Fail "admin login did not return a token" }
$h = @{ 'Authorization' = "Bearer $tok" }
$dash = Invoke-WebRequest -Uri "$api/api/admin/dashboard" -Method GET -Headers $h -UseBasicParsing
if ($dash.StatusCode -ne 200) { Fail "dashboard status $($dash.StatusCode)" }
$d = ($dash.Content | ConvertFrom-Json).data
foreach ($k in 'ordersToday','revenueLast30Days','pendingReviews','lowStockCount','lowStockItems','recentOrders') {
  if ($null -eq $d.$k) { Fail "dashboard missing field: $k" }
}
Pass "admin dashboard returns ordersToday=$($d.ordersToday), revenue=$($d.revenueLast30Days.total)"

# 6. Public settings (used to drive analytics)
Step "GET public settings from API (no auth)"
$pub = Get-Body "$api/api/public/settings"
if ($pub -notmatch 'success') { Fail "public settings response not parseable" }
Pass "public settings endpoint reachable"

# 7. Storefront HTML looks healthy
if ($html.Length -lt 1000) { Fail "PDP HTML suspiciously short ($($html.Length) chars)" }
Pass "storefront HTML looks healthy"

Write-Host ""
Write-Host "Phase 5 smoke: ALL CHECKS PASSED" -ForegroundColor Green
