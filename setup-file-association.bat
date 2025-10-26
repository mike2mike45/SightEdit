@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

echo =====================================
echo SightEdit ファイル関連付け設定
echo =====================================
echo.

:: 管理者権限チェック
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] 管理者権限が必要です。自動で昇格を試みます...
    echo.

    :: PowerShellで自動昇格
    powershell -Command "Start-Process '%~f0' -Verb RunAs" >nul 2>&1

    if %errorlevel% neq 0 (
        echo [ERROR] 自動昇格に失敗しました
        echo.
        echo 以下の手順で実行してください：
        echo 1. このファイルを右クリック
        echo 2. 「管理者として実行」を選択
        echo.
        pause
        exit /b 1
    ) else (
        echo [SUCCESS] 管理者権限で再起動しました
        echo このウィンドウは閉じて構いません
        timeout /t 3 >nul
        exit /b 0
    )
)

:: Chrome拡張機能IDの設定（App.configから読み取り済み）
set EXTENSION_ID=chibfgpnajlchhljdojcpmamhplnogcp
echo [INFO] 拡張機能ID: %EXTENSION_ID%

:: C#中継アプリのパス設定
set RELAY_APP_PATH=%~dp0SightEditRelay.exe

if not exist "%RELAY_APP_PATH%" (
    echo [ERROR] SightEditRelay.exe が見つかりません
    echo パス: %RELAY_APP_PATH%
    echo.
    echo C#中継アプリをビルドしてください
    pause
    exit /b 1
)

echo.
echo [INFO] 設定内容:
echo - 拡張機能ID: %EXTENSION_ID%
echo - 中継アプリ: %RELAY_APP_PATH%
echo.

:: App.configはすでに正しいIDで設定済み
echo [INFO] App.config は設定済みです

:: レジストリ設定（.mdファイルの関連付け）
echo [INFO] レジストリを設定しています...

:: .md拡張子の関連付け
reg add "HKCU\Software\Classes\.md" /ve /d "SightEdit.MarkdownFile" /f >nul
reg add "HKCU\Software\Classes\SightEdit.MarkdownFile" /ve /d "Markdown File" /f >nul
reg add "HKCU\Software\Classes\SightEdit.MarkdownFile\DefaultIcon" /ve /d "%RELAY_APP_PATH%,0" /f >nul
reg add "HKCU\Software\Classes\SightEdit.MarkdownFile\shell\open\command" /ve /d "\"%RELAY_APP_PATH%\" \"%%1\"" /f >nul

:: .markdown拡張子の関連付け
reg add "HKCU\Software\Classes\.markdown" /ve /d "SightEdit.MarkdownFile" /f >nul

:: .txt拡張子もオプションで関連付け
choice /C YN /M ".txtファイルもSightEditに関連付けますか？"
if !errorlevel!==1 (
    reg add "HKCU\Software\Classes\.txt" /ve /d "SightEdit.TextFile" /f >nul
    reg add "HKCU\Software\Classes\SightEdit.TextFile" /ve /d "Text File" /f >nul
    reg add "HKCU\Software\Classes\SightEdit.TextFile\DefaultIcon" /ve /d "%RELAY_APP_PATH%,0" /f >nul
    reg add "HKCU\Software\Classes\SightEdit.TextFile\shell\open\command" /ve /d "\"%RELAY_APP_PATH%\" \"%%1\"" /f >nul
)

:: ファイルエクスプローラーの更新
echo [INFO] ファイルエクスプローラーを更新しています...
taskkill /f /im explorer.exe >nul 2>&1
start explorer.exe

echo.
echo =====================================
echo [SUCCESS] 設定が完了しました！
echo =====================================
echo.
echo 次の手順:
echo 1. Chrome拡張機能を再読み込み（chrome://extensions/）
echo 2. .mdファイルをダブルクリックして動作確認
echo.
echo 問題がある場合:
echo - Chrome拡張機能が有効になっているか確認
echo - 拡張機能IDが正しいか確認
echo - Chromeが起動しているか確認
echo.
pause