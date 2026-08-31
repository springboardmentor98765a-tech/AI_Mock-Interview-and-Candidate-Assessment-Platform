$ErrorActionPreference = "Stop"
$checks = @(
    @{ Name = "CNN"; Url = "http://127.0.0.1:8095/health" },
    @{ Name = "MediaPipe"; Url = "http://127.0.0.1:8093/health" },
    @{ Name = "Object Detection"; Url = "http://127.0.0.1:8094/health" },
    @{ Name = "Spring Boot"; Url = "http://127.0.0.1:8080/api/health" }
)
foreach ($check in $checks) {
    try {
        $result = Invoke-RestMethod -Uri $check.Url -Method Get -TimeoutSec 8
        Write-Host "[PASS] $($check.Name)" -ForegroundColor Green
        $result | ConvertTo-Json -Compress
    } catch {
        Write-Host "[FAIL] $($check.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host "Frontend: http://127.0.0.1:5500" -ForegroundColor Cyan
