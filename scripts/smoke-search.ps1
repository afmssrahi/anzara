$r = Invoke-WebRequest -Uri "http://localhost:4000/api/products?search=abaya&pageSize=3" -UseBasicParsing -TimeoutSec 5
Write-Output ("status=" + $r.StatusCode)
$json = $r.Content | ConvertFrom-Json
Write-Output ("total=" + $json.data.pagination.total)
foreach ($p in $json.data.items) {
  Write-Output (" - " + $p.slug + " | " + $p.name.en)
}
