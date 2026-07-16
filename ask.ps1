# 快速求助 Claude Code
# 用法：在终端输入  ask "你的问题"
# 或者直接输入  ask  进入对话模式

function Ask-Claude {
    param([string]$Question)
    Set-Location C:\Users\Lenovo\Documents\test
    if ($Question) {
        claude -p $Question
    } else {
        claude
    }
}

Set-Alias -Name ask -Value Ask-Claude
