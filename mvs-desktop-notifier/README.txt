MVS Notifier v2.1 (Windows)
===========================

Windows tray notifier for Minsub Ventures System (MVS).

Features
--------
- Cross-Windows alerts:
  Win10/11 ToastGeneric, Win8 ToastText02, Win7 balloon tip
- TLS 1.2 enabled for HTTPS on older .NET
- Runs in system tray without keeping a browser open
- Session independent from the web app
- DPAPI-protected login token (per Windows user)
- Korean / English tray UI
- Deep-link: open last notification / click balloon
- Optional Start with Windows
- Installer registers Apps & Features uninstall entry

Supported OS
------------
Windows 7 SP1+ (PowerShell 3.0+). Windows 10/11 recommended.

Install
-------
1. Unzip
2. Run Setup.bat  (Install.bat also works)
3. Enter API Base URL (example: https://your-server/api) and sign in
4. Optional: Desktop shortcut, Start with Windows

Uninstall
---------
- Windows Settings → Apps → MVS Notifier → Uninstall
- Or run Uninstall.bat

Tray menu
---------
Open MVS / Open last notification / Check now /
Notifications ON·OFF / Start with Windows / Language /
Re-login / Exit

Notes
-----
- Requires Windows 10+ PowerShell and network access to MVS API
- After upgrade, sign in again (token storage changed)
