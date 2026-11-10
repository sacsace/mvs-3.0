# MVS Notifier Uninstaller v2.0
param([switch]$Quiet)

$ErrorActionPreference = "Continue"
$AppName = "MVS Notifier"
$Dest = Join-Path $env:LOCALAPPDATA "MVS-Notifier"
$UninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MVSNotifier"
$StartMenuLnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\MVS Notifier.lnk"
$DesktopLnk = Join-Path ([Environment]::GetFolderPath("Desktop")) "MVS Notifier.lnk"
$StartupLnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\MVS Notifier.lnk"

function Stop-NotifierProcesses {
  $procs = @()
  try {
    $procs = @(Get-CimInstance Win32_Process -ErrorAction Stop)
  } catch {
    try { $procs = @(Get-WmiObject Win32_Process -ErrorAction Stop) } catch { $procs = @() }
  }
  foreach ($p in $procs) {
    try {
      $name = [string]$p.Name
      $cmd = [string]$p.CommandLine
      if ($name -match 'powershell|pwsh' -and $cmd -and ($cmd -like "*MVS-Notifier.ps1*" -or $cmd -like "*MVS-Notifier*")) {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
      }
    } catch { }
  }
  Start-Sleep -Milliseconds 400
}

if (-not $Quiet) {
  Add-Type -AssemblyName System.Windows.Forms
  $ans = [System.Windows.Forms.MessageBox]::Show(
    "Uninstall MVS Notifier?`nMVS 알림 프로그램을 제거할까요?",
    $AppName,
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
  )
  if ($ans -ne [System.Windows.Forms.DialogResult]::Yes) { exit 0 }
}

Stop-NotifierProcesses

foreach ($p in @($StartMenuLnk, $DesktopLnk, $StartupLnk)) {
  if (Test-Path $p) { Remove-Item -Force $p -ErrorAction SilentlyContinue }
}

if (Test-Path $UninstallKey) {
  Remove-Item -Recurse -Force $UninstallKey -ErrorAction SilentlyContinue
}

if (Test-Path $Dest) {
  # retry delete after process kill
  for ($i = 0; $i -lt 3; $i++) {
    try {
      Remove-Item -Recurse -Force $Dest -ErrorAction Stop
      break
    } catch {
      Stop-NotifierProcesses
      Start-Sleep -Milliseconds 500
    }
  }
}

if (-not $Quiet) {
  Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
  [System.Windows.Forms.MessageBox]::Show(
    "MVS Notifier has been uninstalled.`n제거가 완료되었습니다.",
    $AppName
  ) | Out-Null
}

Write-Host "Uninstalled MVS Notifier."
