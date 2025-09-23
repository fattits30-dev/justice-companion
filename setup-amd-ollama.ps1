# Setup AMD-Optimized Ollama for RX 6600XT
# This script installs the community fork of Ollama with AMD GPU support

Write-Host "=== Setting up AMD-Optimized Ollama for RX 6600XT ===" -ForegroundColor Green
Write-Host ""

# Step 1: Stop current Ollama
Write-Host "[1/6] Stopping current Ollama service..." -ForegroundColor Yellow
Stop-Process -Name "ollama" -Force -ErrorAction SilentlyContinue
Stop-Service -Name "ollama" -Force -ErrorAction SilentlyContinue
Write-Host "✓ Ollama stopped" -ForegroundColor Green

# Step 2: Uninstall current Ollama (if exists)
Write-Host "[2/6] Uninstalling current Ollama..." -ForegroundColor Yellow
$uninstallPath = "${env:LOCALAPPDATA}\Programs\Ollama\unins000.exe"
if (Test-Path $uninstallPath) {
    Start-Process -FilePath $uninstallPath -ArgumentList "/SILENT" -Wait
    Write-Host "✓ Old Ollama uninstalled" -ForegroundColor Green
} else {
    Write-Host "✓ No previous Ollama installation found" -ForegroundColor Green
}

# Step 3: Download AMD-optimized Ollama
Write-Host "[3/6] Downloading AMD-optimized Ollama fork..." -ForegroundColor Yellow
$ollamaUrl = "https://github.com/likelovewant/ollama-for-amd/releases/latest/download/OllamaSetup.exe"
$ollamaPath = "$env:TEMP\OllamaSetup-AMD.exe"

try {
    # Enable TLS 1.2
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    # Download with progress
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($ollamaUrl, $ollamaPath)
    Write-Host "✓ AMD Ollama downloaded" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to download. Opening browser to download manually..." -ForegroundColor Red
    Start-Process "https://github.com/likelovewant/ollama-for-amd/releases"
    Write-Host "Please download OllamaSetup.exe manually and run this script again" -ForegroundColor Yellow
    exit 1
}

# Step 4: Install AMD Ollama
Write-Host "[4/6] Installing AMD-optimized Ollama..." -ForegroundColor Yellow
Start-Process -FilePath $ollamaPath -ArgumentList "/SILENT" -Wait
Write-Host "✓ AMD Ollama installed" -ForegroundColor Green

# Step 5: Download ROCm libraries for gfx1032
Write-Host "[5/6] Downloading ROCm libraries for RX 6600XT (gfx1032)..." -ForegroundColor Yellow
$rocmUrl = "https://github.com/likelovewant/ROCmLibs-for-gfx1103-AMD780M-APU/releases/download/v6.1.2/rocblas_v6.1.2_gfx1030_1031_1032_1034_1035_1036_1100_1101_1102_1103.zip"
$rocmPath = "$env:TEMP\rocm-gfx1032.zip"
$extractPath = "$env:TEMP\rocm-libs"

try {
    $webClient.DownloadFile($rocmUrl, $rocmPath)
    Write-Host "✓ ROCm libraries downloaded" -ForegroundColor Green

    # Extract ROCm files
    Write-Host "Extracting ROCm libraries..." -ForegroundColor Yellow
    Expand-Archive -Path $rocmPath -DestinationPath $extractPath -Force

    # Find Ollama installation directory
    $ollamaDir = "${env:LOCALAPPDATA}\Programs\Ollama"
    if (-not (Test-Path $ollamaDir)) {
        $ollamaDir = "${env:ProgramFiles}\Ollama"
    }

    if (Test-Path $ollamaDir) {
        # Backup original files
        if (Test-Path "$ollamaDir\rocblas.dll") {
            Copy-Item "$ollamaDir\rocblas.dll" "$ollamaDir\rocblas.dll.original" -Force
            Write-Host "✓ Original rocblas.dll backed up" -ForegroundColor Green
        }

        # Copy new ROCm files
        Get-ChildItem -Path $extractPath -Recurse -Filter "*.dll" | ForEach-Object {
            Copy-Item $_.FullName -Destination $ollamaDir -Force
        }

        if (Test-Path "$extractPath\library") {
            Copy-Item -Path "$extractPath\library" -Destination $ollamaDir -Recurse -Force
        }

        Write-Host "✓ ROCm libraries installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Could not find Ollama installation directory" -ForegroundColor Red
        Write-Host "Please manually copy ROCm files from $extractPath to Ollama directory" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Failed to download ROCm libraries. Opening browser..." -ForegroundColor Red
    Start-Process "https://github.com/likelovewant/ROCmLibs-for-gfx1103-AMD780M-APU/releases"
    Write-Host "Please download and extract ROCm libraries manually" -ForegroundColor Yellow
}

# Step 6: Start Ollama and test
Write-Host "[6/6] Starting AMD-optimized Ollama..." -ForegroundColor Yellow
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 3

# Pull a fast model for testing
Write-Host "Pulling fast model for testing (phi3:mini)..." -ForegroundColor Yellow
Start-Process -FilePath "ollama" -ArgumentList "pull phi3:mini" -Wait -NoNewWindow

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "AMD-optimized Ollama is now installed with GPU support for your RX 6600XT!" -ForegroundColor Green
Write-Host ""
Write-Host "To verify GPU usage, run:" -ForegroundColor Cyan
Write-Host "  ollama ps" -ForegroundColor White
Write-Host ""
Write-Host "To test with a fast model, run:" -ForegroundColor Cyan
Write-Host "  ollama run phi3:mini" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Never update Ollama through the app - always use the AMD fork!" -ForegroundColor Yellow
Write-Host ""