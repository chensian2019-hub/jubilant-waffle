# fetch-balance.ps1
# DeepSeek Balance Checker (animated)

$API_KEY = 'sk-0367d6875e2f41d08a1ddc352aeadb42'

Clear-Host
Write-Host ''
Write-Host '    ========================================' -ForegroundColor Cyan
Write-Host '         DeepSeek Account Balance'            -ForegroundColor Yellow
Write-Host '    ========================================' -ForegroundColor Cyan
Write-Host ''

# Animated connecting text
Write-Host '    [*] Connecting to API...' -NoNewline -ForegroundColor Gray
for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep -Milliseconds 300
    Write-Host '.' -NoNewline -ForegroundColor Gray
}

try {
    $r = Invoke-RestMethod -Uri 'https://api.deepseek.com/user/balance' -Headers @{
        'Authorization' = "Bearer $API_KEY"
    }
    Write-Host "`n"
    Write-Host '    [OK] Connected!' -ForegroundColor Green
}
catch {
    Write-Host "`n"
    Write-Host '    [X] Connection failed!' -ForegroundColor Red
    Write-Host ''
    Read-Host 'Press Enter to close'
    exit
}

Write-Host ''
Write-Host '    +------------------------------------+' -ForegroundColor Gray

foreach ($info in $r.balance_infos) {
    $total = $info.total_balance
    $topup = $info.topped_up_balance
    $grant = $info.granted_balance
    $curr  = $info.currency

    # Typewriter effect for each line
    Write-Host '    |  ' -NoNewline -ForegroundColor Gray
    $label = 'Total Balance : '
    foreach ($ch in $label.ToCharArray()) {
        Write-Host $ch -NoNewline -ForegroundColor Yellow
        Start-Sleep -Milliseconds 30
    }
    Write-Host ($total + ' ' + $curr) -ForegroundColor Green
    Start-Sleep -Milliseconds 200

    Write-Host '    |  ' -NoNewline -ForegroundColor Gray
    $label2 = 'Recharged     : '
    foreach ($ch in $label2.ToCharArray()) {
        Write-Host $ch -NoNewline -ForegroundColor White
        Start-Sleep -Milliseconds 30
    }
    Write-Host ($topup + ' ' + $curr)
    Start-Sleep -Milliseconds 150

    Write-Host '    |  ' -NoNewline -ForegroundColor Gray
    $label3 = 'Free Credits  : '
    foreach ($ch in $label3.ToCharArray()) {
        Write-Host $ch -NoNewline -ForegroundColor White
        Start-Sleep -Milliseconds 30
    }
    Write-Host ($grant + ' ' + $curr)
}

Write-Host '    +------------------------------------+' -ForegroundColor Gray
Write-Host ''

# Progress bar animation
Write-Host '    ' -NoNewline
$barLen = 30
for ($p = 0; $p -le $barLen; $p++) {
    $filled  = '#' * $p
    $empty   = '-' * ($barLen - $p)
    $percent = [Math]::Round($p / $barLen * 100)
    Write-Host "`r    [$filled$empty] $percent%" -NoNewline -ForegroundColor Cyan
    Start-Sleep -Milliseconds 30
}
Write-Host ''
Write-Host ''
Write-Host '    [OK] All done!' -ForegroundColor Green
Write-Host ''

Read-Host 'Press Enter to close'
