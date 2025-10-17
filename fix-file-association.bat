@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul

echo =====================================
echo SightEdit ファイル関連付け修正
echo =====================================
echo.

:: 管理者権限チェック
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] このスクリプトは管理者権限で実行する必要があります
    echo 右クリックして「管理者として実行」を選択してください
    pause
    exit /b 1
)

:: 古いレジストリ設定を削除
echo [INFO] 古いレジストリ設定を削除しています...
reg delete "HKCR\.md\shell\SightEdit" /f >nul 2>&1
reg delete "HKCR\SightEdit.MarkdownFile" /f >nul 2>&1

:: 正しいパスの設定
set RELAY_APP_PATH=%~dp0SightEditRelay.exe
echo [INFO] 新しい実行ファイルパス: %RELAY_APP_PATH%

:: HKCUでの設定（ユーザー固有）
echo [INFO] HKCUでファイル関連付けを設定しています...
reg add "HKCU\Software\Classes\.md" /ve /d "SightEdit.MarkdownFile" /f >nul
reg add "HKCU\Software\Classes\SightEdit.MarkdownFile" /ve /d "Markdown File" /f >nul
reg add "HKCU\Software\Classes\SightEdit.MarkdownFile\DefaultIcon" /ve /d "%RELAY_APP_PATH%,0" /f >nul
reg add "HKCU\Software\Classes\SightEdit.MarkdownFile\shell\open\command" /ve /d "\"%RELAY_APP_PATH%\" \"%%1\"" /f >nul

:: HKCRでも設定（システム全体）
echo [INFO] HKCRでファイル関連付けを設定しています...
reg add "HKCR\.md\shell\SightEdit" /ve /d "SightEditで開く" /f >nul
reg add "HKCR\.md\shell\SightEdit\command" /ve /d "\"%RELAY_APP_PATH%\" \"%%1\"" /f >nul

:: ファイルエクスプローラーの更新
echo [INFO] ファイルエクスプローラーを更新しています...
taskkill /f /im explorer.exe >nul 2>&1
start explorer.exe

echo.
echo =====================================
echo [SUCCESS] 修正が完了しました！
echo =====================================
echo.
echo 使用する実行ファイル: %RELAY_APP_PATH%
echo.
pause