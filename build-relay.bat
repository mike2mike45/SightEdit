@echo off
chcp 65001 > nul
echo =====================================
echo SightEdit Relay Build Script
echo =====================================
echo.

cd /d "%~dp0SightEdit用C#中継アプリケーション"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot change to relay app directory
    echo Path: "%~dp0SightEdit用C#中継アプリケーション"
    pause
    exit /b 1
)

echo [INFO] Building C# relay application...
dotnet build SightEditRelay.csproj -c Release

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [INFO] Build successful! Copying executable files...

:: 実行ファイルを親フォルダにコピー
copy /Y "bin\Release\net48\SightEditRelay.exe" "..\SightEditRelay.exe" >nul
copy /Y "App.config" "..\SightEditRelay.exe.config" >nul

if exist "..\SightEditRelay.exe" (
    echo [SUCCESS] SightEditRelay.exe is ready
    echo Path: %~dp0SightEditRelay.exe
) else (
    echo [ERROR] Failed to copy files
    pause
    exit /b 1
)

echo.
echo =====================================
echo Build Complete!
echo =====================================
echo.
echo Next steps:
echo 1. Run setup-file-association.bat to configure file associations
echo 2. Double-click test.md to verify functionality
echo.
pause