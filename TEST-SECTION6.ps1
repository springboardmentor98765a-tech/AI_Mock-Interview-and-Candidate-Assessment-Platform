$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$required = @(
  "smarthire-backend/src/main/java/com/smarthire/backend/ai/emotion/DeepFaceEmotionProvider.java",
  "smarthire-backend/src/main/java/com/smarthire/backend/ai/eye/MediaPipeEyeTrackingProvider.java",
  "js/live-ai-monitoring.js",
  "js/script.js",
  "pages/live-interview.html",
  "pages/interview-report.html"
)
foreach($p in $required){if(!(Test-Path (Join-Path $root $p))){throw "FAIL: $p missing"}; Write-Host "PASS: $p"}
foreach($f in Get-ChildItem (Join-Path $root "js") -Filter *.js -Recurse){node --check $f.FullName *> $null;if($LASTEXITCODE -ne 0){throw "FAIL: JS syntax $($f.Name)"}}
Write-Host "PASS: JavaScript syntax"
$live = Get-Content (Join-Path $root "js/live-ai-monitoring.js") -Raw
if ($live -notmatch "Promise\.allSettled") { throw "FAIL: monitoring requests are not provider-independent; one AI outage can hide valid results." }
Write-Host "PASS: Provider-independent Module 6 monitoring"
$live=Get-Content (Join-Path $root "js/live-ai-monitoring.js") -Raw
foreach($n in @("averageEyeContactPercentage","averageEmotionConfidence","realEmotionSamples","realEyeTrackingSamples","history")){if($live -notmatch [regex]::Escape($n)){throw "FAIL: missing $n"}}
Write-Host "PASS: Monitoring aggregation"
$svc=Get-Content (Join-Path $root "smarthire-backend/src/main/java/com/smarthire/backend/interview/service/InterviewService.java") -Raw
foreach($n in @("averageEyeContactPercentage","averageEmotionConfidence","setConfidenceScore","setOverallScore")){if($svc -notmatch [regex]::Escape($n)){throw "FAIL: evaluation wiring missing $n"}}
Write-Host "PASS: Final evaluation wiring"
$rep=Get-Content (Join-Path $root "pages/interview-report.html") -Raw
if($rep -notmatch "reportLiveMonitoringStatus"){throw "FAIL: report monitoring evidence missing"}
Write-Host "PASS: Monitoring evidence report"
Write-Host "SECTION 6 STATIC VERIFICATION PASSED"
