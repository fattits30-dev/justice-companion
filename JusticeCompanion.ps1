# Justice Companion PowerShell Management Script
# Usage: .\JusticeCompanion.ps1 -Action [Start|Stop|Restart|Status]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Start", "Stop", "Restart", "Status")]
    [string]$Action
)

$AppPath = "C:\Users\sava6\Desktop\Justice Companion\justice-companion-app"

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host "    $Title" -ForegroundColor White
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Get-PortProcess {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connection) {
            return $connection.OwningProcess
        }
    }
    catch {
        return $null
    }
    return $null
}

function Stop-JusticeCompanion {
    Write-Header "STOPPING JUSTICE COMPANION"

    Write-Host "[1/3] Stopping Electron processes..." -ForegroundColor Yellow
    $electronProcesses = Get-Process electron -ErrorAction SilentlyContinue
    if ($electronProcesses) {
        $electronProcesses | Stop-Process -Force
        Write-Host "   [OK] Electron processes stopped" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] No Electron processes found" -ForegroundColor Gray
    }

    Write-Host "[2/3] Stopping development servers..." -ForegroundColor Yellow

    # Check port 5173
    $pid5173 = Get-PortProcess -Port 5173
    if ($pid5173) {
        Stop-Process -Id $pid5173 -Force -ErrorAction SilentlyContinue
        Write-Host "   [OK] Dev server on port 5173 stopped" -ForegroundColor Green
    }

    # Check port 5174
    $pid5174 = Get-PortProcess -Port 5174
    if ($pid5174) {
        Stop-Process -Id $pid5174 -Force -ErrorAction SilentlyContinue
        Write-Host "   [OK] Dev server on port 5174 stopped" -ForegroundColor Green
    }

    Write-Host "[3/3] Cleaning up Node processes..." -ForegroundColor Yellow
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -like "*justice-companion*" }
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   [OK] Node processes cleaned up" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] No related Node processes found" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Application shutdown complete!" -ForegroundColor Green
}

function Start-JusticeCompanion {
    Write-Header "STARTING JUSTICE COMPANION"

    # Check if already running
    $electronRunning = Get-Process electron -ErrorAction SilentlyContinue
    if ($electronRunning) {
        Write-Host "[WARNING] Justice Companion appears to be already running!" -ForegroundColor Yellow
        $response = Read-Host "Do you want to restart it? (Y/N)"
        if ($response -eq 'Y') {
            Stop-JusticeCompanion
            Start-Sleep -Seconds 2
        } else {
            return
        }
    }

    Write-Host "[1/4] Checking environment..." -ForegroundColor Yellow
    if (-not (Test-Path $AppPath)) {
        Write-Host "   [ERROR] Application path not found: $AppPath" -ForegroundColor Red
        return
    }
    Write-Host "   [OK] Application path verified" -ForegroundColor Green

    Write-Host "[2/4] Starting Vite development server..." -ForegroundColor Yellow
    Set-Location $AppPath
    Start-Process -WindowStyle Minimized powershell -ArgumentList "-Command", "cd '$AppPath'; npm run dev"

    Write-Host "   Waiting for dev server to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    # Check if dev server started
    $devServerPID = Get-PortProcess -Port 5174
    if (-not $devServerPID) {
        $devServerPID = Get-PortProcess -Port 5173
    }

    if ($devServerPID) {
        Write-Host "   [OK] Dev server started (PID: $devServerPID)" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] Dev server may not have started properly" -ForegroundColor Yellow
    }

    Write-Host "[3/4] Starting Electron application..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-Command", "cd '$AppPath'; npm start"

    Write-Host "   Waiting for application to load..." -ForegroundColor Gray
    Start-Sleep -Seconds 3

    Write-Host "[4/4] Verifying startup..." -ForegroundColor Yellow
    $electronRunning = Get-Process electron -ErrorAction SilentlyContinue
    if ($electronRunning) {
        Write-Host "   [OK] Electron application running" -ForegroundColor Green
        Write-Host ""
        Write-Host "Justice Companion started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Available Features:" -ForegroundColor Cyan
        Write-Host "  • Sidebar Navigation (visible by default)"
        Write-Host "  • Chat Interface for Legal Assistance"
        Write-Host "  • Case Management System"
        Write-Host "  • Document Vault"
        Write-Host "  • Timeline View"
    } else {
        Write-Host "   [ERROR] Failed to start Electron application" -ForegroundColor Red
    }
}

function Get-JusticeCompanionStatus {
    Write-Header "JUSTICE COMPANION STATUS"

    $electronProcesses = Get-Process electron -ErrorAction SilentlyContinue
    $devServer5173 = Get-PortProcess -Port 5173
    $devServer5174 = Get-PortProcess -Port 5174

    Write-Host "Component Status:" -ForegroundColor Cyan
    Write-Host ""

    if ($electronProcesses) {
        Write-Host "  [RUNNING] Electron Application" -ForegroundColor Green
        foreach ($proc in $electronProcesses) {
            Write-Host "            PID: $($proc.Id), Memory: $([math]::Round($proc.WorkingSet64/1MB))MB" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [STOPPED] Electron Application" -ForegroundColor Red
    }

    if ($devServer5173) {
        Write-Host "  [RUNNING] Dev Server (Port 5173, PID: $devServer5173)" -ForegroundColor Green
    } elseif ($devServer5174) {
        Write-Host "  [RUNNING] Dev Server (Port 5174, PID: $devServer5174)" -ForegroundColor Green
    } else {
        Write-Host "  [STOPPED] Dev Server" -ForegroundColor Red
    }

    Write-Host ""

    if ($electronProcesses -and ($devServer5173 -or $devServer5174)) {
        Write-Host "Overall Status: " -NoNewline
        Write-Host "FULLY OPERATIONAL" -ForegroundColor Green
    } elseif ($electronProcesses -or $devServer5173 -or $devServer5174) {
        Write-Host "Overall Status: " -NoNewline
        Write-Host "PARTIALLY RUNNING" -ForegroundColor Yellow
    } else {
        Write-Host "Overall Status: " -NoNewline
        Write-Host "NOT RUNNING" -ForegroundColor Red
    }
}

# Execute the requested action
switch ($Action) {
    "Start" {
        Start-JusticeCompanion
    }
    "Stop" {
        Stop-JusticeCompanion
    }
    "Restart" {
        Write-Host "Restarting Justice Companion..." -ForegroundColor Cyan
        Stop-JusticeCompanion
        Start-Sleep -Seconds 3
        Start-JusticeCompanion
    }
    "Status" {
        Get-JusticeCompanionStatus
    }
}

Write-Host ""