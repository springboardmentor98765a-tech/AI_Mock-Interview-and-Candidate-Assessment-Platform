# scripts/stop.ps1 — HireAI Development Stop
# Stops: Whisper (8765), Kokoro (8766), Express (5000), Vite (5173)
# Does NOT stop: PostgreSQL (5432) or Ollama (11434)

function Get-PidsByPort {
    param([int]$Port)
    # Match :PORT followed by whitespace — works for IPv4 (127.0.0.1:PORT) and IPv6 ([::1]:PORT)
    $pattern = ":$Port\s"
    $found   = netstat -ano | Where-Object { $_ -match $pattern }
    if (-not $found) { return @() }
    $pids = $found | ForEach-Object {
        $parts = ($_ -split '\s+') | Where-Object { $_ -ne '' }
        [int]$parts[-1]
    } | Sort-Object -Unique
    return $pids
}

function Stop-ByPort {
    param([int]$Port, [string]$Name)
    $pids = Get-PidsByPort $Port
    if ($pids.Count -eq 0) {
        Write-Host "  -- $Name ($Port) : not running" -ForegroundColor DarkGray
        return
    }
    foreach ($p in $pids) {
        try {
            Stop-Process -Id $p -Force -ErrorAction Stop
            Write-Host "  [OK] $Name ($Port) : stopped  (PID $p)" -ForegroundColor Green
        } catch {
            Write-Host "  [!!] $Name ($Port) : could not stop PID $p -- $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host ''
Write-Host '  Stopping HireAI development services...' -ForegroundColor Cyan
Write-Host ''

Stop-ByPort 8765 'Faster-Whisper STT'
Stop-ByPort 8766 'Kokoro TTS'
Stop-ByPort 5000 'Express Backend'
Stop-ByPort 5173 'Vite Frontend'

Write-Host ''
Write-Host '  PostgreSQL (5432) and Ollama (11434) left running.' -ForegroundColor DarkGray
Write-Host '  Run "start" to start the development environment again.' -ForegroundColor DarkGray
Write-Host ''
