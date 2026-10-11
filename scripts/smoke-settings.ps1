# Admin settings endpoint smoke.
$ErrorActionPreference = "Stop"
$BASE = "http://localhost:4000"

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

$admin = P "POST" "/api/auth/admin/login" @{ email = "admin@anzara.com"; password = "AnzaraAdmin@2026" }
$tok = ($admin.Content | ConvertFrom-Json).data.accessToken

$list = P "GET" "/api/admin/settings" $null $tok
Write-Output ("list: " + $list.StatusCode)
$listData = (($list.Content) | ConvertFrom-Json).data
Write-Output ("count: " + $listData.Count)
$listData | Select-Object key, group, value | Format-Table | Out-String

$put = P "PUT" "/api/admin/settings" @{ key = "brand.primaryColor"; value = "#C4A484"; group = "theme"; isPublic = $true } $tok
Write-Output ("put: " + $put.StatusCode)
Write-Output (($put.Content | ConvertFrom-Json).data | ConvertTo-Json -Depth 5)

$put2 = P "PUT" "/api/admin/settings" @{ key = "contact.email"; value = "hello@anzara.com"; group = "general"; isPublic = $true } $tok
Write-Output ("put2: " + $put2.StatusCode)

$list2 = P "GET" "/api/admin/settings?group=theme" $null $tok
Write-Output ("list2: " + $list2.StatusCode)
$list2Data = (($list2.Content) | ConvertFrom-Json).data
$list2Data | Where-Object { $_.key -eq "brand.primaryColor" } | ConvertTo-Json -Depth 5
