# MVS Notifier Setup v2.0 — copies files, Start Menu, Apps & Features uninstall entry
param(
  [switch]$Quiet,
  [string]$ApiBaseHint = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms

$AppName = "MVS Notifier"
$AppVersion = "2.1.1"
$Publisher = "Minsub Ventures"
$AppUserModelId = "MinsubVentures.MVS.Notifier"

function Test-MvsWin10OrLater {
  try {
    $reg = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -ErrorAction Stop
    $b = 0
    if ($reg.CurrentBuildNumber) { [void][int]::TryParse([string]$reg.CurrentBuildNumber, [ref]$b) }
    return ($b -ge 10240)
  } catch {
    return ([Environment]::OSVersion.Version.Major -ge 10)
  }
}
$UninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MVSNotifier"
$Dest = Join-Path $env:LOCALAPPDATA "MVS-Notifier"
$Src = $PSScriptRoot

function Write-Info([string]$Msg) {
  if (-not $Quiet) { Write-Host $Msg }
}

function Set-ShortcutAppUserModelId([string]$LnkPath, [string]$Aumid) {
  if (-not (Test-Path $LnkPath)) { return }
  # Best-effort: branded toast identity via shortcut System.AppUserModel.ID
  try {
    $code = @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

public static class MvsAumidHelper {
  [DllImport("ole32.dll")]
  static extern int PropVariantClear(ref PROPVARIANT pvar);

  [StructLayout(LayoutKind.Sequential)]
  public struct PROPERTYKEY {
    public Guid fmtid;
    public UInt32 pid;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct PROPVARIANT {
    public short vt;
    public short wReserved1;
    public short wReserved2;
    public short wReserved3;
    public IntPtr p;
  }

  [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99")]
  interface IPropertyStore {
    uint GetCount(out uint propertyCount);
    uint GetAt([In] uint propertyIndex, out PROPERTYKEY key);
    uint GetValue([In] ref PROPERTYKEY key, out PROPVARIANT pv);
    uint SetValue([In] ref PROPERTYKEY key, [In] ref PROPVARIANT pv);
    uint Commit();
  }

  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHGetPropertyStoreFromParsingName(
    [In, MarshalAs(UnmanagedType.LPWStr)] string pszPath,
    IntPtr pbc, [In] uint flags,
    [In] ref Guid riid, [Out, MarshalAs(UnmanagedType.Interface)] out IPropertyStore ppv);

  public static void Apply(string shortcutPath, string aumid) {
    var iid = new Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99");
    IPropertyStore store;
    // GPS_DEFAULT = 0, GPS_READWRITE = 0x2, GPS_HANDLERPROPERTIESONLY = 0x1 — use READWRITE
    SHGetPropertyStoreFromParsingName(shortcutPath, IntPtr.Zero, 0x2, ref iid, out store);
    var key = new PROPERTYKEY {
      fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"),
      pid = 5
    };
    var pv = new PROPVARIANT();
    pv.vt = 31; // VT_LPWSTR
    pv.p = Marshal.StringToCoTaskMemUni(aumid);
    try {
      store.SetValue(ref key, ref pv);
      store.Commit();
    } finally {
      PropVariantClear(ref pv);
    }
  }
}
'@
    if (-not ("MvsAumidHelper" -as [type])) {
      Add-Type -TypeDefinition $code -ErrorAction Stop
    }
    [MvsAumidHelper]::Apply($LnkPath, $Aumid)
  } catch {
    Write-Info "Toast branding skipped: $($_.Exception.Message)"
  }
}

# --- copy files ---
New-Item -ItemType Directory -Path $Dest -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Dest "assets") -Force | Out-Null

$copyList = @(
  "MVS-Notifier.ps1",
  "Start-MVS-Notifier.bat",
  "Uninstall.bat",
  "Uninstall.ps1",
  "README.txt",
  "mvs-notifier.ico"
)
foreach ($f in $copyList) {
  $from = Join-Path $Src $f
  if (Test-Path $from) {
    Copy-Item -Force $from (Join-Path $Dest $f)
  }
}
foreach ($af in @("mvs-notifier.ico", "toast-logo.png", "app-icon.png", "defaults.json")) {
  $from = Join-Path $Src "assets\$af"
  if (-not (Test-Path $from)) { $from = Join-Path $Src $af }
  if (Test-Path $from) {
    Copy-Item -Force $from (Join-Path $Dest "assets\$(Split-Path $af -Leaf)")
  }
}
# root ico alias
if (Test-Path (Join-Path $Dest "assets\mvs-notifier.ico")) {
  Copy-Item -Force (Join-Path $Dest "assets\mvs-notifier.ico") (Join-Path $Dest "mvs-notifier.ico")
}

# force re-login after upgrade (token client / encryption)
$configPath = Join-Path $Dest "config.json"
if (Test-Path $configPath) {
  Remove-Item -Force $configPath -ErrorAction SilentlyContinue
}

if ($ApiBaseHint) {
  @{ apiBaseHint = $ApiBaseHint.Trim().TrimEnd("/") } | ConvertTo-Json |
    Set-Content -Path (Join-Path $Dest "assets\defaults.json") -Encoding UTF8
} elseif (-not (Test-Path (Join-Path $Dest "assets\defaults.json"))) {
  # keep empty hint file
  '{ "apiBaseHint": "" }' | Set-Content -Path (Join-Path $Dest "assets\defaults.json") -Encoding UTF8
}

# Start Menu shortcut
$startMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"
$lnkPath = Join-Path $startMenuDir "MVS Notifier.lnk"
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnkPath)
$s.TargetPath = (Join-Path $Dest "Start-MVS-Notifier.bat")
$s.WorkingDirectory = $Dest
$s.IconLocation = "$(Join-Path $Dest 'mvs-notifier.ico'),0"
$s.Description = "MVS Desktop Notifier"
$s.WindowStyle = 7
$s.Save()
if (Test-MvsWin10OrLater) {
  Set-ShortcutAppUserModelId -LnkPath $lnkPath -Aumid $AppUserModelId
}

# Desktop shortcut (optional ask)
$deskLnk = Join-Path ([Environment]::GetFolderPath("Desktop")) "MVS Notifier.lnk"
$makeDesktop = $true
if (-not $Quiet) {
  $ans = [System.Windows.Forms.MessageBox]::Show(
    "Create a Desktop shortcut?`n바탕화면 바로가기를 만들까요?",
    $AppName,
    [System.Windows.Forms.MessageBoxButtons]::YesNo,
    [System.Windows.Forms.MessageBoxIcon]::Question
  )
  $makeDesktop = ($ans -eq [System.Windows.Forms.DialogResult]::Yes)
}
if ($makeDesktop) {
  $ds = $ws.CreateShortcut($deskLnk)
  $ds.TargetPath = (Join-Path $Dest "Start-MVS-Notifier.bat")
  $ds.WorkingDirectory = $Dest
  $ds.IconLocation = "$(Join-Path $Dest 'mvs-notifier.ico'),0"
  $ds.WindowStyle = 7
  $ds.Save()
  if (Test-MvsWin10OrLater) {
    Set-ShortcutAppUserModelId -LnkPath $deskLnk -Aumid $AppUserModelId
  }
}

# Apps & Features uninstall registration
$sizeKb = 0
Get-ChildItem -Recurse $Dest -File -ErrorAction SilentlyContinue | ForEach-Object { $sizeKb += [int]($_.Length / 1KB) }
New-Item -Path $UninstallKey -Force | Out-Null
Set-ItemProperty -Path $UninstallKey -Name "DisplayName" -Value $AppName
Set-ItemProperty -Path $UninstallKey -Name "DisplayVersion" -Value $AppVersion
Set-ItemProperty -Path $UninstallKey -Name "Publisher" -Value $Publisher
Set-ItemProperty -Path $UninstallKey -Name "InstallLocation" -Value $Dest
Set-ItemProperty -Path $UninstallKey -Name "DisplayIcon" -Value (Join-Path $Dest "mvs-notifier.ico")
Set-ItemProperty -Path $UninstallKey -Name "UninstallString" -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Dest 'Uninstall.ps1')`""
Set-ItemProperty -Path $UninstallKey -Name "QuietUninstallString" -Value "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $Dest 'Uninstall.ps1')`" -Quiet"
Set-ItemProperty -Path $UninstallKey -Name "NoModify" -Value 1 -Type DWord
Set-ItemProperty -Path $UninstallKey -Name "NoRepair" -Value 1 -Type DWord
Set-ItemProperty -Path $UninstallKey -Name "EstimatedSize" -Value $sizeKb -Type DWord
Set-ItemProperty -Path $UninstallKey -Name "HelpLink" -Value "https://msventures.in"
Set-ItemProperty -Path $UninstallKey -Name "URLInfoAbout" -Value "https://msventures.in"

Write-Info "Installed to: $Dest"
Write-Info "Start Menu: MVS Notifier"
Write-Info "Uninstall: Settings → Apps → MVS Notifier  (or Uninstall.bat)"
Write-Info "Cached login cleared — please sign in again."

if (-not $Quiet) {
  [System.Windows.Forms.MessageBox]::Show(
    "$(if ($PSUICulture -like 'ko*') { "설치가 완료되었습니다.`n알림 프로그램을 시작합니다." } else { "Installation complete.`nStarting the notifier." })",
    $AppName
  ) | Out-Null
}

Start-Process -FilePath (Join-Path $Dest "Start-MVS-Notifier.bat")
