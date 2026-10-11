# Tests:
#  - GET /api/payments/methods returns COD only today
#  - POST /api/orders with paymentMethod=SSLCOMMERZ is rejected (not enabled)

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$EMAIL = "pmt-$(Get-Random)@anzara.local"
$PASSWORD = "PaymentTest123!"

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

Write-Output "==> GET /api/payments/methods"
$methods = P "GET" "/api/payments/methods"
$methodsData = ($methods.Content | ConvertFrom-Json).data
Write-Output ("status: " + $methods.StatusCode)
$methodsData.methods | Format-Table | Out-String | Write-Output

Write-Output "==> Register + add to cart"
$reg = P "POST" "/api/auth/register" @{
  email = $EMAIL; password = $PASSWORD; firstName = "P"; lastName = "M"
}
$tok = ($reg.Content | ConvertFrom-Json).data.accessToken
$prod = (P "GET" "/api/products?limit=1").Content | ConvertFrom-Json
$vid = $prod.data.data[0].variants[0].id
P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 1 } $tok | Out-Null

Write-Output "==> Try to place order with paymentMethod=SSLCOMMERZ (should fail)"
try {
  $bad = P "POST" "/api/orders" @{
    paymentMethod = "SSLCOMMERZ"
    shippingAddress = @{
      fullName = "P M"; phone = "+8801712345678"
      addressLine1 = "1"; city = "Dhaka"; district = "Dhaka"
      division = "Dhaka"; country = "Bangladesh"
    }
  } $tok
  Write-Output ("UNEXPECTED 2xx: " + $bad.StatusCode)
  Write-Output $bad.Content
} catch {
  $resp = $_.Exception.Response
  Write-Output ("status: " + [int]$resp.StatusCode + " (expected non-2xx)")
  $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
  Write-Output $sr.ReadToEnd()
}

Write-Output "==> Place order with paymentMethod=COD (should succeed)"
$ok = P "POST" "/api/orders" @{
  paymentMethod = "COD"
  shippingAddress = @{
    fullName = "P M"; phone = "+8801712345678"
    addressLine1 = "1"; city = "Dhaka"; district = "Dhaka"
    division = "Dhaka"; country = "Bangladesh"
  }
} $tok
Write-Output ("status: " + $ok.StatusCode)
$okData = ($ok.Content | ConvertFrom-Json).data
Write-Output ("orderNumber: " + $okData.orderNumber + " status: " + $okData.status)
