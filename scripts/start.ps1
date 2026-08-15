# scripts/start.ps1 — HireAI Development Launcher
# Run from project root via: powershell -ExecutionPolicy Bypass -File scripts\start.ps1
# Or via Git Bash: start  (after sourcing scripts\hireai-env.sh)

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sttPython   = Join-Path $projectRoot '.venv\Scripts\python.exe'
$ttsPython   = Join-Path $projectRoot 'tts-venv\Scripts\python.exe'
$sttScript   = Join-Path $projectRoot 'backend\ai\stt_service.py'
$ttsScript   = Join-Path $projectRoot 'backend\ai\tts_service.py'
$backendDir  = Join-Path $projectRoot 'backend'
$pgService   = 'postgresql-x64-18'
$ollamaExe   = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'

# ── helpers ──────────────────────────────────────────────────────────────────

function Write-Step { param([string]$msg)
    Write-Host "  $msg" -ForegroundColor Cyan }

function Write-Ok { param([string]$msg)
    Write-Host "  [OK] $msg" -ForegroundColor Green }

function Write-Warn { param([string]$msg)
    Write-Host "  [!!] $msg" -ForegroundColor Yellow }

function Write-Fail { param([string]$msg)
    Write-Host "  [XX] $msg" -ForegroundColor Red }

function Test-TcpPort {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try   { $client.Connect('127.0.0.1', $Port); return $true }
    catch {}
    finally { $client.Dispose() }
    # Fallback: check netstat for any LISTENING entry (covers IPv6 ::1 binds like Vite)
    return [bool](netstat -ano | Where-Object { $_ -match ":$Port\s+\S+\s+LISTENING" })
}

function Wait-TcpPort {
    param([int]$Port, [int]$TimeoutSec = 60)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-TcpPort $Port) { return $true }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Test-ServiceHttpReady {
    param([string]$Url)
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $d = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($null -ne $d) { return ($d.ready -eq $true) }
        return ($r.StatusCode -eq 200)
    } catch { return $false }
}

function Wait-ServiceHttpReady {
    param([string]$Url, [int]$TimeoutSec = 180)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-ServiceHttpReady $Url) { return $true }
        Start-Sleep -Seconds 3
    }
    return $false
}

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$Python    = '',
        [string]$Script    = '',
        [string[]]$ScriptArgs = @(),
        [string]$WorkDir   = '',
        [string]$NpmArgs   = ''
    )
    # Build the command as a PowerShell script string.
    # try/catch around WindowTitle so a missing console host does not kill startup.
    $lines = @(
        "try { `$host.UI.RawUI.WindowTitle = '$Title' } catch {}"
    )
    if ($WorkDir) {
        $esc   = $WorkDir -replace "'", "''"
        $lines += "Set-Location '$esc'"
    }
    if ($Python) {
        $pyE   = $Python -replace "'", "''"
        $scE   = $Script -replace "'", "''"
        $aStr  = $ScriptArgs -join ' '
        # -u = unbuffered output (shows startup messages immediately)
        $lines += "& '$pyE' '-u' '$scE' $aStr"
    }
    if ($NpmArgs) {
        $lines += "npm $NpmArgs"
    }
    $lines += "Write-Host '`nProcess stopped.' -ForegroundColor Red"
    $lines += "Read-Host 'Press Enter to close this window'"

    $cmd     = $lines -join "`n"
    $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($cmd))
    Start-Process powershell.exe -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded
    ) -WindowStyle Normal
}

# ── banner ────────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '  +------------------------------------------+' -ForegroundColor Magenta
Write-Host '  |       HireAI  --  Development Start      |' -ForegroundColor Magenta
Write-Host '  +------------------------------------------+' -ForegroundColor Magenta
Write-Host ''

# ── 1. PostgreSQL (5432) ──────────────────────────────────────────────────────

Write-Step 'Checking PostgreSQL (5432)...'
$pgStatus = (Get-Service -Name $pgService -ErrorAction SilentlyContinue).Status

if ($pgStatus -eq 'Running') {
    Write-Ok "PostgreSQL already running  ($pgService)"
} else {
    Write-Step "PostgreSQL is not running -- requesting start via Task Scheduler..."
    $task = Get-ScheduledTask -TaskName 'HireAI-StartPostgres' -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-Host ''
        Write-Fail "Scheduled task 'HireAI-StartPostgres' not found."
        Write-Host '  Run the one-time setup (requires Administrator):' -ForegroundColor Yellow
        Write-Host '    powershell -ExecutionPolicy Bypass -File scripts\setup-postgres-task.ps1' -ForegroundColor White
        Write-Host ''
        exit 1
    }
    Start-ScheduledTask -TaskName 'HireAI-StartPostgres'
    Write-Step "Waiting for PostgreSQL to accept connections (up to 60s)..."
    if (-not (Wait-TcpPort 5432 60)) {
        Write-Fail "PostgreSQL did not start within 60s. Check Windows Event Viewer."
        exit 1
    }
    Write-Ok "PostgreSQL started"
}

# ── 2. Ollama (11434) ─────────────────────────────────────────────────────────

