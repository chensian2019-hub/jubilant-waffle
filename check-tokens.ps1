# check-tokens.ps1 - DeepSeek 余额查询
# 用法：右键文件 -> 使用 PowerShell 运行

$API_KEY = 'sk-0367d6875e2f41d08a1ddc352aeadb42'

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host '      DeepSeek 账户余额查询' -ForegroundColor Yellow
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

try {
    $headers = @{ Authorization = "Bearer $API_KEY" }
    $response = Invoke-RestMethod -Uri 'https://api.deepseek.com/user/balance' -Headers $headers

    Write-Host '账户可用：' -ForegroundColor Green -NoNewline
    Write-Host $response.is_available -ForegroundColor White

    foreach ($info in $response.balance_infos) {
        Write-Host ('货币类型：  ' + $info.currency)
        Write-Host ('总余额：    ' + $info.total_balance + ' 元')
        Write-Host ('充值余额：  ' + $info.topped_up_balance + ' 元')
        Write-Host ('赠送余额：  ' + $info.granted_balance + ' 元')
        Write-Host ''
    }

    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host '  查询完毕！' -ForegroundColor Green
    Write-Host '============================================' -ForegroundColor Cyan
}
catch {
    Write-Host '查询失败！' -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Read-Host '按 Enter 关闭'
