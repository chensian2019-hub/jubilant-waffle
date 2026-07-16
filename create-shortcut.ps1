$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('C:\Users\Lenovo\Desktop\Balance.lnk')
$sc.TargetPath = 'C:\Users\Lenovo\Documents\test\fetch-balance-animated.bat'
$sc.WorkingDirectory = 'C:\Users\Lenovo\Documents\test'
$sc.Save()
