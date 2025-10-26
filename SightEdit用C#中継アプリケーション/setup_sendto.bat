@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo  SightEdit Relay Setup
echo ========================================
echo.

REM 管理者権限チェック
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrator privileges required.
    echo.
    echo How to run:
    echo 1. Right-click this file
    echo 2. Select "Run as administrator"
    echo.
    pause
    exit /b 1
)

REM 実行ファイルの場所を自動検出
set "APP_PATH="
if exist "%~dp0SightEditRelay.exe" (
    set "APP_PATH=%~dp0SightEditRelay.exe"
) else if exist "%~dp0bin\Release\net48\SightEditRelay.exe" (
    set "APP_PATH=%~dp0bin\Release\net48\SightEditRelay.exe"
) else if exist "C:\Program Files\SightEditRelay\SightEditRelay.exe" (
    set "APP_PATH=C:\Program Files\SightEditRelay\SightEditRelay.exe"
) else (
    echo Error: SightEditRelay.exe not found.
    echo Please ensure the executable is in one of these locations:
    echo - Current directory
    echo - bin\Release\net48\
    echo - C:\Program Files\SightEditRelay\
    echo.
    pause
    exit /b 1
)

echo Found SightEditRelay.exe at: !APP_PATH!
echo.

REM ファイル関連付けの設定
echo Setting up file association for .md files...
echo.

REM .mdファイルの関連付けをSightEditRelayに設定
reg add "HKCU\Software\Classes\.md" /ve /d "SightEditRelay.Document" /f >nul
reg add "HKCU\Software\Classes\SightEditRelay.Document" /ve /d "SightEdit Markdown File" /f >nul
reg add "HKCU\Software\Classes\SightEditRelay.Document\DefaultIcon" /ve /d "\"!APP_PATH!\",0" /f >nul
reg add "HKCU\Software\Classes\SightEditRelay.Document\shell\open\command" /ve /d "\"!APP_PATH!\" \"%%1\"" /f >nul

if %errorLevel% equ 0 (
    echo ✓ File association created successfully!
) else (
    echo ✗ File association setup failed.
)

REM SendToメニューの設定（オプション）
set "SENDTO_DIR=%APPDATA%\Microsoft\Windows\SendTo"
set "SHORTCUT_PATH=%SENDTO_DIR%\SightEdit.lnk"

echo.
echo Setting up SendTo menu option...

REM PowerShellでショートカット作成
powershell -ExecutionPolicy Bypass -Command "& {$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '!APP_PATH!'; $s.Description = 'Open with SightEdit'; $s.WorkingDirectory = '%~dp0'; $s.Save()}" 2>nul

if exist "%SHORTCUT_PATH%" (
    echo ✓ SendTo menu option created successfully!
) else (
    echo ✗ SendTo menu setup failed, but file association should work.
)

REM 設定完了
echo.
echo ========================================
echo  Setup completed!
echo ========================================
echo.
echo HOW TO USE:
echo.
echo Method 1: Double-click any .md file
echo   - SightEdit will automatically open
echo.
echo Method 2: Right-click any file
echo   - Select "Send to" -^> "SightEdit"
echo.
echo TROUBLESHOOTING:
echo   - Log file: %TEMP%\SightEditRelay.log
echo   - Program location: !APP_PATH!
echo.
echo アンインストール用ファイルを作成中...

REM アンインストール用バッチファイルを作成
(
echo @echo off
echo echo Uninstalling SightEdit Relay...
echo reg delete "HKCU\Software\Classes\.md" /f ^>nul 2^>^&1
echo reg delete "HKCU\Software\Classes\SightEditRelay.Document" /f ^>nul 2^>^&1
echo del "%SHORTCUT_PATH%" ^>nul 2^>^&1
echo echo SightEdit Relay uninstalled.
echo pause
) > "%~dp0uninstall_sightedit.bat"

echo ✓ Created uninstall_sightedit.bat
echo.
pause