# PowerShellスクリプト：C#中継アプリの設定更新

param(
    [Parameter(Mandatory=$true)]
    [string]$ExtensionId,
    
    [Parameter(Mandatory=$false)]
    [string]$RelayAppPath = "$PSScriptRoot\SightEdit用C#中継アプリケーション"
)

Write-Host "SightEdit Relay Configuration Updater" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# App.configファイルのパス
$appConfigPath = Join-Path $RelayAppPath "App.config"
$csFilePath = Join-Path $RelayAppPath "SightEditRelay.cs"

# App.configの更新
if (Test-Path $appConfigPath) {
    Write-Host "Updating App.config..." -ForegroundColor Yellow
    
    $config = Get-Content $appConfigPath -Raw
    $config = $config -replace '<add key="ExtensionId" value="[^"]*"', "<add key=`"ExtensionId`" value=`"$ExtensionId`""
    $config = $config -replace '<add key="ExtensionPath" value="[^"]*"', '<add key="ExtensionPath" value="/editor.html"'
    
    Set-Content $appConfigPath $config
    Write-Host "✓ App.config updated" -ForegroundColor Green
} else {
    Write-Host "✗ App.config not found at: $appConfigPath" -ForegroundColor Red
}

# SightEditRelay.csの更新
if (Test-Path $csFilePath) {
    Write-Host "Updating SightEditRelay.cs..." -ForegroundColor Yellow
    
    $csContent = Get-Content $csFilePath -Raw
    
    # 拡張機能URLの更新（行180付近）
    $oldUrl = 'var extensionUrl = "chrome-extension://joddgnddcoioliebnpalfepojlkenmlg/src/editor/editor.html\?file=http://localhost:8080/file"'
    $newUrl = "var extensionUrl = `"chrome-extension://$ExtensionId/editor.html?file=http://localhost:8080/file`""
    
    $csContent = $csContent -replace 'var extensionUrl = "chrome-extension://[^/]+/[^"]*"', $newUrl
    
    Set-Content $csFilePath $csContent
    Write-Host "✓ SightEditRelay.cs updated" -ForegroundColor Green
} else {
    Write-Host "✗ SightEditRelay.cs not found at: $csFilePath" -ForegroundColor Red
}

# ビルド指示
Write-Host "`n" -NoNewline
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open Visual Studio or use MSBuild to rebuild SightEditRelay.exe" -ForegroundColor White
Write-Host "2. Or run: dotnet build `"$RelayAppPath\SightEditRelay.csproj`"" -ForegroundColor White
Write-Host "3. Copy the built exe to the SightEdit directory" -ForegroundColor White

Write-Host "`nConfiguration completed!" -ForegroundColor Green