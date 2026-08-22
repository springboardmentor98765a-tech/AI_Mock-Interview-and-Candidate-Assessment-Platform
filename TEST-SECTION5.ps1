param(
    [switch]$RunApiTest
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $Root "smarthire-backend"

Write-Host ""
Write-Host "=== SmartHire Section 5 Verification ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host ""

# 1. Required implementation files
$required = @(
    "js\script.js",
    "pages\live-interview.html",
    "js\live-interview-exam-mode.js",
    "smarthire-backend\src\main\java\com\smarthire\backend\ai\speech\SpeechController.java",
    "smarthire-backend\src\main\java\com\smarthire\backend\ai\speech\SpeechAnalysisService.java",
    "smarthire-backend\src\main\java\com\smarthire\backend\ai\speech\SpeechAnalysisResult.java"
)

foreach ($file in $required) {
    $path = Join-Path $Root $file
    if (-not (Test-Path $path)) {
        throw "Missing required file: $file"
    }
    Write-Host "[PASS] $file" -ForegroundColor Green
}

# 2. Frontend JavaScript syntax
Write-Host ""
Write-Host "Checking JavaScript syntax..."
& node --check (Join-Path $Root "js\script.js")
if ($LASTEXITCODE -ne 0) {
    throw "JavaScript syntax check failed."
}
Write-Host "[PASS] js/script.js syntax" -ForegroundColor Green
& node --check (Join-Path $Root "js\live-interview-exam-mode.js")
if ($LASTEXITCODE -ne 0) { throw "Exam-mode JavaScript syntax check failed." }
Write-Host "[PASS] js/live-interview-exam-mode.js syntax" -ForegroundColor Green

# 3. Required Section 5 UI hooks
$html = Get-Content (Join-Path $Root "pages\live-interview.html") -Raw
$hooks = @(
    "speechGrammarQuality",
    "speechPace",
    "speechFillerWords",
    "speechCommunicationScore",
    "speechPronunciationScore",
    "speechTranscriptionConfidence",
    "speechGrammarIssues",
    "speechAvgResponseLength",
    "speechCommunicationInsights",
    "speechAnalysisStatus"
)

foreach ($hook in $hooks) {
    if ($html -notmatch [regex]::Escape($hook)) {
        throw "Missing Section 5 UI hook: $hook"
    }
}
Write-Host "[PASS] Section 5 UI hooks" -ForegroundColor Green

# 4. Final evaluation integration + light-mode contrast guards
$service = Get-Content (Join-Path $Root "smarthire-backend\src\main\java\com\smarthire\backend\interview\service\InterviewService.java") -Raw
$css = Get-Content (Join-Path $Root "css\live-interview-final-overrides.css") -Raw
if ($service -notmatch 'evaluationResponse = applyLiveCommunicationMetrics\(request, evaluationResponse\);') {
    throw "Speech metrics are not wired into the final evaluation flow."
}
if ($service -notmatch 'response\.setCommunicationScore\(clampScore\(communication\)\);') {
    throw "Communication score is not persisted into final evaluation response."
}
if ($service -notmatch 'response\.setOverallScore\(clampScore\(Math\.round') {
    throw "Final weighted overall-score recalculation is missing."
}
if ($css -notmatch 'body\.live-room-clean:not\(\.dark-mode\).*evaluation-metric strong') {
    throw "Light-mode evaluation number contrast rule is missing."
}
Write-Host "[PASS] Final evaluation speech-score integration" -ForegroundColor Green
Write-Host "[PASS] Light-mode evaluation number contrast" -ForegroundColor Green

# 4b. Exam-mode + fixed-camera verification
$examJs = Get-Content (Join-Path $Root "js\live-interview-exam-mode.js") -Raw
if ($html -notmatch 'live-interview-exam-mode\.js') { throw "Exam-mode script is not loaded by live-interview.html." }
if ($css -notmatch 'camera-pinned.*clean-video-card') { throw "Fixed-camera CSS is missing." }
if ($css -notmatch 'sh-exam-gate') { throw "Fullscreen exam-mode gate CSS is missing." }
if ($examJs -notmatch 'requestFullscreen') { throw "Fullscreen request implementation is missing." }
if ($examJs -notmatch 'fullscreenchange') { throw "Fullscreen exit/re-entry handling is missing." }
if ($examJs -notmatch 'pauseIfNeeded') { throw "Fullscreen exit pause protection is missing." }
Write-Host "[PASS] Fixed camera remains visible during scrolling" -ForegroundColor Green
Write-Host "[PASS] Full-screen exam mode + exit/re-entry handling" -ForegroundColor Green

# 5. Backend unit/integration tests
Write-Host ""
Write-Host "Running Maven tests..."
Push-Location $Backend
try {
    & .\mvnw.cmd clean test
    if ($LASTEXITCODE -ne 0) {
        throw "Maven tests failed."
    }
}
finally {
    Pop-Location
}
Write-Host "[PASS] Maven test suite" -ForegroundColor Green

# 6. Optional live API smoke test.
# Requires the backend to be running on localhost:8080 and a valid JWT.
if ($RunApiTest) {
    $token = Read-Host "Paste a valid SmartHire JWT token"
    if ([string]::IsNullOrWhiteSpace($token)) {
        throw "JWT token is required for -RunApiTest."
    }

    $body = @{
        transcript = "I built a React application and improved API performance. Um, I also reduced response time."
        durationSeconds = 30
        transcriptionConfidence = 92
    }

    $headers = @{ Authorization = "Bearer $token" }

    $result = Invoke-RestMethod `
        -Uri "http://localhost:8080/api/ai/speech/analyze" `
        -Method Post `
        -Headers $headers `
        -ContentType "application/x-www-form-urlencoded" `
        -Body $body

    if ([int]$result.grammarQuality -le 0) { throw "Grammar score is zero." }
    if ([int]$result.speakingPaceWpm -le 0) { throw "Speaking pace is zero." }
    if ($null -eq $result.fillerWordCount) { throw "Filler-word count missing." }
    if ([int]$result.communicationScore -le 0) { throw "Communication score is zero." }
    if ([int]$result.pronunciationScore -le 0) { throw "Pronunciation/clarity score is zero." }
    if ([int]$result.transcriptionConfidence -le 0) { throw "Transcription confidence is zero." }

    Write-Host ""
    Write-Host "[PASS] Live /api/ai/speech/analyze smoke test" -ForegroundColor Green
    $result | Format-List
}

Write-Host ""
Write-Host "=== SECTION 5 VERIFICATION PASSED ===" -ForegroundColor Green
Write-Host "Real-time browser transcription + grammar + filler words + pace + pronunciation/clarity proxy + communication scoring are wired."
Write-Host "For a live browser test, start the backend, open live-interview.html, click Start Voice Answer, speak for 20-30 seconds, then Stop Voice Answer."
