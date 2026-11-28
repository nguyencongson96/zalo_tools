# Quan ly 2 tac vu Windows Task Scheduler cua zalo_tools (khong can quyen Admin).
#   ZaloCheck  : chay run_check.cmd (node scripts/check.js) moi N phut      -> khong dung Claude, khong ton token
#   ZaloReport : chay run_report.ps1 (claude -p, skill zalo_report) moi ngay luc HH:mm -> co dung Claude
#
#   -Action install-check  -Minutes 5
#   -Action install-report -At 18:00
#   -Action remove -Target check|report|all
#   -Action status
#   -DryRun : dung doi tuong tac vu nhung KHONG dang ky gi (de kiem tra)
param(
  [Parameter(Mandatory = $true)][ValidateSet('install-check', 'install-report', 'remove', 'status')][string]$Action,
  [int]$Minutes = 5,
  [string]$At = '18:00',
  [ValidateSet('check', 'report', 'all')][string]$Target = 'all',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $here 'run_hidden.vbs'
$CheckTask = 'ZaloCheck'
$ReportTask = 'ZaloReport'

function New-Settings([int]$limitMinutes) {
  New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $limitMinutes)
}

function Register-Zalo([string]$name, [string]$script, $trigger, $settings, [string]$desc) {
  $arg = '//B "' + $vbs + '" ' + $script
  $act = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument $arg -WorkingDirectory (Split-Path -Parent $here)
  if ($DryRun) {
    Write-Host "[DRY RUN] se dang ky '$name': wscript.exe $arg"
    Write-Host "[DRY RUN] trigger: $($trigger.CimClass.CimClassName), repetition=$($trigger.Repetition.Interval) start=$($trigger.StartBoundary)"
    return
  }
  Register-ScheduledTask -TaskName $name -Action $act -Trigger $trigger -Settings $settings -Force -Description $desc | Out-Null
}

function Show-Task([string]$name) {
  $t = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if (-not $t) { Write-Host "${name}: DANG TAT"; return }
  $i = Get-ScheduledTaskInfo -TaskName $name
  $rep = $t.Triggers[0].Repetition.Interval
  Write-Host "${name}: DANG BAT ($($t.State))"
  if ($rep) { Write-Host "  Lap lai moi : $rep (dinh dang ISO 8601, PT5M = 5 phut)" }
  else { Write-Host "  Lich        : hang ngay luc $(([datetime]$t.Triggers[0].StartBoundary).ToString('HH:mm'))" }
  Write-Host "  Lan chay gan nhat : $($i.LastRunTime)  (ket qua: $($i.LastTaskResult))"
  Write-Host "  Lan chay tiep theo: $($i.NextRunTime)"
}

switch ($Action) {
  'install-check' {
    if ($Minutes -lt 1 -or $Minutes -gt 1440) { throw 'Minutes phai tu 1 den 1440.' }
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
      -RepetitionInterval (New-TimeSpan -Minutes $Minutes) -RepetitionDuration (New-TimeSpan -Days 3650)
    # gioi han rong: moi lan quet co the mo toi 25 hoi thoai; bi cat giua chung se mat noi dung tin da mo
    Register-Zalo $CheckTask 'run_check.cmd' $trigger (New-Settings 20)'Quet Zalo Web va cap nhat data/tracking/index.html'
    if (-not $DryRun) { Write-Host "Da bat quet tu dong moi $Minutes phut (task: $CheckTask)." }
  }
  'install-report' {
    try { $time = [datetime]::ParseExact($At, 'HH:mm', [Globalization.CultureInfo]::InvariantCulture) }
    catch { throw "At phai co dang HH:mm, vi du 18:00 (nhan duoc: '$At')." }
    $trigger = New-ScheduledTaskTrigger -Daily -At $time
    Register-Zalo $ReportTask 'run_report.ps1' $trigger (New-Settings 35)'Bao cao Zalo cuoi ngay (claude -p, skill zalo_report)'
    if (-not $DryRun) { Write-Host "Da bat bao cao hang ngay luc $At (task: $ReportTask)." }
  }
  'remove' {
    $names = @()
    if ($Target -in 'check', 'all') { $names += $CheckTask }
    if ($Target -in 'report', 'all') { $names += $ReportTask }
    foreach ($n in $names) {
      if (Get-ScheduledTask -TaskName $n -ErrorAction SilentlyContinue) {
        if ($DryRun) { Write-Host "[DRY RUN] se go '$n'" }
        else { Unregister-ScheduledTask -TaskName $n -Confirm:$false; Write-Host "Da go '$n'." }
      } else { Write-Host "'$n' chua duoc bat, khong co gi de go." }
    }
  }
  'status' {
    Show-Task $CheckTask
    Show-Task $ReportTask
  }
}
