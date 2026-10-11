# Stock-oversell test: try to add more than available, expect 4xx and no decrement.
$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$EMAIL = "oversell-$(Get-Random)@anzara.local"
$PASSWORD = "OversellTest123!"

function P($method, $path, $body = $null, $token = $null) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{
    Uri = "$BASE$path"; Method = $method; Headers = $headers
    UseBasicParsing = $true; TimeoutSec = 10
  }
  if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 10) }
  return Invoke-WebRequest @params
}

$reg = P "POST" "/api/auth/register" @{ email = $EMAIL; password = $PASSWORD; firstName = "O"; lastName = "S" }
$tok = ($reg.Content | ConvertFrom-Json).data.accessToken

# Find a variant with low stock
$prod = (P "GET" "/api/products?limit=50").Content | ConvertFrom-Json
$variant = $null
foreach ($p in $prod.data.data) {
  foreach ($v in $p.variants) {
    if ($v.stockQuantity -lt 10 -and $v.stockQuantity -gt 0) {
      $variant = $v
      break
    }
  }
  if ($variant) { break }
}
if (-not $variant) {
  Write-Output "no low-stock variant found, exiting"
  exit 0
}
Write-Output ("trying: " + $variant.sku + " stock=" + $variant.stockQuantity)
$try = $variant.stockQuantity + 5

# Add max allowed
$ok = P "POST" "/api/cart/items" @{ variantId = $variant.id; quantity = $variant.stockQuantity } $tok
Write-Output ("add max: " + $ok.StatusCode)
$okData = ($ok.Content | ConvertFrom-Json).data
Write-Output ("cart itemCount: " + $okData.itemCount + " for variant: " + $okData.items[0].variantSku)

# Try to add 1 more (should be 400, wrapped in try)
try {
  $bad = P "POST" "/api/cart/items" @{ variantId = $variant.id; quantity = 1 } $tok
  Write-Output ("add overstock (unexpected 2xx): " + $bad.StatusCode)
  Write-Output $bad.Content
} catch {
  $resp = $_.Exception.Response
  Write-Output ("add overstock status: " + [int]$resp.StatusCode + " (expected 400)")
  $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
  Write-Output $sr.ReadToEnd()
}
