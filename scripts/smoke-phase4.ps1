# Phase 4 smoke: reviews, wishlist, content, public settings.
#
# Tests:
#  - Reviews: public list (empty), customer without a purchase can't review,
#    customer WITH a purchase reviews, list shows it (admin must approve),
#    admin list shows pending, admin approves, public list now shows it.
#  - Wishlist: add, list, check, remove, list empty.
#  - Public settings: contains social.whatsapp (empty by default).
#  - Content: admin creates a banner + a page, public GET returns them when
#    active+published respectively.

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$TS = Get-Date -Format "HHmmss"
$ADMIN_EMAIL = "admin@anzara.com"
$ADMIN_PASS = "AnzaraAdmin@2026"
$CUST_EMAIL = "phase4-$TS@anzara.local"
$CUST_PASS = "Phase4Test123!"

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

function Expect($expr, $msg) {
  if (-not $expr) { throw "Expected: $msg" }
}

Write-Output "==> 1. Admin login"
$adm = P "POST" "/api/auth/admin/login" @{ email = $ADMIN_EMAIL; password = $ADMIN_PASS }
$admTok = ($adm.Content | ConvertFrom-Json).data.accessToken
Write-Output ("admin status: " + $adm.StatusCode)

Write-Output "==> 2. Public settings (should contain social.whatsapp)"
$pub = P "GET" "/api/settings"
$pubData = ($pub.Content | ConvertFrom-Json).data
Write-Output ("public status: " + $pub.StatusCode)
Expect ($pubData.PSObject.Properties.Name -contains "social.whatsapp") "social.whatsapp key present"

Write-Output "==> 3. Customer register + add to cart + place COD order (so they can review)"
$reg = P "POST" "/api/auth/register" @{
  email = $CUST_EMAIL; password = $CUST_PASS; firstName = "Phase"; lastName = "Four"
}
$custTok = ($reg.Content | ConvertFrom-Json).data.accessToken
$prod = (P "GET" "/api/products?limit=1").Content | ConvertFrom-Json
$prodId = $prod.data.data[0].id
$prodSlug = $prod.data.data[0].slug
$vid = $prod.data.data[0].variants[0].id
P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 1 } $custTok | Out-Null
$placed = P "POST" "/api/orders" @{
  paymentMethod = "COD"
  shippingAddress = @{
    fullName = "Phase Four"; phone = "+8801712345678"
    addressLine1 = "1"; city = "Dhaka"; district = "Dhaka"
    division = "Dhaka"; country = "Bangladesh"
  }
} $custTok
$placedOrder = ($placed.Content | ConvertFrom-Json).data
Write-Output ("placed order: " + $placedOrder.orderNumber + " status: " + $placedOrder.status)
Expect ($placed.StatusCode -eq 201) "place order returns 201"

# Admin walks the order to DELIVERED so the buyer becomes "eligible to review".
$oid = $placedOrder.id
P "PATCH" "/api/admin/orders/$oid/status" @{ status = "CONFIRMED" } $admTok | Out-Null
P "PATCH" "/api/admin/orders/$oid/status" @{ status = "PROCESSING" } $admTok | Out-Null
P "PATCH" "/api/admin/orders/$oid/status" @{ status = "SHIPPED" } $admTok | Out-Null
P "PATCH" "/api/admin/orders/$oid/status" @{ status = "DELIVERED" } $admTok | Out-Null

Write-Output "==> 4. Customer posts a review (should succeed because they have a delivered order)"
$rev = P "POST" "/api/reviews" @{
  productId = $prodId
  rating = 5
  title = "Loved it"
  comment = "Fits perfectly and the fabric is wonderful. Will buy again."
} $custTok
$revData = ($rev.Content | ConvertFrom-Json).data
Expect ($rev.StatusCode -eq 200) "review create returns 200"
Expect ($revData.isApproved -eq $false) "new review is not auto-approved"
Expect ($revData.isVerified -eq $true) "new review is auto-verified (buyer)"
Write-Output ("review id: " + $revData.id + " isApproved: " + $revData.isApproved)

Write-Output "==> 5. Public list (should NOT include the un-approved review)"
$pubList = P "GET" "/api/reviews/products/$prodId" $null
$pubListData = ($pubList.Content | ConvertFrom-Json).data
Write-Output ("public count: " + $pubListData.meta.total)
Expect ($pubListData.meta.total -eq 0) "un-approved review not visible to public"

Write-Output "==> 6. Admin sees the pending review, approves it"
$admList = P "GET" "/api/admin/reviews?isApproved=false&limit=50" $null $admTok
$admListData = ($admList.Content | ConvertFrom-Json).data
Expect ($admListData.meta.total -ge 1) "admin list has at least 1 pending review"
Write-Output ("admin pending count: " + $admListData.meta.total)
$mod = P "PATCH" "/api/admin/reviews/$($revData.id)/moderate" @{ isApproved = $true } $admTok
$modData = ($mod.Content | ConvertFrom-Json).data
Expect ($modData.isApproved -eq $true) "moderate set isApproved true"
Write-Output ("moderated: isApproved=" + $modData.isApproved)

