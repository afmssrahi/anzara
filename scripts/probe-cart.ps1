$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"
$EMAIL = "probe2-$(Get-Random)@anzara.local"
$PASSWORD = "ProbeTest123!"

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

$reg = P "POST" "/api/auth/register" @{ email = $EMAIL; password = $PASSWORD; firstName = "P"; lastName = "U" }
$regJson = $reg.Content | ConvertFrom-Json
Write-Output "register keys:"
$regJson.data | Get-Member -MemberType NoteProperty | Select-Object Name
$tok = $regJson.data.accessToken
Write-Output "token len:" $tok.Length

$prod = (P "GET" "/api/products?limit=1").Content | ConvertFrom-Json
$vid = $prod.data.data[0].variants[0].id
Write-Output "vid: $vid"

$cart = P "POST" "/api/cart/items" @{ variantId = $vid; quantity = 2 } $tok
Write-Output "status:" $cart.StatusCode
$cart.Content | ConvertFrom-Json | ConvertTo-Json -Depth 8
