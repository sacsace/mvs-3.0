# MVS Windows Tray Notifier v2.1
# Cross-Windows: Win7 balloon / Win8+ toast fallback / Win10+ ToastGeneric
# DPAPI token, KO/EN UI, deep-link, startup toggle, since_id polling

param(
  [string]$ApiBase = "",
  [switch]$Setup,
  [ValidateSet("auto", "ko", "en")]
  [string]$Lang = "auto"
)

$ErrorActionPreference = "Stop"

# TLS 1.2+ (Win7/.NET 4.x HTTPS 필수). 실패해도 계속.
try {
  $sp = [Net.ServicePointManager]::SecurityProtocol
  try { $sp = $sp -bor [Net.SecurityProtocolType]::Tls12 } catch { $sp = $sp -bor 3072 }
  try { $sp = $sp -bor [Net.SecurityProtocolType]::Tls13 } catch { }
  [Net.ServicePointManager]::SecurityProtocol = $sp
} catch { }

# PS 3+ 필요. 미달 시 안내 후 종료.
if ($PSVersionTable.PSVersion.Major -lt 3) {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
      "PowerShell 3.0 or later is required.`nPowerShell 3.0 이상이 필요합니다.",
      "MVS Notifier"
    ) | Out-Null
  } catch { }
  exit 1
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Security

$AppName = "MVS Notifier"
$AppVersion = "2.1.1"
$Publisher = "Minsub Ventures"
$AppUserModelId = "MinsubVentures.MVS.Notifier"
$UserAgent = "MVS-Notifier/$AppVersion"
$DataDir = Join-Path $env:LOCALAPPDATA "MVS-Notifier"
$ConfigPath = Join-Path $DataDir "config.json"
$SeenPath = Join-Path $DataDir "seen-ids.json"
$PollSeconds = 20
$RefreshEveryTicks = 45  # ~15 min at 20s
$FetchLimit = 50

function Get-MvsOsCapabilities {
  # Environment.OSVersion alone is unreliable; prefer CurrentBuildNumber.
  $build = 0
  $product = ""
  try {
    $reg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -ErrorAction Stop
    if ($reg.CurrentBuildNumber) { [void][int]::TryParse([string]$reg.CurrentBuildNumber, [ref]$build) }
    if ($reg.ProductName) { $product = [string]$reg.ProductName }
  } catch { }
  $ver = [Environment]::OSVersion.Version
  if ($build -le 0) { $build = [int]$ver.Build }

  # 6.1=Win7, 6.2=Win8, 6.3=Win8.1, 10.0=Win10/11
  $isWin7 = ($ver.Major -eq 6 -and $ver.Minor -le 1)
  $isWin8Family = ($ver.Major -eq 6 -and $ver.Minor -ge 2)  # 8 / 8.1
  $isWin10OrLater = ($ver.Major -ge 10) -or ($build -ge 10240)

  # ToastText02: Win8+ (build ~9200). ToastGeneric: Win10 1607+ (14393).
  $supportsToastLegacy = (-not $isWin7) -and (($isWin8Family) -or $isWin10OrLater -or ($build -ge 9200))
  $supportsToastGeneric = $isWin10OrLater -and ($build -ge 14393)
  $supportsAumid = $isWin10OrLater -and ($build -ge 10240)

  return [pscustomobject]@{
    Build               = $build
    ProductName         = $product
    IsWin7              = $isWin7
    IsWin8Family        = $isWin8Family
    IsWin10OrLater      = $isWin10OrLater
    SupportsToastLegacy = $supportsToastLegacy
    SupportsToastGeneric = $supportsToastGeneric
    SupportsAumid       = $supportsAumid
    PreferBalloonOnly   = $isWin7 -or (-not $supportsToastLegacy)
  }
}

$script:OsCaps = Get-MvsOsCapabilities
# $null=미시도, $true=성공 이력, $false=이 세션에서 Toast 포기(풍선만)
$script:ToastOk = $null

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

function Resolve-UiLang([string]$Preferred) {
  if ($Preferred -eq "ko" -or $Preferred -eq "en") { return $Preferred }
  $cul = [string][System.Globalization.CultureInfo]::CurrentUICulture.Name
  if ($cul -like "ko*") { return "ko" }
  return "en"
}

$script:UiLang = Resolve-UiLang $Lang

function T([string]$Ko, [string]$En) {
  if ($script:UiLang -eq "ko") { return $Ko }
  return $En
}

function Read-JsonFile([string]$Path, $Default) {
  if (-not (Test-Path $Path)) { return $Default }
  try {
    $raw = Get-Content -Path $Path -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) { return $Default }
    return (ConvertFrom-Json $raw)
  } catch {
    return $Default
  }
}

function Write-JsonFile([string]$Path, $Object) {
  ($Object | ConvertTo-Json -Depth 8) | Set-Content -Path $Path -Encoding UTF8
}

