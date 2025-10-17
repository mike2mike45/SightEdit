# Chrome拡張機能のブロック設定を確認するPowerShellスクリプト

Write-Host "Chrome Extension Block Checker" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# レジストリのチェック
Write-Host "`nChecking Registry for blocked extensions..." -ForegroundColor Yellow
$registryPaths = @(
    "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallBlocklist",
    "HKCU:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallBlocklist",
    "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist",
    "HKCU:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist"
)

foreach ($path in $registryPaths) {
    if (Test-Path $path) {
        Write-Host "Found: $path" -ForegroundColor Red
        Get-ItemProperty -Path $path
    }
}

# Chromeのプロファイル設定確認
Write-Host "`nChecking Chrome Profile Settings..." -ForegroundColor Yellow
$preferencesPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Preferences"
if (Test-Path $preferencesPath) {
    $prefs = Get-Content $preferencesPath -Raw | ConvertFrom-Json
    if ($prefs.extensions.blacklist) {
        Write-Host "Blacklisted extensions found in preferences:" -ForegroundColor Red
        $prefs.extensions.blacklist | ForEach-Object { Write-Host "  - $_" }
    }
}

Write-Host "`nDone!" -ForegroundColor Green