Write-Step 'Checking Ollama (11434)...'
if (Test-TcpPort 11434) {
    Write-Ok "Ollama already running on 11434"
} else {
    if (Test-Path $ollamaExe) {
        Write-Step "Starting Ollama serve..."
        Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WindowStyle Minimized
        if (-not (Wait-TcpPort 11434 45)) {
            Write-Fail "Ollama did not start within 45s"
            exit 1
        }
        Write-Ok "Ollama started on 11434"
    } else {
        Write-Warn "Ollama not found at: $ollamaExe"
        Write-Warn "Skipping -- LLM features may fall back to Gemini"
    }
}

# ── 3 + 4. Faster-Whisper (8765) and Kokoro (8766) — start in PARALLEL ───────
# Both AI services are launched before waiting for either, allowing simultaneous
# CUDA model loading which reduces total startup time significantly.

$whisperAlreadyUp = Test-ServiceHttpReady 'http://localhost:8765/health'
$kokoroAlreadyUp  = Test-ServiceHttpReady 'http://localhost:8766/health'

if ($whisperAlreadyUp) {
    Write-Ok "Faster-Whisper already running on 8765"
} else {
    Write-Step "Starting Faster-Whisper STT window..."
    Start-ServiceWindow `
        -Title      '[Whisper STT :8765]' `
        -Python     $sttPython `
        -Script     $sttScript `
        -ScriptArgs @('--port', '8765', '--model', 'small', '--device', 'cuda', '--compute-type', 'float16')
}

if ($kokoroAlreadyUp) {
    Write-Ok "Kokoro TTS already running on 8766"
} else {
    Write-Step "Starting Kokoro TTS window..."
    Start-ServiceWindow `
        -Title      '[Kokoro TTS :8766]' `
        -Python     $ttsPython `
        -Script     $ttsScript `
        -ScriptArgs @('--port', '8766', '--voice', 'af_heart', '--device', 'cuda')
}

# Now wait for both (up to 150s each — models load in parallel)
if (-not $whisperAlreadyUp) {
    Write-Step "Waiting for Faster-Whisper to be ready (up to 150s)..."
    if (-not (Wait-ServiceHttpReady 'http://localhost:8765/health' 150)) {
        Write-Fail "Faster-Whisper did not become ready within 150s"
        Write-Warn "Check the [Whisper STT :8765] window for errors."
        exit 1
    }
    Write-Ok "Faster-Whisper STT ready on 8765"
}

if (-not $kokoroAlreadyUp) {
    Write-Step "Waiting for Kokoro TTS to be ready (up to 150s)..."
    if (-not (Wait-ServiceHttpReady 'http://localhost:8766/health' 150)) {
        Write-Fail "Kokoro TTS did not become ready within 150s"
        Write-Warn "Check the [Kokoro TTS :8766] window for errors."
        exit 1
    }
    Write-Ok "Kokoro TTS ready on 8766"
}

# ── 5. Express Backend (5000) ─────────────────────────────────────────────────

Write-Step 'Checking Express backend (5000)...'
if (Test-TcpPort 5000) {
    Write-Ok "Express backend already running on 5000"
} else {
    Write-Step "Starting Express backend..."
    Start-ServiceWindow `
        -Title   '[HireAI Backend :5000]' `
        -WorkDir $backendDir `
        -NpmArgs 'start'
    Write-Step "Waiting for Express to accept connections (up to 30s)..."
    if (-not (Wait-TcpPort 5000 30)) {
        Write-Fail "Express backend did not start within 30s."
        Write-Warn "Check the [HireAI Backend :5000] window for errors (DB connection?)."
        exit 1
    }
    Write-Ok "Express backend ready on 5000"
}

# ── 6. Vite Frontend (5173) ───────────────────────────────────────────────────

Write-Step 'Checking Vite frontend (5173)...'
if (Test-TcpPort 5173) {
    Write-Ok "Vite frontend already running on 5173"
} else {
    Write-Step "Starting Vite frontend..."
    Start-ServiceWindow `
        -Title   '[HireAI Frontend :5173]' `
        -WorkDir $projectRoot `
        -NpmArgs 'run dev'
    Write-Step "Waiting for Vite to start (up to 30s)..."
    if (-not (Wait-TcpPort 5173 30)) {
        Write-Fail "Vite frontend did not start within 30s"
        exit 1
    }
    Write-Ok "Vite frontend ready on 5173"
}

# ── Summary ───────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '  +------------------------------------------+' -ForegroundColor Green
Write-Host '  |           HireAI is ready!               |' -ForegroundColor Green
Write-Host '  +------------------------------------------+' -ForegroundColor Green
Write-Host '  |  Frontend  :  http://localhost:5173      |' -ForegroundColor Green
Write-Host '  |  Backend   :  http://localhost:5000      |' -ForegroundColor Green
Write-Host '  |  Whisper   :  http://localhost:8765      |' -ForegroundColor Green
Write-Host '  |  Kokoro    :  http://localhost:8766      |' -ForegroundColor Green
Write-Host '  |  Ollama    :  http://localhost:11434     |' -ForegroundColor Green
Write-Host '  +------------------------------------------+' -ForegroundColor Green
Write-Host ''
Write-Host '  stop    -- stop Whisper, Kokoro, Backend, Frontend' -ForegroundColor DarkGray
Write-Host '  status  -- check all service health' -ForegroundColor DarkGray
Write-Host ''
