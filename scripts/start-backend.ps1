$ErrorActionPreference = "Stop"
Set-Location "C:\Users\afmss\OneDrive\Desktop\E-Commerce"
$env:NODE_ENV = "development"
$tsx = Resolve-Path "C:\Users\afmss\OneDrive\Desktop\E-Commerce\node_modules\.pnpm\tsx@4.23.15\node_modules\tsx\dist\cli.mjs"
$proc = Start-Process -FilePath "C:\Program Files\nodejs\node.exe" `
  -ArgumentList "`"$tsx`"", "apps/backend/src/server.ts" `
  -WorkingDirectory "C:\Users\afmss\OneDrive\Desktop\E-Commerce" `
  -RedirectStandardOutput "$env:TEMP\anzara-backend.log" `
  -RedirectStandardError "$env:TEMP\anzara-backend.err.log" `
  -NoNewWindow -PassThru
Write-Output ("started pid=" + $proc.Id)
