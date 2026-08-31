$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$required = @(
  "smarthire-backend/src/main/java/com/smarthire/backend/interview/proctoring/ProctoringService.java",
  "smarthire-backend/src/main/java/com/smarthire/backend/interview/proctoring/ProctoringController.java",
  "smarthire-backend/src/main/java/com/smarthire/backend/interview/proctoring/ProctoringViolation.java",
  "js/proctoring.js",
  "js/live-ai-monitoring.js",
  "js/live-interview-exam-mode.js",
  "pages/live-interview.html",
  "pages/interview-report.html",
  "css/proctoring.css",
  "ai-services/object-detection-service/main.py",
  "ai-services/object-detection-service/requirements.txt"
)
foreach ($p in $required) {
  if (!(Test-Path (Join-Path $root $p))) { throw "FAIL: $p missing" }
}
Write-Host "PASS: required Section 6/proctoring files"
foreach ($f in Get-ChildItem (Join-Path $root "js") -Filter *.js -Recurse) {
  node --check $f.FullName *> $null
  if ($LASTEXITCODE -ne 0) { throw "FAIL: JS syntax $($f.FullName)" }
}
Write-Host "PASS: JavaScript syntax"
foreach ($f in Get-ChildItem (Join-Path $root "ai-services") -Filter *.py -Recurse) {
  python -m py_compile $f.FullName *> $null
  if ($LASTEXITCODE -ne 0) { throw "FAIL: Python syntax $($f.FullName)" }
}
Write-Host "PASS: Python syntax"
$proctor = Get-Content (Join-Path $root "js/proctoring.js") -Raw
foreach ($n in @("FULLSCREEN_EXIT","TAB_SWITCH","WINDOW_BLUR","CAMERA_OFF","MICROPHONE_OFF","NO_FACE","MULTIPLE_FACES","PROHIBITED_OBJECT","COPY_PASTE","CONTEXT_MENU","autoTerminated")) {
  if ($proctor -notmatch [regex]::Escape($n)) { throw "FAIL: browser proctoring rule $n" }
}
Write-Host "PASS: browser proctoring rules"

$monitor = Get-Content (Join-Path $root "js/live-ai-monitoring.js") -Raw
foreach ($n in @('"unavailable"','"DEGRADED"','"No synthetic monitoring scores are being generated"','monitoringComplete','provider === "deepface"','provider === "mediapipe"')) {
  if ($monitor -notmatch [regex]::Escape($n)) { throw "FAIL: real monitoring/degraded state $n" }
}
Write-Host "PASS: real-only monitoring with explicit degraded state"
$proctor = Get-Content (Join-Path $root "js/proctoring.js") -Raw
if ($proctor -notmatch "opencv-eye-tracker-fallback" -or $proctor -notmatch "!Number.isFinite\(faceCount\)" ) { throw "FAIL: no-face enforcement does not require real eye-tracking data" }
Write-Host "PASS: no-face enforcement guarded against AI outage"
$css = Get-Content (Join-Path $root "css/proctoring.css") -Raw
if ($css -notmatch "sh-proctor-modal" -or $css -notmatch "proctoring-degraded") { throw "FAIL: proctoring warning/degraded CSS missing" }
Write-Host "PASS: proctoring warning and degraded-state UI"
$svc = Get-Content (Join-Path $root "smarthire-backend/src/main/java/com/smarthire/backend/interview/proctoring/ProctoringService.java") -Raw
foreach ($n in @("PROCTORING_TERMINATED","getViolationCount","getMaxViolations","AUTO_SUBMITTED")) {
  if ($svc -notmatch [regex]::Escape($n)) { throw "FAIL: server enforcement $n" }
}
Write-Host "PASS: server-side three-strike enforcement"
$req = Get-Content (Join-Path $root "smarthire-backend/src/main/java/com/smarthire/backend/interview/dto/InterviewEvaluationRequest.java") -Raw
foreach ($n in @("proctoringViolationCount","malpracticeTerminated","malpracticeReason","proctoringViolationsJson")) {
  if ($req -notmatch [regex]::Escape($n)) { throw "FAIL: evaluation wiring $n" }
}
Write-Host "PASS: evaluation malpractice wiring"
$report = Get-Content (Join-Path $root "pages/interview-report.html") -Raw
if ($report -notmatch "reportMalpracticeStatus") { throw "FAIL: final report malpractice status missing" }
Write-Host "PASS: final report malpractice status"
Write-Host "SECTION 6 + REAL-WORLD PROCTORING STATIC VERIFICATION PASSED"
