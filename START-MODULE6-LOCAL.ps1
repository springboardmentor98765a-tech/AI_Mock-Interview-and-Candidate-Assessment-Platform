param(
    [switch]$SkipInstall
)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$emotion = Join-Path $root "ai-services\emotion-cnn-service"
$mediapipe = Join-Path $root "ai-services\mediapipe-service"
$objects = Join-Path $root "ai-services\object-detection-service"
$backend = Join-Path $root "smarthire-backend"
# Keep third-party Python environments in a short path so Windows does not hit
# MAX_PATH during wheel installation, even when the project is deeply nested.
$runtime = if ($env:SMARTHIRE_MODULE6_RUNTIME) { $env:SMARTHIRE_MODULE6_RUNTIME } else { "C:\SmartHireAI_Runtime" }
$mpVenv = Join-Path $runtime "mediapipe"
$objVenv = Join-Path $runtime "object-detection"

Write-Host "=== SmartHire Module 6 Local Launcher ===" -ForegroundColor Cyan

& (Join-Path $root "SYNC-MODULE6-MODEL.ps1")

if (-not $SkipInstall) {
    New-Item -ItemType Directory -Force $runtime | Out-Null

    if (-not (Test-Path (Join-Path $mpVenv "Scripts\python.exe"))) {
        Write-Host "Creating eye-tracking environment at $mpVenv" -ForegroundColor Yellow
        py -3.13 -m venv $mpVenv
    }
    Write-Host "Installing/checking eye-tracking dependencies..." -ForegroundColor Yellow
    & (Join-Path $mpVenv "Scripts\python.exe") -m pip install --disable-pip-version-check -r (Join-Path $mediapipe "requirements.txt")
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Eye-tracking dependency installation failed. The service may not start. See the eye-service terminal."
    }

    if (-not (Test-Path (Join-Path $objVenv "Scripts\python.exe"))) {
        Write-Host "Creating object-detection environment at $objVenv" -ForegroundColor Yellow
        py -3.13 -m venv $objVenv
    }
    Write-Host "Installing/checking object-detection dependencies..." -ForegroundColor Yellow
    & (Join-Path $objVenv "Scripts\python.exe") -m pip install --disable-pip-version-check -r (Join-Path $objects "requirements.txt")
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Object-detection dependency installation failed. The service may not start. See the object-service terminal."
    }
}

function Start-ServiceTerminal($title, $workingDir, $command) {
    Start-Process powershell -ArgumentList @(
        '-NoExit',
        '-Command',
        "Set-Location -LiteralPath '$workingDir'; Write-Host '$title' -ForegroundColor Cyan; $command"
    ) | Out-Null
}

Start-ServiceTerminal "SmartHire CNN :8095" $emotion "py -3.13 -m uvicorn main:app --host 0.0.0.0 --port 8095"
Start-ServiceTerminal "SmartHire Eye Tracking :8093" $mediapipe "& '$mpVenv\Scripts\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8093"
Start-ServiceTerminal "SmartHire Object Detection :8094" $objects "& '$objVenv\Scripts\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8094"
Start-ServiceTerminal "SmartHire Backend :8080" $backend ".\mvnw.cmd spring-boot:run"
Start-ServiceTerminal "SmartHire Frontend :5500" $root "py -3.13 -m http.server 5500"

Write-Host ""
Write-Host "Started Module 6 stack in separate PowerShell windows." -ForegroundColor Green
Write-Host "CNN       :8095"
Write-Host "EyeTrack  :8093"
Write-Host "Objects   :8094"
Write-Host "Backend   :8080"
Write-Host "Frontend  :5500"
Write-Host "Runtime   :$runtime"
Write-Host "Open http://127.0.0.1:5500" -ForegroundColor Green
