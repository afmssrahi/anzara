#!/usr/bin/env pwsh
# Starts @anzara/admin dev server detached. See start-storefront.ps1
# for why we wrap in a .cmd file.
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\afmss\OneDrive\Desktop\E-Commerce"
$log = "$env:TEMP\anzara-admin.log"
$err = "$env:TEMP\anzara-admin.err.log"
'' | Set-Content -Path $log
'' | Set-Content -Path $err

$proc = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/c", "scripts\_run-ad.cmd" `
  -WorkingDirectory "C:\Users\afmss\OneDrive\Desktop\E-Commerce" `
  -WindowStyle Hidden `
  -PassThru
Write-Output ("started pid=" + $proc.Id)
