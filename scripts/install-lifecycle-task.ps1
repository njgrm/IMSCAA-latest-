param([string]$TaskName='IMSCCA Lifecycle Worker')
$ErrorActionPreference='Stop'
$php='D:\XAMPP\php\php.exe'
$worker=(Resolve-Path (Join-Path $PSScriptRoot '..\src\my-app-server\lifecycle_worker.php')).Path
if(!(Test-Path $php)){throw "PHP executable not found at $php"}

$logDir='D:\XAMPP\tmp'
if(!(Test-Path $logDir)){throw "Log directory not found at $logDir"}
$log=Join-Path $logDir 'imscca-lifecycle-worker.log'

$trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
# Run as a service account so the worker keeps firing after logoff and reboot, and
# capture both the JSON summary and any stderr into one reviewable log.
$action=New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"`"$php`" `"$worker`" >> `"$log`" 2>&1`""
$principal=New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Updates IMSCCA requirement lifecycle and automatic absences.' -Force | Out-Null
Write-Output "Installed scheduled task: $TaskName (SYSTEM, repeats every minute, logs to $log)"