Write-Output "==> 7. Public list now shows the approved review"
$pubList2 = P "GET" "/api/reviews/products/$prodId" $null
$pubList2Data = ($pubList2.Content | ConvertFrom-Json).data
Expect ($pubList2Data.meta.total -eq 1) "approved review visible to public"
Expect ($pubList2Data.summary.average -eq 5) "summary average = 5"
Expect ($pubList2Data.summary.count -eq 1) "summary count = 1"
Write-Output ("public count: " + $pubList2Data.meta.total + " avg: " + $pubList2Data.summary.average)

Write-Output "==> 8. Customer cannot review a product they didn't buy"
$prod2 = (P "GET" "/api/products?limit=2").Content | ConvertFrom-Json
$otherProdId = ($prod2.data.data | Where-Object { $_.id -ne $prodId } | Select-Object -First 1).id
try {
  $bad = P "POST" "/api/reviews" @{
    productId = $otherProdId
    rating = 4
    comment = "Trying to review without buying"
  } $custTok
  Write-Output ("UNEXPECTED 2xx: " + $bad.StatusCode + " " + $bad.Content)
  throw "Expected 400/403 for non-buyer review"
} catch {
  $resp = $_.Exception.Response
  $code = [int]$resp.StatusCode
  Write-Output ("status: " + $code + " (expected 4xx)")
  Expect ($code -ge 400) "non-buyer review rejected"
}

Write-Output "==> 9. Wishlist: add + list + check + remove"
$wAdd = P "POST" "/api/wishlist/items" @{ productId = $prodId } $custTok
$wAddData = ($wAdd.Content | ConvertFrom-Json).data
Expect ($wAdd.StatusCode -eq 200) "wishlist add returns 200"
Expect ($wAddData.productId -eq $prodId) "added productId matches"
Write-Output ("wishlist add: " + $wAddData.productSlug)

$wList = P "GET" "/api/wishlist" $null $custTok
$wListData = ($wList.Content | ConvertFrom-Json).data
Expect ($wListData.Count -ge 1) "wishlist has items"
Write-Output ("wishlist count: " + $wListData.Count)

$wCheck = P "GET" "/api/wishlist/items/$prodId" $null $custTok
$wCheckData = ($wCheck.Content | ConvertFrom-Json).data
Expect ($wCheckData.inWishlist -eq $true) "check returns inWishlist=true"

$wDel = P "DELETE" "/api/wishlist/items/$prodId" $null $custTok
Expect ($wDel.StatusCode -eq 200) "wishlist remove returns 200"
$wList2 = P "GET" "/api/wishlist" $null $custTok
$wList2Data = ($wList2.Content | ConvertFrom-Json).data
Expect ($wList2Data.Count -eq 0) "wishlist empty after remove"

Write-Output "==> 10. Content: admin creates a banner + a page; public sees active/published ones"
$bn = P "POST" "/api/admin/content/banners" @{
  title = "Test banner"
  subtitle = "Phase 4 test"
  imageUrl = "https://placehold.co/1200x600/png"
  position = 99
  isActive = $true
} $admTok
$bnData = ($bn.Content | ConvertFrom-Json).data
Expect ($bn.StatusCode -eq 200) "banner create returns 200"
Write-Output ("banner id: " + $bnData.id)

$pg = P "POST" "/api/admin/content/pages" @{
  slug = "test-page-$TS"
  title = "Test page"
  content = "Hello world"
  isPublished = $true
} $admTok
$pgData = ($pg.Content | ConvertFrom-Json).data
Expect ($pg.StatusCode -eq 200) "page create returns 200"
Write-Output ("page slug: " + $pgData.slug)

$pubB = P "GET" "/api/content/banners" $null
$pubBData = ($pubB.Content | ConvertFrom-Json).data
Expect ($pubBData.Count -ge 1) "public active banners list non-empty"
$hasOurBanner = $pubBData | Where-Object { $_.id -eq $bnData.id }
Expect ($null -ne $hasOurBanner) "public list includes our banner"
Write-Output ("public banners count: " + $pubBData.Count)

$pubP = P "GET" "/api/content/pages/$($pgData.slug)" $null
$pubPData = ($pubP.Content | ConvertFrom-Json).data
Expect ($pubPData.slug -eq $pgData.slug) "public page fetch returns our page"
Write-Output ("public page slug: " + $pubPData.slug)

Write-Output "==> 11. Cleanup: deactivate banner, unpublish+delete page"
P "PATCH" "/api/admin/content/banners/$($bnData.id)" @{ isActive = $false } $admTok | Out-Null
P "DELETE" "/api/admin/content/banners/$($bnData.id)" $null $admTok | Out-Null
P "DELETE" "/api/admin/content/pages/$($pgData.id)" $null $admTok | Out-Null
# Cleanup the test review too
P "DELETE" "/api/admin/reviews/$($revData.id)" $null $admTok | Out-Null
Write-Output "DONE"
