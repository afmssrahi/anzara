@echo off
cd /d "C:\Users\afmss\OneDrive\Desktop\E-Commerce"
"C:\Program Files\nodejs\pnpm.cmd" --filter @anzara/admin dev 1>"%TEMP%\anzara-admin.log" 2>"%TEMP%\anzara-admin.err.log"
