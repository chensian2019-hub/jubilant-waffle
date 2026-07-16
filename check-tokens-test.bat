@echo off
chcp 65001 >nul
echo Testing...

powershell -Command "$r=Invoke-RestMethod -Uri 'https://api.deepseek.com/user/balance' -Headers @{'Authorization'='Bearer sk-0367d6875e2f41d08a1ddc352aeadb42'}; foreach($i in $r.balance_infos){ Write-Output ('TOTAL='+$i.total_balance); Write-Output ('TOPUP='+$i.topped_up_balance); Write-Output ('GRANT='+$i.granted_balance); Write-Output ('CURRENCY='+$i.currency) }" > "%TEMP%\ds_bal.txt" 2>&1

echo Exit code: %ERRORLEVEL%
echo ---
type "%TEMP%\ds_bal.txt"
echo ---
