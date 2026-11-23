# Bao cao Zalo cuoi ngay: goi Claude (claude -p) chay skill zalo_report, dua vao tab "Bao cao" cua data\tracking\index.html.
# Duoc Task Scheduler goi (tac vu ZaloReport) qua run_hidden.vbs. Co the chay tay:  powershell -File run_report.ps1
#   -DryRun : chi in ra se lam gi, KHONG goi Claude
# Claude chi duoc cap quyen DOC (Read, Glob, Grep, Skill) va gioi han ngan sach; file bao cao do script nay ghi.
param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here   # goc project (noi co .claude/skills); Claude phai chay o day de nap skill zalo_report
$logDir = Join-Path $root 'data\log'
$budget = if ($env:ZALO_REPORT_BUDGET) { $env:ZALO_REPORT_BUDGET } else { '1' }   # USD toi da moi lan bao cao
$staleMin = 10                                                                    # du lieu cu hon N phut thi quet lai truoc khi bao cao

function Write-Log([string]$msg) {
  New-Item -ItemType Directory -Force $logDir | Out-Null
  Add-Content -Path (Join-Path $logDir 'report.log') -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg)
}

# Claude CLI khong nam trong PATH: tim trong PATH, roi toi ban kem theo extension VS Code moi nhat.
function Find-Claude {
  $c = Get-Command claude -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  $ext = Join-Path $env:USERPROFILE '.vscode\extensions'
  if (Test-Path $ext) {
    $b = Get-ChildItem $ext -Directory -Filter 'anthropic.claude-code-*' | Sort-Object LastWriteTime -Descending |
      ForEach-Object { Join-Path $_.FullName 'resources\native-binary\claude.exe' } |
      Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($b) { return $b }
  }
  return $null
}

$claude = Find-Claude
if (-not $claude) {
  Write-Log 'LOI: khong tim thay Claude CLI (claude.exe). Cai Claude Code hoac them vao PATH.'
  if ($DryRun) { Write-Host 'Khong tim thay Claude CLI.' }
  exit 1
}

$today = Get-Date -Format 'yyyy-MM-dd'
$outFile = Join-Path $root 'data\tracking\index.html'   # bao cao duoc dua vao tab "Bao cao" cua trang nay
$prompt = "Run the zalo_report skill in NON-INTERACTIVE mode for today ($today). Read-only: do not scan Zalo and do not ask questions. " +
          "Print ONLY the final report as Markdown in Vietnamese to stdout."
$claudeArgs = @('-p', $prompt, '--allowedTools', 'Read,Glob,Grep,Skill', '--max-budget-usd', $budget, '--output-format', 'text')

$index = Join-Path $root 'data\tracking\index.html'
$needScan = (-not (Test-Path $index)) -or (((Get-Date) - (Get-Item $index).LastWriteTime).TotalMinutes -gt $staleMin)

if ($DryRun) {
  Write-Host "claude    : $claude"
  Write-Host "cwd       : $root"
  Write-Host "se quet lai truoc khi bao cao: $needScan"
  Write-Host "lenh      : claude $($claudeArgs -join ' ')"
  Write-Host "luu bao cao: $outFile"
  exit 0
}

try {
  if ($needScan) {
    Push-Location $root
    try { & node scripts/check.js *> $null } catch { Write-Log "Canh bao: quet truoc bao cao loi: $($_.Exception.Message)" }
    Pop-Location
  }
  Push-Location $root
  try { $text = ($null | & $claude @claudeArgs) -join "`n" } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($text)) {
    Write-Log "LOI: claude tra ve ma $LASTEXITCODE hoac rong."
    exit 1
  }
  # Claude tra ve Markdown; save_report.js doi sang trang HTML de nguoi dung mo bang trinh duyet
  $tmp = Join-Path ([IO.Path]::GetTempPath()) "zalo_report_$today.md"
  [IO.File]::WriteAllText($tmp, $text + "`n", (New-Object Text.UTF8Encoding($false)))
  try {
    Push-Location $root
    & node scripts/save_report.js $today $tmp
    if ($LASTEXITCODE -ne 0) { throw "save_report.js tra ve ma $LASTEXITCODE" }
  } finally { Pop-Location; Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
  Write-Log "OK: da luu $outFile"
} catch {
  Write-Log "LOI: $($_.Exception.Message)"
  exit 1
}
