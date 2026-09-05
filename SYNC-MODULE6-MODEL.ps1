param(
  [string]$SourceModel = ""
)
$ErrorActionPreference = "Stop"
$target = Join-Path $PSScriptRoot "ai-services\emotion-cnn-service\model\emotion_cnn.keras"
if (-not $SourceModel) {
  $candidates = @(
    (Join-Path $PSScriptRoot "..\SmartHire-AI-MODULE6-CNN-IMPLEMENTED-2026-08-28\SmartHire-AI\ai-services\emotion-cnn-service\model\emotion_cnn.keras"),
    (Join-Path $env:USERPROFILE "OneDrive\Desktop\Documents\Downloads\SmartHire-AI-MODULE6-CNN-IMPLEMENTED-2026-08-28\SmartHire-AI\ai-services\emotion-cnn-service\model\emotion_cnn.keras"),
    (Join-Path $env:USERPROFILE "OneDrive\Desktop\Documents\Downloads\SmartHire-AI-MODULE6-FINAL-ROBUST-CNN-EYETRACKING-2026-08-30\SmartHireAI\ai-services\emotion-cnn-service\model\emotion_cnn.keras")
  )
  $SourceModel = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $SourceModel -or -not (Test-Path $SourceModel)) {
  throw "Trained emotion_cnn.keras not found. Pass -SourceModel <path>."
}
New-Item -ItemType Directory -Force (Split-Path $target) | Out-Null
Copy-Item -LiteralPath $SourceModel -Destination $target -Force
Write-Host "Copied trained CNN model to $target"
