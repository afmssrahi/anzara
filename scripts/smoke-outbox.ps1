$body = '{"email":"smoketest@anzara.local","purpose":"LOGIN"}'
try {
  $r = Invoke-WebRequest -Uri "http://localhost:4000/api/auth/otp/request" -Method Post -ContentType "application/json" -Body $body -UseBasicParsing
  Write-Output ("status=" + $r.StatusCode)
  Write-Output $r.Content
} catch {
  Write-Output ("err=" + $_.Exception.Message)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output $sr.ReadToEnd()
  }
}
