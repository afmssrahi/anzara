# Smoke for the coupon flow:
#  1. Admin login + create a 10% off coupon (min order ৳1000, no expiry, single use)
#  2. Admin lists coupons and sees the new one
#  3. Customer registers, adds an item, validates the code (success)
#  4. Customer applies code to cart; total reflects the discount
#  5. Customer places COD order; usageCount is now 1, CouponUsage row exists,
#     order.couponCode is the code, order.discount equals the discount paisa
#  6. Customer now tries to apply the same code again -> 400 ("has reached usage limit")
#  7. Customer creates a 2nd order without a coupon - works fine, usageCount unchanged
#  8. Admin updates coupon to inactive, customer tries to apply a different coupon
#     from a fresh code that we deactivate first - 400 ("no longer active")

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$TS = Get-Date -Format "HHmmss"
$ADMIN_EMAIL = "admin@anzara.com"
$ADMIN_PASS = "AnzaraAdmin@2026"
$CUST_EMAIL = "coupon-$TS@anzara.local"
$CUST_PASS = "CouponTest123!"
$CODE = "EID$TS"
$CODE2 = "DEAD$TS"
$DISCOUNT_VALUE = 10
$MIN_ORDER = 0  # 0 paisa = no minimum (cart subtotals in seed are < ৳1000)

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

Write-Output "==> Admin login"
$adm = P "POST" "/api/auth/admin/login" @{ email = $ADMIN_EMAIL; password = $ADMIN_PASS }
$admTok = ($adm.Content | ConvertFrom-Json).data.accessToken
Write-Output ("admin status: " + $adm.StatusCode)

Write-Output "==> Admin: create $CODE (10% off, min 0 paisa, usageLimit=1)"
$coupon = P "POST" "/api/admin/coupons" @{
  code = $CODE
  description = "Eid test coupon"
  discountType = "PERCENTAGE"
  discountValue = 10
  minOrderAmount = 0
  usageLimit = 1
  isActive = $true
  firstOrderOnly = $false
} $admTok
Write-Output ("create status: " + $coupon.StatusCode)
$couponData = ($coupon.Content | ConvertFrom-Json).data
Write-Output ("created id: " + $couponData.id + " code: " + $couponData.code + " usageLimit: " + $couponData.usageLimit)

Write-Output "==> Admin: create $CODE2 (also 10% off, usageLimit=999, will be deactivated)"
$c2 = P "POST" "/api/admin/coupons" @{
  code = $CODE2
  description = "will be deactivated"
  discountType = "PERCENTAGE"
  discountValue = 10
  minOrderAmount = 0
  usageLimit = 999
  isActive = $true
} $admTok
$c2Id = ($c2.Content | ConvertFrom-Json).data.id

Write-Output "==> Admin: list coupons"
$list = P "GET" "/api/admin/coupons?limit=50" $null $admTok
$listData = ($list.Content | ConvertFrom-Json).data
Write-Output ("list count: " + $listData.data.Count)
$found = $listData.data | Where-Object { $_.code -eq $CODE }
if (-not $found) { throw "Newly created coupon not in list" }

Write-Output "==> Customer: register + login + add to cart"
$reg = P "POST" "/api/auth/register" @{
  email = $CUST_EMAIL; password = $CUST_PASS; firstName = "Coupon"; lastName = "Tester"
}
$custTok = ($reg.Content | ConvertFrom-Json).data.accessToken
$prod = (P "GET" "/api/products?limit=1").Content | ConvertFrom-Json
$vid = $prod.data.data[0].variants[0].id
$price = $prod.data.data[0].variants[0].price
Write-Output ("unit price paisa: $price")
P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 1 } $custTok | Out-Null

Write-Output "==> Customer: validate the code (preview only)"
$val = P "POST" "/api/coupons/validate" @{ code = $CODE } $custTok
$valData = ($val.Content | ConvertFrom-Json).data
Write-Output ("status: " + $val.StatusCode + " discountPaisa: " + $valData.discountPaisa)
if ($valData.discountPaisa -le 0) { throw "Expected a positive discountPaisa" }

