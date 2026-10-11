Copy-Item "$env:TEMP\anzara-backend.log" "C:\Users\afmss\OneDrive\Desktop\E-Commerce\test-backend.log" -Force
Copy-Item "$env:TEMP\anzara-backend.err.log" "C:\Users\afmss\OneDrive\Desktop\E-Commerce\test-backend.err.log" -Force
Get-Content "C:\Users\afmss\OneDrive\Desktop\E-Commerce\test-backend.log" -Tail 20
Write-Output "---STDERR---"
Get-Content "C:\Users\afmss\OneDrive\Desktop\E-Commerce\test-backend.err.log" -Tail 20
