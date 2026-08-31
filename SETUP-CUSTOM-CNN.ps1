$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$svc=Join-Path $root 'ai-services\emotion-cnn-service'
$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py -3.13' } elseif (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { throw 'Python 3.13 is not installed/on PATH.' }
Write-Host 'SmartHire Custom CNN setup'
Write-Host 'Required classes: Nervous, Scared, Confused'
Write-Host "Python launcher: $python"
cmd /c "$python --version"
cmd /c "$python -m pip install -r `"$svc\requirements.txt`""
Write-Host ''
Write-Host 'Collect genuinely labelled, consented images with:'
Write-Host '  py -3.13 training\collect_dataset.py --class-name Nervous --count 300'
Write-Host '  py -3.13 training\collect_dataset.py --class-name Scared --count 300'
Write-Host '  py -3.13 training\collect_dataset.py --class-name Confused --count 300'
Write-Host 'Split:'
Write-Host '  py -3.13 training\split_dataset.py --raw raw-data --out dataset'
Write-Host 'Train:'
Write-Host '  py -3.13 training\train.py --data dataset --output model\emotion_cnn.keras --epochs 25'
Write-Host 'Sync an existing trained model into this build:'
Write-Host '  .\SYNC-MODULE6-MODEL.ps1 -SourceModel "C:\path\to\emotion_cnn.keras"'
Write-Host 'Start CNN service:'
Write-Host '  py -3.13 -m uvicorn main:app --host 0.0.0.0 --port 8095'