function Protect-Secret([string]$Plain) {
  if ([string]::IsNullOrEmpty($Plain)) { return "" }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Plain)
  $prot = [System.Security.Cryptography.ProtectedData]::Protect(
    $bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  )
  return [Convert]::ToBase64String($prot)
}

function Unprotect-Secret([string]$Blob) {
  if ([string]::IsNullOrWhiteSpace($Blob)) { return "" }
  try {
    $prot = [Convert]::FromBase64String($Blob)
    $bytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
      $prot, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    return [System.Text.Encoding]::UTF8.GetString($bytes)
  } catch {
    return ""
  }
}

function Get-ConfigToken($Cfg) {
  if ($null -eq $Cfg) { return "" }
  if ($Cfg.tokenProtected) {
    $t = Unprotect-Secret ([string]$Cfg.tokenProtected)
    if ($t) { return $t }
  }
  # migrate legacy plaintext
  if ($Cfg.token) { return [string]$Cfg.token }
  return ""
}

function Set-ConfigToken($Cfg, [string]$Token) {
  $Cfg.tokenProtected = Protect-Secret $Token
  if ($Cfg.PSObject.Properties.Name -contains "token") {
    $Cfg.PSObject.Properties.Remove("token")
  }
}

function Get-NotifierHeaders([string]$Token) {
  $h = @{
    "User-Agent"   = $UserAgent
    "X-MVS-Client" = "mvs_notifier"
  }
  if ($Token) {
    $h["Authorization"] = "Bearer $Token"
  }
  return $h
}

function Get-AssetPath([string]$Name) {
  $candidates = @(
    (Join-Path $PSScriptRoot $Name),
    (Join-Path $PSScriptRoot "assets\$Name"),
    (Join-Path $DataDir $Name),
    (Join-Path $DataDir "assets\$Name")
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) { return $p }
  }
  return $null
}

