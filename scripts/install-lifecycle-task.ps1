param([string]$TaskName='IMSCCA Lifecycle Worker')
$php='D:\XAMPP\php\php.exe';$worker=(Resolve-Path (Join-Path $PSScriptRoot '..\src\my-app-server\lifecycle_worker.php')).Path
if(!(Test-Path $php)){throw "PHP executable not found at $php"}
$action=New-ScheduledTaskAction -Execute $php -Argument ('"'+$worker+'"');$trigger=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Description 'Updates IMSCCA event lifecycle and automatic absences.' -Force
Write-Output "Installed scheduled task: $TaskName"
