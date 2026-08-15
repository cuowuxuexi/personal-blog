$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop '系统与远程\发布面板.lnk'
$startPs1 = Join-Path $repo 'panel\start.ps1'
$iconPath = Join-Path $repo 'panel\publishing-panel-white.ico'

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$startPs1`""
$shortcut.WorkingDirectory = $repo
$shortcut.IconLocation = "$iconPath,0"
$shortcut.WindowStyle = 1
$shortcut.Description = '误君在脑海里放烟花 · 发布面板'
$shortcut.Save()

Write-Host "已创建桌面快捷方式：$shortcutPath"