function Show-LoginDialog([string]$DefaultApi) {
  $form = New-Object System.Windows.Forms.Form
  $form.Text = "$(T 'MVS 알림 프로그램' $AppName) $AppVersion"
  $form.Size = New-Object System.Drawing.Size(460, 340)
  $form.StartPosition = "CenterScreen"
  $form.FormBorderStyle = "FixedDialog"
  $form.MaximizeBox = $false
  $form.MinimizeBox = $false
  $form.BackColor = [System.Drawing.Color]::White
  $iconFile = Get-AssetPath "mvs-notifier.ico"
  if ($iconFile) {
    try { $form.Icon = New-Object System.Drawing.Icon $iconFile } catch { }
  }

  $pic = New-Object System.Windows.Forms.PictureBox
  $pic.Location = New-Object System.Drawing.Point(18, 14)
  $pic.Size = New-Object System.Drawing.Size(48, 48)
  $pic.SizeMode = "Zoom"
  $png = Get-AssetPath "app-icon.png"
  if (-not $png) { $png = Get-AssetPath "toast-logo.png" }
  if ($png) {
    try { $pic.Image = [System.Drawing.Image]::FromFile($png) } catch { }
  }
  $form.Controls.Add($pic)

  $lblHead = New-Object System.Windows.Forms.Label
  $lblHead.Text = T "Windows 트레이 알림 로그인" "Sign in for tray notifications"
  $lblHead.Font = New-Object System.Drawing.Font "Segoe UI", 11, ([System.Drawing.FontStyle]::Bold)
  $lblHead.Location = New-Object System.Drawing.Point(76, 18)
  $lblHead.AutoSize = $true
  $form.Controls.Add($lblHead)

  $lblSub = New-Object System.Windows.Forms.Label
  $lblSub.Text = T "웹 로그인과 세션이 분리됩니다." "Session is independent from the web app."
  $lblSub.ForeColor = [System.Drawing.Color]::DimGray
  $lblSub.Location = New-Object System.Drawing.Point(76, 42)
  $lblSub.AutoSize = $true
  $form.Controls.Add($lblSub)

  $lblApi = New-Object System.Windows.Forms.Label
  $lblApi.Text = T "API 주소 (끝의 /api 포함, 없으면 자동 추가)" "API Base URL (append /api if missing)"
  $lblApi.Location = New-Object System.Drawing.Point(18, 78)
  $lblApi.AutoSize = $true

  $txtApi = New-Object System.Windows.Forms.TextBox
  $txtApi.Location = New-Object System.Drawing.Point(18, 98)
  $txtApi.Width = 406
  $txtApi.Text = if ($DefaultApi) { $DefaultApi } else { "https://your-mvs-host/api" }

  $lblUser = New-Object System.Windows.Forms.Label
  $lblUser.Text = T "사용자 ID" "User ID"
  $lblUser.Location = New-Object System.Drawing.Point(18, 130)
  $lblUser.AutoSize = $true

  $txtUser = New-Object System.Windows.Forms.TextBox
  $txtUser.Location = New-Object System.Drawing.Point(18, 150)
  $txtUser.Width = 406

  $lblPass = New-Object System.Windows.Forms.Label
  $lblPass.Text = T "비밀번호" "Password"
  $lblPass.Location = New-Object System.Drawing.Point(18, 182)
  $lblPass.AutoSize = $true

  $txtPass = New-Object System.Windows.Forms.TextBox
  $txtPass.Location = New-Object System.Drawing.Point(18, 202)
  $txtPass.Width = 406
  $txtPass.UseSystemPasswordChar = $true

  $chkStartup = New-Object System.Windows.Forms.CheckBox
  $chkStartup.Text = T "Windows 시작 시 자동 실행" "Start with Windows"
  $chkStartup.Location = New-Object System.Drawing.Point(18, 234)
  $chkStartup.AutoSize = $true
  $chkStartup.Checked = $false

  $btnOk = New-Object System.Windows.Forms.Button
  $btnOk.Text = T "로그인" "Login"
  $btnOk.Location = New-Object System.Drawing.Point(230, 268)
  $btnOk.Width = 90
  $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = T "취소" "Cancel"
  $btnCancel.Location = New-Object System.Drawing.Point(330, 268)
  $btnCancel.Width = 90
  $btnCancel.DialogResult = [System.Windows.Forms.DialogResult]::Cancel

  $form.Controls.AddRange(@(
      $lblApi, $txtApi, $lblUser, $txtUser, $lblPass, $txtPass, $chkStartup, $btnOk, $btnCancel
    ))
  $form.AcceptButton = $btnOk
  $form.CancelButton = $btnCancel

  $result = $form.ShowDialog()
  if ($result -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
  return [pscustomobject]@{
    apiBase      = (Normalize-MvsApiBase $txtApi.Text)
    userid       = $txtUser.Text.Trim()
    password     = $txtPass.Text
    startWithWin = [bool]$chkStartup.Checked
  }
}

function Normalize-MvsApiBase([string]$Raw) {
  # 웹과 동일: 끝이 /api 가 아니면 붙인다. /api/auth 같은 오입력도 정리.
  $s = [string]$Raw
  if ([string]::IsNullOrWhiteSpace($s)) { return "" }
  $s = $s.Trim()
  # scheme 없으면 https 가정 (로컬호스트는 http)
  if ($s -notmatch '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
    if ($s -match '^(localhost|127\.0\.0\.1)(:|/|$)') {
      $s = "http://$s"
    } else {
      $s = "https://$s"
    }
  }
  $s = $s.TrimEnd("/")
  # 흔한 오입력: .../api/auth/login, .../auth/login
  $s = $s -replace '/api/auth/login$', '/api'
  $s = $s -replace '/auth/login$', '/api'
  $s = $s -replace '/api/auth$', '/api'
  if ($s -match '/api/api$') { $s = $s -replace '/api/api$', '/api' }
  if (-not ($s -match '/api$')) { $s = "$s/api" }
  return $s
}

function Get-MvsApiBaseCandidates([string]$Raw) {
  $primary = Normalize-MvsApiBase $Raw
  $list = New-Object System.Collections.Generic.List[string]
  if ($primary) { [void]$list.Add($primary) }
  # 사용자가 이미 /api 를 넣었는데 서버가 루트에 API를 둔 경우(드묾)
  $trimmed = [string]$Raw
  if (-not [string]::IsNullOrWhiteSpace($trimmed)) {
    $trimmed = $trimmed.Trim().TrimEnd("/")
    if ($trimmed -notmatch '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
      if ($trimmed -match '^(localhost|127\.0\.0\.1)') { $trimmed = "http://$trimmed" } else { $trimmed = "https://$trimmed" }
    }
    $noApi = $trimmed -replace '/api$', ''
    if ($noApi -and $noApi -ne $primary -and -not $list.Contains($noApi)) {
      # 404 재시도용 — 보통은 쓰지 않음
    }
    # localhost:3000 → :5000/api (개발 프론트 주소 오입력)
    if ($trimmed -match '^(https?://)(localhost|127\.0\.0\.1):3000(/api)?$') {
      $dev = "http://$($Matches[2]):5000/api"
      if (-not $list.Contains($dev)) { [void]$list.Add($dev) }
    }
  }
  return @($list)
}

function Get-HttpStatusCode($ErrorRecord) {
  try {
    if ($ErrorRecord.Exception.Response -and $ErrorRecord.Exception.Response.StatusCode) {
      return [int]$ErrorRecord.Exception.Response.StatusCode
    }
  } catch { }
  try {
    $m = [string]$ErrorRecord.Exception.Message
    if ($m -match '\((\d{3})\)') { return [int]$Matches[1] }
  } catch { }
  return 0
}

function Invoke-MvsLogin($ApiBase, $UserId, $Password) {
  $candidates = Get-MvsApiBaseCandidates $ApiBase
  if (-not $candidates -or $candidates.Count -eq 0) {
    throw (T "API 주소를 입력하세요. 예: https://서버주소/api" "Enter API URL. Example: https://your-host/api")
  }

  $payload = [ordered]@{
    userid   = $UserId
    password = $Password
    client   = "mvs_notifier"
  }
  $json = ($payload | ConvertTo-Json -Compress)
  $body = [System.Text.Encoding]::UTF8.GetBytes($json)

  $lastErr = $null
  $tried = New-Object System.Collections.Generic.List[string]
  foreach ($base in $candidates) {
    $uri = "$base/auth/login"
    [void]$tried.Add($uri)
    try {
      $resp = Invoke-RestMethod -Method Post -Uri $uri `
        -ContentType "application/json; charset=utf-8" `
        -Headers (Get-NotifierHeaders "") `
        -Body $body
      if (-not $resp.success -or -not $resp.data.token) {
        throw (T "로그인에 실패했습니다." "Login failed")
      }
      $cfg = [pscustomobject]@{
        apiBase          = $base
        tokenProtected   = Protect-Secret ([string]$resp.data.token)
        userid           = $UserId
        webBase          = ($base -replace "/api$", "")
        version          = $AppVersion
        lang             = $script:UiLang
        startWithWindows = $false
      }
      return $cfg
    } catch {
      $lastErr = $_
      $code = Get-HttpStatusCode $_
      # 404면 다음 후보 시도, 401/403은 즉시 중단(계정 문제)
      if ($code -eq 401 -or $code -eq 403) { break }
      if ($code -ne 404 -and $code -ne 0) { break }
    }
  }

  $code = Get-HttpStatusCode $lastErr
  $detail = if ($lastErr) { [string]$lastErr.Exception.Message } else { "" }
  $triedText = ($tried -join ", ")
  if ($code -eq 404) {
    $ko404 = "로그인 실패(404). API 주소가 올바른지 확인하세요.`r`n예: https://서버주소/api`r`n시도: $triedText"
    $en404 = "Login failed (404). Check API URL.`r`nExample: https://your-host/api`r`nTried: $triedText"
    throw (T $ko404 $en404)
  }
  if ($code -eq 401 -or $code -eq 403) {
    throw (T "아이디 또는 비밀번호가 올바르지 않습니다." "Invalid user ID or password.")
  }
  if ($detail) { throw $detail }
  throw (T "로그인에 실패했습니다." "Login failed")
}

function Invoke-MvsRefresh([string]$ApiBase, [string]$Token) {
  $resp = Invoke-RestMethod -Method Post -Uri "$ApiBase/auth/refresh" `
    -Headers (Get-NotifierHeaders $Token) `
    -ContentType "application/json; charset=utf-8" `
    -Body "{}"
  if (-not $resp.success -or -not $resp.data.token) {
    throw "Refresh failed"
  }
  return [string]$resp.data.token
}

function Get-ApiErrorCode($ErrorRecord) {
  try {
    $detail = [string]$ErrorRecord.ErrorDetails.Message
    if (-not [string]::IsNullOrWhiteSpace($detail)) {
      $obj = $detail | ConvertFrom-Json
      if ($obj.code) { return [string]$obj.code }
    }
  } catch { }
  try {
    $resp = $ErrorRecord.Exception.Response
    if (-not $resp) { return $null }
    $stream = $resp.GetResponseStream()
    if (-not $stream) { return $null }
    $reader = New-Object System.IO.StreamReader($stream)
    $body = $reader.ReadToEnd()
    $reader.Close()
    if ([string]::IsNullOrWhiteSpace($body)) { return $null }
    $obj = $body | ConvertFrom-Json
    return [string]$obj.code
  } catch {
    return $null
  }
}

function Get-NotificationHref($Row) {
  try {
    if ($Row.data) {
      $d = $Row.data
      if ($d -is [string]) {
        try { $d = $d | ConvertFrom-Json } catch { $d = $null }
      }
      if ($d -and $d.href) {
        $h = [string]$d.href
        if ($h.StartsWith("/") -and -not $h.StartsWith("//") -and ($h -notmatch "://")) {
          return $h
        }
      }
    }
  } catch { }
  return $null
}

function Get-MvsNotifications([string]$ApiBase, [string]$Token, [long]$SinceId) {
  $qs = "page=1&limit=$FetchLimit"
  if ($SinceId -gt 0) { $qs += "&since_id=$SinceId" }
  $resp = Invoke-RestMethod -Method Get -Uri "$ApiBase/notifications?$qs" `
    -Headers (Get-NotifierHeaders $Token)
  if ($resp.success -and $resp.data) { return @($resp.data) }
  return @()
}

function Get-MvsInbox([string]$ApiBase, [string]$Token) {
  try {
    $resp = Invoke-RestMethod -Method Get -Uri "$ApiBase/notifications/inbox" `
      -Headers (Get-NotifierHeaders $Token)
    if ($resp.success -and $resp.data) { return @($resp.data) }
  } catch { }
  return @()
}

function Get-StartupShortcutPath {
  return (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\MVS Notifier.lnk")
}

function Set-StartWithWindows([bool]$Enable) {
  $lnk = Get-StartupShortcutPath
  if ($Enable) {
    $target = Join-Path $DataDir "Start-MVS-Notifier.bat"
    if (-not (Test-Path $target)) {
      $target = Join-Path $PSScriptRoot "Start-MVS-Notifier.bat"
    }
    $ws = New-Object -ComObject WScript.Shell
    $s = $ws.CreateShortcut($lnk)
    $s.TargetPath = $target
    $s.WorkingDirectory = (Split-Path $target -Parent)
    $ico = Get-AssetPath "mvs-notifier.ico"
    if ($ico) { $s.IconLocation = "$ico,0" }
    $s.WindowStyle = 7
    $s.Description = "MVS Desktop Notifier"
    $s.Save()
  } else {
    if (Test-Path $lnk) { Remove-Item -Force $lnk -ErrorAction SilentlyContinue }
  }
}

function Test-StartWithWindows {
  return (Test-Path (Get-StartupShortcutPath))
}

function Escape-Xml([string]$Text) {
  if ($null -eq $Text) { return "" }
  return [System.Security.SecurityElement]::Escape($Text)
}

function Show-BalloonTipSafe([string]$Title, [string]$Body) {
  # 전 Windows 공통 폴백 (Focus Assist 등에서도 트레이 아이콘은 유지)
  try {
    $safeTitle = if ($Title) { $Title.Substring(0, [Math]::Min(63, $Title.Length)) } else { $AppName }
    $safeBody = if ($Body) { $Body.Substring(0, [Math]::Min(250, $Body.Length)) } else { " " }
    $notify.BalloonTipTitle = $safeTitle
    $notify.BalloonTipText = $safeBody
    $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
    $notify.ShowBalloonTip(8000)
    return $true
  } catch {
    return $false
  }
}

function New-ToastXmlDocument([string]$XmlText) {
  $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
  $xml.LoadXml($XmlText)
  return $xml
}

function Show-ToastWithXml([string]$XmlText) {
  $xml = New-ToastXmlDocument $XmlText
  # ::new() 대신 New-Object — 구형 PS/런타임 호환
  $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
  $notifier = $null
  if ($script:OsCaps.SupportsAumid) {
    try {
      $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($AppUserModelId)
    } catch { }
  }
  if (-not $notifier) {
    $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier()
  }
  $notifier.Show($toast)
  return $true
}

function Show-MvsToast([string]$Title, [string]$Body, [string]$LaunchUrl) {
  if ($script:OsCaps.PreferBalloonOnly) { return $false }
  if ($script:ToastOk -eq $false) { return $false }

  try {
    $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]
  } catch {
    $script:ToastOk = $false
    return $false
  }

  $t1 = Escape-Xml $Title
  $t2 = Escape-Xml $Body
  $launch = Escape-Xml $(if ($LaunchUrl) { $LaunchUrl } elseif ($config -and $config.webBase) { [string]$config.webBase } else { "" })

  # 1) Win10 1607+ : ToastGeneric (+ optional logo). activationType은 선택(구빌드 실패 방지).
  if ($script:OsCaps.SupportsToastGeneric) {
    $logo = Get-AssetPath "toast-logo.png"
    if (-not $logo) { $logo = Get-AssetPath "app-icon.png" }
    $imgXml = ""
    if ($logo) {
      $logoUri = "file:///" + ($logo -replace "\\", "/")
      $imgXml = "<image placement=`"appLogoOverride`" src=`"$(Escape-Xml $logoUri)`"/>"
    }

    $templates = @()
    if ($launch) {
      $templates += @"
<toast launch="$launch" activationType="protocol">
  <visual><binding template="ToastGeneric"><text>$t1</text><text>$t2</text>$imgXml</binding></visual>
</toast>
"@
      $templates += @"
<toast launch="$launch">
  <visual><binding template="ToastGeneric"><text>$t1</text><text>$t2</text>$imgXml</binding></visual>
</toast>
"@
    }
    $templates += @"
<toast>
  <visual><binding template="ToastGeneric"><text>$t1</text><text>$t2</text>$imgXml</binding></visual>
</toast>
"@

    foreach ($xmlText in $templates) {
      try {
        [void](Show-ToastWithXml $xmlText)
        $script:ToastOk = $true
        return $true
      } catch { }
    }
  }

  # 2) Win8 / 초기 Win10 : ToastText02
  if ($script:OsCaps.SupportsToastLegacy) {
    $legacy = @"
<toast>
  <visual>
    <binding template="ToastText02">
      <text id="1">$t1</text>
      <text id="2">$t2</text>
    </binding>
  </visual>
</toast>
"@
    try {
      [void](Show-ToastWithXml $legacy)
      $script:ToastOk = $true
      return $true
    } catch { }
  }

  $script:ToastOk = $false
  return $false
}

function Get-NotifyIconSafe {
  $icon = $null
  $iconPath = Get-AssetPath "mvs-notifier.ico"
  if ($iconPath) {
    try { $icon = New-Object System.Drawing.Icon $iconPath } catch { $icon = $null }
  }
  if (-not $icon) {
    $png = Get-AssetPath "app-icon.png"
    if (-not $png) { $png = Get-AssetPath "toast-logo.png" }
    if ($png) {
      try {
        $bmp = New-Object System.Drawing.Bitmap $png
        $h = $bmp.GetHicon()
        $tmp = [System.Drawing.Icon]::FromHandle($h)
        $icon = $tmp.Clone()
        $tmp.Dispose()
        $bmp.Dispose()
      } catch { $icon = $null }
    }
  }
  if (-not $icon) {
    $icon = [System.Drawing.SystemIcons]::Application
  }
  return $icon
}

# --- boot config ---
$config = Read-JsonFile -Path $ConfigPath -Default $null
if ($config -and $config.lang) {
  $script:UiLang = Resolve-UiLang ([string]$config.lang)
}

$tokenNow = Get-ConfigToken $config
if ($Setup -or -not $config -or -not $tokenNow) {
  $hintApi = if ($ApiBase) { $ApiBase } elseif ($config) { $config.apiBase } else { "" }
  $defaultsPath = Get-AssetPath "defaults.json"
  if (-not $hintApi -and $defaultsPath) {
    try {
      $defs = Read-JsonFile -Path $defaultsPath -Default $null
      if ($defs -and $defs.apiBaseHint) { $hintApi = [string]$defs.apiBaseHint }
    } catch { }
  }
  $login = Show-LoginDialog -DefaultApi $hintApi
  if (-not $login) { exit 0 }
  try {
    $config = Invoke-MvsLogin -ApiBase $login.apiBase -UserId $login.userid -Password $login.password
    $config.startWithWindows = [bool]$login.startWithWin
    Write-JsonFile -Path $ConfigPath -Object $config
    Set-StartWithWindows -Enable ([bool]$login.startWithWin)
  } catch {
    [System.Windows.Forms.MessageBox]::Show(
      "$(T '로그인 실패' 'Login failed'): $($_.Exception.Message)",
      $AppName
    ) | Out-Null
    exit 1
  }
} else {
  # migrate plaintext token if present
  $plain = Get-ConfigToken $config
  if ($plain -and -not $config.tokenProtected) {
    Set-ConfigToken $config $plain
    Write-JsonFile -Path $ConfigPath -Object $config
  }
}

$script:SeenIds = New-Object "System.Collections.Generic.HashSet[string]"
$script:MaxSeenNumericId = [int64]0
$seenLoaded = Read-JsonFile -Path $SeenPath -Default $null
if ($seenLoaded -is [System.Array]) {
  foreach ($id in @($seenLoaded)) {
    $sid = [string]$id
    [void]$script:SeenIds.Add($sid)
    $n = 0L
    if ([int64]::TryParse($sid, [ref]$n) -and $n -gt $script:MaxSeenNumericId) {
      $script:MaxSeenNumericId = $n
    }
  }
} elseif ($seenLoaded -and $seenLoaded.ids) {
  foreach ($id in @($seenLoaded.ids)) {
    $sid = [string]$id
    [void]$script:SeenIds.Add($sid)
  }
  if ($seenLoaded.maxId) {
    $script:MaxSeenNumericId = [int64]$seenLoaded.maxId
  }
}

$script:Primed = $false
$script:Enabled = $true
$script:TickCount = 0
$script:AuthFailStreak = 0
$script:LastOpenUrl = $(if ($config.webBase) { [string]$config.webBase } else { "http://localhost:3000" })
$script:ToastOk = $null

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Text = "$AppName $AppVersion"
$notify.Icon = Get-NotifyIconSafe
$notify.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$miOpen = $menu.Items.Add((T "MVS 열기" "Open MVS"))
$miLast = $menu.Items.Add((T "마지막 알림 열기" "Open last notification"))
$miCheck = $menu.Items.Add((T "지금 확인" "Check now"))
$miToggle = $menu.Items.Add((T "알림: 켜짐" "Notifications: ON"))
$miStartup = $menu.Items.Add($(if (Test-StartWithWindows) { T "시작 시 실행: 켜짐" "Start with Windows: ON" } else { T "시작 시 실행: 꺼짐" "Start with Windows: OFF" }))
$miLang = $menu.Items.Add($(if ($script:UiLang -eq "ko") { "Language: Korean" } else { "Language: English" }))
$miRelogin = $menu.Items.Add((T "다시 로그인" "Re-login"))
$miExit = $menu.Items.Add((T "종료" "Exit"))
$notify.ContextMenuStrip = $menu

function Save-Seen {
  $arr = @($script:SeenIds)
  if ($arr.Count -gt 500) { $arr = $arr[($arr.Count - 500)..($arr.Count - 1)] }
  Write-JsonFile -Path $SeenPath -Object ([pscustomobject]@{
      ids   = $arr
      maxId = $script:MaxSeenNumericId
    })
}

function Save-Config {
  $config.version = $AppVersion
  $config.lang = $script:UiLang
  Write-JsonFile -Path $ConfigPath -Object $config
}

function Show-Tip([string]$Title, [string]$Body, [string]$OpenUrl) {
  if (-not $script:Enabled) { return }
  if ($OpenUrl) { $script:LastOpenUrl = $OpenUrl }
  $launch = if ($OpenUrl) { $OpenUrl } else { $script:LastOpenUrl }

  $toastWorked = $false
  if (-not $script:OsCaps.PreferBalloonOnly) {
    $toastWorked = Show-MvsToast -Title $Title -Body $Body -LaunchUrl $launch
  }

  # Toast 실패·미지원·Win7 → 항상 풍선. Win10+에서 Toast 성공 시 중복 풍선은 생략.
  if (-not $toastWorked) {
    [void](Show-BalloonTipSafe -Title $Title -Body $Body)
  }
}

function Open-Url([string]$Url) {
  if ([string]::IsNullOrWhiteSpace($Url)) { return }
  try { Start-Process $Url } catch { }
}

function Build-OpenUrl([string]$Href) {
  $base = if ($config.webBase) { [string]$config.webBase } else { "http://localhost:3000" }
  if ([string]::IsNullOrWhiteSpace($Href)) { return $base }
  if ($Href -match "^https?://") { return $Href }
  return ($base.TrimEnd("/") + $Href)
}

function Try-RefreshToken {
  try {
    $cur = Get-ConfigToken $config
    $newToken = Invoke-MvsRefresh -ApiBase $config.apiBase -Token $cur
    Set-ConfigToken $config $newToken
    Save-Config
    $script:AuthFailStreak = 0
    return $true
  } catch {
    $code = Get-ApiErrorCode $_
    if ($code -eq "SESSION_SUPERSEDED") { return $false }
    return $false
  }
}

function Remember-Id([string]$Id) {
  if (-not $Id) { return }
  [void]$script:SeenIds.Add($Id)
  $n = 0L
  if ([int64]::TryParse($Id, [ref]$n) -and $n -gt $script:MaxSeenNumericId) {
    $script:MaxSeenNumericId = $n
  }
}

function Sync-Notifications([bool]$ForceTip) {
  $script:TickCount++
  if ($script:TickCount -ge $RefreshEveryTicks) {
    $script:TickCount = 0
    [void](Try-RefreshToken)
  }

  $token = Get-ConfigToken $config
  $since = if ($script:Primed) { $script:MaxSeenNumericId } else { 0 }
  try {
    $rows = Get-MvsNotifications -ApiBase $config.apiBase -Token $token -SinceId $since
    $inbox = @()
    if ($script:Primed -or $ForceTip) {
      $inbox = Get-MvsInbox -ApiBase $config.apiBase -Token $token
    }
    $script:AuthFailStreak = 0
  } catch {
    $code = Get-ApiErrorCode $_
    if ($code -eq "SESSION_SUPERSEDED") {
      [void](Try-RefreshToken)
      return
    }
    if (Try-RefreshToken) {
      try {
        $token = Get-ConfigToken $config
        $rows = Get-MvsNotifications -ApiBase $config.apiBase -Token $token -SinceId $since
        $inbox = Get-MvsInbox -ApiBase $config.apiBase -Token $token
        $script:AuthFailStreak = 0
      } catch {
        $script:AuthFailStreak++
        if ($ForceTip -or $script:AuthFailStreak -ge 5) {
          Show-Tip $AppName (T "세션이 만료되었습니다. 트레이에서 다시 로그인하세요." "Session expired. Use Re-login from the tray menu.") $null
        }
        return
      }
    } else {
      $script:AuthFailStreak++
      if ($ForceTip -or $script:AuthFailStreak -ge 5) {
        Show-Tip $AppName (T "MVS에 연결할 수 없습니다. 네트워크 또는 로그인을 확인하세요." "Cannot reach MVS. Check network or Re-login.") $null
      }
      return
    }
  }

  if (-not $script:Primed) {
    foreach ($row in $rows) {
      Remember-Id ([string]$row.id)
    }
    foreach ($row in $inbox) {
      Remember-Id ("inbox-" + [string]$row.id)
    }
    $script:Primed = $true
    Save-Seen
    if ($ForceTip) {
      Show-Tip $AppName (T "연결되었습니다. 새 알림을 기다립니다." "Connected. Waiting for new notifications.") (Build-OpenUrl "")
    }
    return
  }

  # newest first from API — show a few tips without flooding
  $shown = 0
  foreach ($row in $rows) {
    $id = [string]$row.id
    if (-not $id -or $script:SeenIds.Contains($id)) { continue }
    Remember-Id $id
    if ($row.read) { continue }
    if ($shown -ge 3) { continue }
    $title = if ($row.title) { [string]$row.title } else { $AppName }
    $msg = if ($row.message) { [string]$row.message } else { "" }
    $href = Get-NotificationHref $row
    Show-Tip $title $msg (Build-OpenUrl $href)
    $shown++
  }

  foreach ($row in $inbox) {
    $id = "inbox-" + [string]$row.id
    if ($script:SeenIds.Contains($id)) { continue }
    Remember-Id $id
    if ($shown -ge 3) { continue }
    $kind = [string]$row.kind
    $title = T "승인·처리 대기" "Action required"
    $msg = if ($kind) { $kind } else { (T "새 대기 항목" "New inbox item") }
    $href = if ($row.href) { [string]$row.href } else { $null }
    Show-Tip $title $msg (Build-OpenUrl $href)
    $shown++
  }

  Save-Seen
  if ($ForceTip -and $shown -eq 0) {
    Show-Tip $AppName (T "새 알림이 없습니다." "No new notifications.") (Build-OpenUrl "")
  }
}

$miOpen.add_Click({ Open-Url (Build-OpenUrl "") })
$miLast.add_Click({ Open-Url $script:LastOpenUrl })
$miCheck.add_Click({ Sync-Notifications -ForceTip $true })

$miToggle.add_Click({
  $script:Enabled = -not $script:Enabled
  $miToggle.Text = $(if ($script:Enabled) { T "알림: 켜짐" "Notifications: ON" } else { T "알림: 꺼짐" "Notifications: OFF" })
})

$miStartup.add_Click({
  $next = -not (Test-StartWithWindows)
  Set-StartWithWindows -Enable $next
  $config.startWithWindows = $next
  Save-Config
  $miStartup.Text = $(if ($next) { T "시작 시 실행: 켜짐" "Start with Windows: ON" } else { T "시작 시 실행: 꺼짐" "Start with Windows: OFF" })
})

$miLang.add_Click({
  $script:UiLang = $(if ($script:UiLang -eq "ko") { "en" } else { "ko" })
  Save-Config
  $miOpen.Text = T "MVS 열기" "Open MVS"
  $miLast.Text = T "마지막 알림 열기" "Open last notification"
  $miCheck.Text = T "지금 확인" "Check now"
  $miToggle.Text = $(if ($script:Enabled) { T "알림: 켜짐" "Notifications: ON" } else { T "알림: 꺼짐" "Notifications: OFF" })
  $miStartup.Text = $(if (Test-StartWithWindows) { T "시작 시 실행: 켜짐" "Start with Windows: ON" } else { T "시작 시 실행: 꺼짐" "Start with Windows: OFF" })
  $miLang.Text = $(if ($script:UiLang -eq "ko") { "Language: Korean" } else { "Language: English" })
  $miRelogin.Text = T "다시 로그인" "Re-login"
  $miExit.Text = T "종료" "Exit"
})

$miRelogin.add_Click({
  $login = Show-LoginDialog -DefaultApi $config.apiBase
  if (-not $login) { return }
  try {
    $config = Invoke-MvsLogin -ApiBase $login.apiBase -UserId $login.userid -Password $login.password
    $config.startWithWindows = [bool]$login.startWithWin
    Save-Config
    Set-StartWithWindows -Enable ([bool]$login.startWithWin)
    $script:Primed = $false
    $script:AuthFailStreak = 0
    $miStartup.Text = $(if ($login.startWithWin) { T "시작 시 실행: 켜짐" "Start with Windows: ON" } else { T "시작 시 실행: 꺼짐" "Start with Windows: OFF" })
    Show-Tip $AppName (T "로그인되었습니다. 웹 세션과 독립입니다." "Logged in. Web sessions stay independent.") (Build-OpenUrl "")
    Sync-Notifications -ForceTip $false
  } catch {
    [System.Windows.Forms.MessageBox]::Show(
      "$(T '로그인 실패' 'Login failed'): $($_.Exception.Message)",
      $AppName
    ) | Out-Null
  }
})

$miExit.add_Click({
  $notify.Visible = $false
  $notify.Dispose()
  [System.Windows.Forms.Application]::Exit()
})

$notify.add_BalloonTipClicked({ Open-Url $script:LastOpenUrl })
$notify.add_DoubleClick({ Open-Url $script:LastOpenUrl })

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = ($PollSeconds * 1000)
$timer.add_Tick({ Sync-Notifications -ForceTip $false })
$timer.Start()

Show-Tip $AppName (T "v$AppVersion 실행 중 · 웹 로그인과 세션 분리" "v$AppVersion running · independent of web login") (Build-OpenUrl "")
Sync-Notifications -ForceTip $false

[System.Windows.Forms.Application]::Run()
