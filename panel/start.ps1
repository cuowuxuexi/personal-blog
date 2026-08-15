$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host '未找到 node，请先安装 Node.js'
  pause
  exit 1
}

if (-not (Test-Path (Join-Path $repo 'node_modules'))) {
  Write-Host '正在安装依赖…'
  if (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm install }
  else { npm install }
}

node panel/start.mjs
if ($LASTEXITCODE -ne 0) { pause }
