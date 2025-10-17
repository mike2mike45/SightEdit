@echo off
chcp 65001 > nul

echo =====================================
echo SightEdit ファイル関連付けクリア
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

echo [INFO] 既存のファイル関連付けをクリアしています...

:: .md拡張子の関連付けを削除
reg delete "HKCU\Software\Classes\.md" /f >nul 2>&1
reg delete "HKCU\Software\Classes\SightEdit.MarkdownFile" /f >nul 2>&1

:: .markdown拡張子の関連付けを削除
reg delete "HKCU\Software\Classes\.markdown" /f >nul 2>&1

:: .txt拡張子の関連付けを削除（もし設定されていた場合）
reg delete "HKCU\Software\Classes\SightEdit.TextFile" /f >nul 2>&1

echo [INFO] レジストリキャッシュをクリアしています...

:: ファイルエクスプローラーの更新
taskkill /f /im explorer.exe >nul 2>&1
start explorer.exe

echo.
echo [SUCCESS] ファイル関連付けをクリアしました
echo.
echo 次の手順:
echo 1. setup-file-association.bat を実行
echo 2. test.md をダブルクリックして動作確認
echo.
pause