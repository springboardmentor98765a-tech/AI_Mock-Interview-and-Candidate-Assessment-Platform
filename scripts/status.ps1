# scripts/status.ps1 — HireAI Service Status

function Test-TcpPort {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try   { $client.Connect('127.0.0.1', $Port); return $true }
    catch {}
    finally { $client.Dispose() }
    # Fallback: check netstat for any LISTENING entry (covers IPv6 ::1 binds like Vite)
    return [bool](netstat -ano | Where-Object { $_ -match ":$Port\s+\S+\s+LISTENING" })
}

function Test-HttpReady {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $d = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($null -ne $d) { return ($d.ready -eq $true) }
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Show-Status {
    param([string]$Name, [bool]$Up, [string]$Detail = '')
    $pad = $Name.PadRight(20)
    if ($Up) {
        Write-Host "  [OK]  $pad  $Detail" -ForegroundColor Green
    } else {
        Write-Host "  [--]  $pad  $Detail" -ForegroundColor Red
    }
}

$pgService  = 'postgresql-x64-18'
$pgRunning  = (Get-Service -Name $pgService -ErrorAction SilentlyContinue).Status -eq 'Running'

$ollamaUp   = Test-TcpPort 11434
$whisperUp  = Test-HttpReady 'http://localhost:8765/health'
$kokoroUp   = Test-HttpReady 'http://localhost:8766/health'
$backendUp  = Test-TcpPort 5000
$frontendUp = Test-TcpPort 5173

Write-Host ''
Write-Host '  HireAI Service Status' -ForegroundColor Cyan
Write-Host '  ---------------------' -ForegroundColor DarkGray
Show-Status 'PostgreSQL'     $pgRunning  ':5432  (Windows service)'
Show-Status 'Ollama'         $ollamaUp   ':11434'
Show-Status 'Faster-Whisper' $whisperUp  ':8765  (CUDA STT)'
Show-Status 'Kokoro TTS'     $kokoroUp   ':8766  (CUDA TTS)'
Show-Status 'Express Backend' $backendUp ':5000'
Show-Status 'Vite Frontend'  $frontendUp ':5173'
Write-Host ''

if ($pgRunning -and $ollamaUp -and $whisperUp -and $kokoroUp -and $backendUp -and $frontendUp) {
    Write-Host '  All services running. Frontend: http://localhost:5173' -ForegroundColor Green
} else {
    $stopped = @()
    if (-not $pgRunning)  { $stopped += 'PostgreSQL' }
    if (-not $ollamaUp)   { $stopped += 'Ollama' }
    if (-not $whisperUp)  { $stopped += 'Faster-Whisper' }
    if (-not $kokoroUp)   { $stopped += 'Kokoro TTS' }
    if (-not $backendUp)  { $stopped += 'Express' }
    if (-not $frontendUp) { $stopped += 'Vite' }
    Write-Host "  Not running: $($stopped -join ', ')" -ForegroundColor Yellow
    Write-Host "  Run 'start' to launch the development environment." -ForegroundColor DarkGray
}
Write-Host ''