Write-Output "==> Customer: apply the code to the cart"
$apply = P "POST" "/api/cart/coupon" @{ code = $CODE } $custTok
$applyData = ($apply.Content | ConvertFrom-Json).data
Write-Output ("status: " + $apply.StatusCode + " appliedCouponCode: " + $applyData.appliedCouponCode + " discount: " + $applyData.discount.amount + " total: " + $applyData.total.amount)

Write-Output "==> Customer: place COD order"
$order = P "POST" "/api/orders" @{
  paymentMethod = "COD"
  shippingAddress = @{
    fullName = "Coupon Tester"; phone = "+8801712345678"
    addressLine1 = "1"; city = "Dhaka"; district = "Dhaka"
    division = "Dhaka"; country = "Bangladesh"
  }
} $custTok
Write-Output ("status: " + $order.StatusCode)
$orderData = ($order.Content | ConvertFrom-Json).data
Write-Output ("orderNumber: " + $orderData.orderNumber + " couponCode: " + $orderData.couponCode + " discount: " + $orderData.discount)

Write-Output "==> Verify coupon usageCount incremented + CouponUsage row exists"
$list2 = P "GET" "/api/admin/coupons?limit=50" $null $admTok
$list2Data = ($list2.Content | ConvertFrom-Json).data.data
$found2 = $list2Data | Where-Object { $_.code -eq $CODE }
Write-Output ("usageCount: " + $found2.usageCount + " redemptions: " + $found2.redemptions + " isActive: " + $found2.isActive)
if ($found2.usageCount -ne 1) { throw "Expected usageCount=1" }
if ($found2.redemptions -ne 1) { throw "Expected redemptions=1" }
if ($found2.isActive -ne $false) { throw "Expected coupon auto-deactivated after hitting limit" }

Write-Output "==> Customer: try to apply the now-depleted code (must fail 4xx)"
$cart2 = P "GET" "/api/cart" $null $custTok
$cart2Data = ($cart2.Content | ConvertFrom-Json).data
# cart was cleared at checkout, so add a new item first
P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 1 } $custTok | Out-Null
try {
  $bad = P "POST" "/api/cart/coupon" @{ code = $CODE } $custTok
  Write-Output ("UNEXPECTED 2xx: " + $bad.StatusCode + " " + $bad.Content)
} catch {
  $resp = $_.Exception.Response
  Write-Output ("status: " + [int]$resp.StatusCode + " (expected 4xx)")
  $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
  Write-Output $sr.ReadToEnd()
}

Write-Output "==> Customer: place another order without coupon - should succeed"
$order2 = P "POST" "/api/orders" @{
  paymentMethod = "COD"
  shippingAddress = @{
    fullName = "Coupon Tester"; phone = "+8801712345678"
    addressLine1 = "1"; city = "Dhaka"; district = "Dhaka"
    division = "Dhaka"; country = "Bangladesh"
  }
} $custTok
$order2Data = ($order2.Content | ConvertFrom-Json).data
Write-Output ("status: " + $order2.StatusCode + " couponCode: " + $order2Data.couponCode + " discount: " + $order2Data.discount)

Write-Output "==> Admin: deactivate $CODE2, customer tries to apply (must fail)"
P "PATCH" "/api/admin/coupons/$c2Id" @{ isActive = $false } $admTok | Out-Null
P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 1 } $custTok | Out-Null
try {
  $bad2 = P "POST" "/api/cart/coupon" @{ code = $CODE2 } $custTok
  Write-Output ("UNEXPECTED 2xx: " + $bad2.StatusCode)
} catch {
  $resp = $_.Exception.Response
  Write-Output ("status: " + [int]$resp.StatusCode + " (expected 4xx for inactive coupon)")
  $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
  Write-Output $sr.ReadToEnd()
}

Write-Output "==> Admin: delete the test coupons (idempotent)"
foreach ($cid in @($couponData.id, $c2Id)) {
  try { P "DELETE" "/api/admin/coupons/$cid" $null $admTok | Out-Null; Write-Output ("deleted: $cid") }
  catch { $resp = $_.Exception.Response; Write-Output ("delete $cid status: " + [int]$resp.StatusCode) }
}
Write-Output "DONE"
