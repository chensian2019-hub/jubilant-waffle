@echo off
chcp 65001 >nul
cd /d C:\Users\Lenovo\Documents\test

if "%~1"=="" (
    REM 无参数 → 进入交互模式
    claude
) else (
    REM 有参数 → 一次性问答
    claude -p "%~1"
)
