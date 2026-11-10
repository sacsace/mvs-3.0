# Pack installer ZIP into msv-frontend/public/downloads/mvs-notifier/
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$OutDir = Join-Path (Split-Path $Root -Parent) "msv-frontend\public\downloads\mvs-notifier"
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$stage = Join-Path $env:TEMP ("mvs-notifier-pack-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stage -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage "assets") -Force | Out-Null

$files = @(
  "Setup.bat", "Setup.ps1", "Install.bat",
  "Uninstall.bat", "Uninstall.ps1",
  "Start-MVS-Notifier.bat", "MVS-Notifier.ps1",
  "README.txt", "README.md", "mvs-notifier.ico"
)
foreach ($f in $files) {
  $src = Join-Path $Root $f
  if (Test-Path $src) { Copy-Item -Force $src (Join-Path $stage $f) }
}
foreach ($af in @("mvs-notifier.ico", "toast-logo.png", "app-icon.png", "defaults.json")) {
  $src = Join-Path $Root "assets\$af"
  if (-not (Test-Path $src)) { $src = Join-Path $Root $af }
  if (Test-Path $src) {
    Copy-Item -Force $src (Join-Path $stage "assets\$(Split-Path $af -Leaf)")
  }
}
if (Test-Path (Join-Path $stage "assets\mvs-notifier.ico")) {
  Copy-Item -Force (Join-Path $stage "assets\mvs-notifier.ico") (Join-Path $stage "mvs-notifier.ico")
}

$zip = Join-Path $OutDir "MVS-Notifier.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -CompressionLevel Optimal
Remove-Item -Recurse -Force $stage

# also keep a clear installer name copy
$setupZip = Join-Path $OutDir "MVS-Notifier-Setup.zip"
Copy-Item -Force $zip $setupZip

Get-Item $zip, $setupZip | Select-Object FullName, Length, LastWriteTime
Write-Host "Package ready."
