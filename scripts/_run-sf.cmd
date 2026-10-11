@echo off
cd /d "C:\Users\afmss\OneDrive\Desktop\E-Commerce"
"C:\Program Files\nodejs\pnpm.cmd" --filter @anzara/storefront dev 1>"%TEMP%\anzara-storefront.log" 2>"%TEMP%\anzara-storefront.err.log"
