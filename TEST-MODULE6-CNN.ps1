$ErrorActionPreference='Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$required = @(
  'ai-services/emotion-cnn-service/main.py',
  'ai-services/emotion-cnn-service/training/train.py',
  'ai-services/emotion-cnn-service/training/collect_dataset.py',
  'ai-services/emotion-cnn-service/training/split_dataset.py',
  'ai-services/emotion-cnn-service/requirements.txt',
  'ai-services/emotion-cnn-service/Dockerfile',
  'smarthire-backend/src/main/java/com/smarthire/backend/ai/emotion/CustomCnnEmotionProvider.java',
  'pages/live-interview.html',
  'js/live-ai-monitoring.js',
  'css/module6-monitoring.css'
)
foreach($p in $required){ if(!(Test-Path (Join-Path $root $p))){ throw "FAIL missing: $p" } }
$train = Get-Content (Join-Path $root 'ai-services/emotion-cnn-service/training/train.py') -Raw
foreach($token in @('Conv2D','ReLU','MaxPooling2D','Flatten','Dense','Softmax','Nervous','Scared','Confused','Rescaling')){
  if($train -notmatch [regex]::Escape($token)){ throw "FAIL missing CNN requirement: $token" }
}
$main = Get-Content (Join-Path $root 'ai-services/emotion-cnn-service/main.py') -Raw
foreach($token in @('haarcascade_frontalface_default.xml','cv2.resize','model.predict','Nervous','Scared','Confused','os.path.join(BASE_DIR, "model", "emotion_cnn.keras")')){
  if($main -notmatch [regex]::Escape($token)){ throw "FAIL missing inference step: $token" }
}
if($main -match 'astype\(np\.float32\) / 255\.0'){ throw 'FAIL CNN API still double-normalizes input.' }
$svc = Get-Content (Join-Path $root 'smarthire-backend/src/main/java/com/smarthire/backend/ai/emotion/CustomCnnEmotionProvider.java') -Raw
foreach($token in @('custom-cnn','/analyze')){
  if($svc -notmatch [regex]::Escape($token)){ throw "FAIL missing backend integration: $token" }
}
$props = Get-Content (Join-Path $root 'smarthire-backend/src/main/resources/application.properties') -Raw
foreach($token in @('ai.emotion-cnn.url','ai.emotion-cnn.enabled')){
  if($props -notmatch [regex]::Escape($token)){ throw "FAIL missing CNN configuration: $token" }
}
$html = Get-Content (Join-Path $root 'pages/live-interview.html') -Raw
foreach($token in @('module6-monitoring-card','module6Emotion','module6EyeContact','module6Attention','module6Engagement','module6Confidence')){
  if($html -notmatch [regex]::Escape($token)){ throw "FAIL missing Module 6 UI: $token" }
}
$monitor = Get-Content (Join-Path $root 'js/live-ai-monitoring.js') -Raw
foreach($token in @('/api/ai/emotion','/api/ai/eye-tracking','custom-cnn','mediapipe','smarthire.liveSignals')){
  if($monitor -notmatch [regex]::Escape($token)){ throw "FAIL missing monitoring integration: $token" }
}
Write-Host 'PASS Module 6 CNN files, preprocessing, backend bridge and live UI checks.'
Write-Host 'NOTE: Source validation passed. A real emotion_cnn.keras model is still required to run live CNN inference.'
