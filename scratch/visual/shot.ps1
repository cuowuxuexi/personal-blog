param(
  [Parameter(Mandatory=$true)][string]$Page,
  [Parameter(Mandatory=$true)][string]$Out
)
$ErrorActionPreference = 'Stop'
$raw = ''
for ($i = 0; $i -lt 4; $i++) {
  $raw = (orca screenshot --page $Page --format png --json 2>&1 | Out-String)
  if ($raw -match '"ok":\s*true') { break }
  if ($raw -match 'runtime_unavailable|closed the connection|not running') {
    orca open | Out-Null
    Start-Sleep -Seconds 3
    continue
  }
  break
}
if ($raw -notmatch '"ok":\s*true') { Write-Host "ERR $($raw.Substring(0, [Math]::Min(300, $raw.Length)))"; exit 1 }
$j = $raw | ConvertFrom-Json
[IO.File]::WriteAllBytes($Out, [Convert]::FromBase64String($j.result.data))
Write-Host "saved $((Get-Item $Out).Length) bytes -> $Out"
