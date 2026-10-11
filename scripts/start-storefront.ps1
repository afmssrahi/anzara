#!/usr/bin/env pwsh
# Starts @anzara/storefront dev server detached.
#
# Why a wrapper .cmd and not Start-Process on pnpm.cmd directly:
# Start-Process on a .cmd with redirect-to-file sometimes spawns a
# child that exits before binding the port, leaving a stale "0 bytes"
# log file. Routing through a .cmd file invoked with cmd /c + start
# is the most reliable way to keep the dev server alive after the
# calling shell exits.
$ErrorActionPreference = "Stop"
Set-Location "C:\Users\afmss\OneDrive\Desktop\E-Commerce"
$log = "$env:TEMP\anzara-storefront.log"
$err = "$env:TEMP\anzara-storefront.err.log"
'' | Set-Content -Path $log
'' | Set-Content -Path $err

# /B = don't open a new console window; process inherits the caller's
# process group, so the dev server keeps running after the parent exits.
$proc = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList "/c", "scripts\_run-sf.cmd" `
  -WorkingDirectory "C:\Users\afmss\OneDrive\Desktop\E-Commerce" `
  -WindowStyle Hidden `
  -PassThru
Write-Output ("started pid=" + $proc.Id)
