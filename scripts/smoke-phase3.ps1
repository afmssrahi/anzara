# End-to-end smoke for Phase 3 (cart + checkout + admin status).
# - Registers a customer, logs in, gets an address, adds to cart, places a
#   COD order, then logs in as admin, advances the order to DELIVERED.

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$EMAIL = "smoke-$(Get-Random)@anzara.local"
$PASSWORD = "SmokeTest123!"

function P($method, $path, $body = $null, $token = $null) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($token) { $headers["Authorization"] = "Bearer $token" }
  $params = @{
    Uri = "$BASE$path"
    Method = $method
    Headers = $headers
    UseBasicParsing = $true
    TimeoutSec = 10
  }
  if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 10) }
  return Invoke-WebRequest @params
}

function Dump($label, $obj) {
  Write-Output "----- $label -----"
  $obj | ConvertTo-Json -Depth 10
  Write-Output "----- end $label -----"
}

Write-Output "==> Register customer"
$reg = P "POST" "/api/auth/register" @{
  email = $EMAIL; password = $PASSWORD
  firstName = "Smoke"; lastName = "Tester"; phone = "+8801712345678"
}
Write-Output ("register: " + $reg.StatusCode)
$regJson = ($reg.Content) | ConvertFrom-Json
$customerToken = $regJson.data.accessToken

Write-Output "==> Get a variant"
$prod = P "GET" "/api/products?limit=1"
$prodJson = ($prod.Content) | ConvertFrom-Json
$product = $prodJson.data.data[0]
$variant = $product.variants[0]
Write-Output ("variant: " + $variant.id + " (" + $variant.sku + ")")

Write-Output "==> Add to cart"
$cartResp = P "POST" "/api/cart/items" @{ variantId = $variant.id; quantity = 2 } $customerToken
Write-Output ("add: " + $cartResp.StatusCode)
$cartData = (($cartResp.Content) | ConvertFrom-Json).data
Write-Output ("cart itemCount: " + $cartData.itemCount)

Write-Output "==> Update cart item qty to 3"
$item = $cartData.items[0]
$upd = P "PATCH" "/api/cart/items/$($item.id)" @{ itemId = $item.id; quantity = 3 } $customerToken
Write-Output ("update: " + $upd.StatusCode)

Write-Output "==> Place COD order"
$orderResp = P "POST" "/api/orders" @{
  paymentMethod = "COD"
  shippingAddress = @{
    fullName = "Smoke Tester"
    phone = "+8801712345678"
    addressLine1 = "House 12, Road 7"
    addressLine2 = "Apt 3B"
    city = "Dhaka"
    district = "Dhaka"
    division = "Dhaka"
    postalCode = "1207"
    country = "Bangladesh"
    isDefault = $true
  }
  customerNote = "Please ring the bell twice"
} $customerToken
Write-Output ("place: " + $orderResp.StatusCode)
$orderData = (($orderResp.Content) | ConvertFrom-Json).data
$orderId = $orderData.id
$orderNumber = $orderData.orderNumber
Write-Output ("order: " + $orderId + " / " + $orderNumber)
Dump "placed order" $orderData

Write-Output "==> List my orders"
$list = P "GET" "/api/orders?limit=5" $null $customerToken
$listData = (($list.Content) | ConvertFrom-Json).data
Write-Output ("list count: " + $listData.Count + " / meta.total: " + $listData.meta.total)

Write-Output "==> Get my order"
$mine = P "GET" "/api/orders/$orderId" $null $customerToken
Write-Output ("get: " + $mine.StatusCode)

Write-Output "==> Log in as admin"
$admin = P "POST" "/api/auth/admin/login" @{ email = "admin@anzara.com"; password = "AnzaraAdmin@2026" }
Write-Output ("admin login: " + $admin.StatusCode)
$adminToken = ($admin.Content | ConvertFrom-Json).data.accessToken

Write-Output "==> Admin: list orders"
$adminList = P "GET" "/api/admin/orders?limit=5" $null $adminToken
$adminListData = (($adminList.Content) | ConvertFrom-Json).data
Write-Output ("admin list count: " + $adminListData.Count + " / meta.total: " + $adminListData.meta.total)

Write-Output "==> Admin: get order"
$admGet = P "GET" "/api/admin/orders/$orderId" $null $adminToken
$admGetData = (($admGet.Content) | ConvertFrom-Json).data
Write-Output ("admin sees customer: " + $admGetData.customer.email)

Write-Output "==> Admin: advance PENDING -> CONFIRMED"
$st1 = P "PATCH" "/api/admin/orders/$orderId/status" @{ status = "CONFIRMED" } $adminToken
$st1Data = (($st1.Content) | ConvertFrom-Json).data
Write-Output ("status1: " + $st1.StatusCode + " -> " + $st1Data.status)

Write-Output "==> Admin: CONFIRMED -> PROCESSING"
$st2 = P "PATCH" "/api/admin/orders/$orderId/status" @{ status = "PROCESSING" } $adminToken
$st2Data = (($st2.Content) | ConvertFrom-Json).data
Write-Output ("status2: " + $st2.StatusCode + " -> " + $st2Data.status)

Write-Output "==> Admin: PROCESSING -> SHIPPED (with tracking)"
$st3 = P "PATCH" "/api/admin/orders/$orderId/status" @{ status = "SHIPPED" } $adminToken
$st3Data = (($st3.Content) | ConvertFrom-Json).data
Write-Output ("status3: " + $st3.StatusCode + " -> " + $st3Data.status)
$ship = P "PATCH" "/api/admin/orders/$orderId/shipment" @{ trackingNumber = "TRK-12345"; notes = "Handed to Pathao" } $adminToken
Write-Output ("shipment: " + $ship.StatusCode)

Write-Output "==> Admin: SHIPPED -> DELIVERED"
$st4 = P "PATCH" "/api/admin/orders/$orderId/status" @{ status = "DELIVERED" } $adminToken
$st4Data = (($st4.Content) | ConvertFrom-Json).data
Write-Output ("status4: " + $st4.StatusCode + " -> " + $st4Data.status)

Write-Output "==> Admin: add a note"
$note = P "POST" "/api/admin/orders/$orderId/notes" @{ content = "Customer called, very happy" } $adminToken
Write-Output ("note: " + $note.StatusCode)

Write-Output ""
Write-Output "==> FINAL ORDER:"
$final = P "GET" "/api/admin/orders/$orderId" $null $adminToken
$finalData = (($final.Content) | ConvertFrom-Json).data
Dump "final order" $finalData
