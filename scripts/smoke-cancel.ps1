# Customer cancel: exercises the _transition CANCELLED branch, which the
# payment provider's onOrderCancelled hook is responsible for. For COD
# the implementation flips the Payment row to FAILED with a reason.

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$EMAIL = "cancel-$(Get-Random)@anzara.local"
$PASSWORD = "CancelTest123!"

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

$reg = P "POST" "/api/auth/register" @{
  email = $EMAIL; password = $PASSWORD; firstName = "C"; lastName = "X"
}
$tok = ($reg.Content | ConvertFrom-Json).data.accessToken
$prod = (P "GET" "/api/products?limit=1").Content | ConvertFrom-Json
$vid = $prod.data.data[0].variants[0].id
P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 1 } $tok | Out-Null

$order = P "POST" "/api/orders" @{
  paymentMethod = "COD"
  shippingAddress = @{
    fullName = "C X"; phone = "+8801712345678"
    addressLine1 = "1"; city = "Dhaka"; district = "Dhaka"
    division = "Dhaka"; country = "Bangladesh"
  }
} $tok
$orderData = ($order.Content | ConvertFrom-Json).data
$orderId = $orderData.id
Write-Output ("order: " + $orderData.orderNumber + " status: " + $orderData.status + " payment: " + $orderData.payment.status)

$cancel = P "POST" "/api/orders/$orderId/cancel" $null $tok
Write-Output ("cancel: " + $cancel.StatusCode)
$cancelData = ($cancel.Content | ConvertFrom-Json).data
Write-Output ("status: " + $cancelData.status + " payment: " + $cancelData.payment.status)
Write-Output ("payment.failureReason: " + $cancelData.payment.failureReason)
Write-Output ("status history: " + $cancelData.statusHistory.Count + " entries")
