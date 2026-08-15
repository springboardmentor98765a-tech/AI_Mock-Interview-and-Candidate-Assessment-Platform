# scripts/setup-postgres-task.ps1
# ONE-TIME SETUP — Run once as Administrator.
# Creates a Windows Task Scheduler task that can start the PostgreSQL service
# without requiring the user to be Administrator during daily use.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-postgres-task.ps1

$taskName  = 'HireAI-StartPostgres'
$pgService = 'postgresql-x64-18'

# Verify the PostgreSQL service actually exists on this machine
$svc = Get-Service -Name $pgService -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host "ERROR: Windows service '$pgService' not found." -ForegroundColor Red
    Write-Host "Available PostgreSQL services:" -ForegroundColor Yellow
    Get-Service | Where-Object { $_.ServiceName -like '*postgres*' } |
        Select-Object ServiceName, DisplayName, Status | Format-Table
    exit 1
}

Write-Host "Found service: $pgService ($($svc.DisplayName))" -ForegroundColor Cyan

# Remove old version of the task if it exists
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Create the task:
#   Action  : sc.exe start <pgService>
#   RunAs   : NT AUTHORITY\SYSTEM (no password needed, elevated by default)
#   Trigger : On-demand only (not scheduled)
$action    = New-ScheduledTaskAction `
    -Execute  'sc.exe' `
    -Argument "start $pgService"

$principal = New-ScheduledTaskPrincipal `
    -UserID    'NT AUTHORITY\SYSTEM' `
    -LogonType ServiceAccount `
    -RunLevel  Highest

$settings  = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
    -MultipleInstances  IgnoreNew

Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Principal $principal `
    -Settings  $settings `
    -Force | Out-Null

Write-Host ''
Write-Host "  Task '$taskName' created successfully." -ForegroundColor Green
Write-Host "  Daily use no longer requires Administrator." -ForegroundColor Green
Write-Host ''
Write-Host '  Test it now (should start PostgreSQL if stopped):' -ForegroundColor DarkGray
Write-Host "    Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host ''
