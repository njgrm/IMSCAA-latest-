param([string]$Target='D:\XAMPP\htdocs\my-app-server',[switch]$WhatIf)
$ErrorActionPreference='Stop';$Source=Join-Path $PSScriptRoot '..\src\my-app-server';$Source=(Resolve-Path $Source).Path
$excluded='^(debug_|test_|simple_auto_test|run_sql_update|run_automatic_absences|update_attendance_schema|signout\.php$)'
$approved=Get-ChildItem -LiteralPath $Source -Filter '*.php' -File|Where-Object{$_.Name -notmatch $excluded}
if(!(Test-Path -LiteralPath $Target)){if($WhatIf){Write-Output "CREATE $Target"}else{New-Item -ItemType Directory -Path $Target|Out-Null}}
$approvedNames=@($approved.Name)
foreach($file in $approved){$dest=Join-Path $Target $file.Name;$different=!(Test-Path $dest) -or (Get-FileHash $file.FullName).Hash -ne (Get-FileHash $dest).Hash;if($different){Write-Output "COPY $($file.Name)";if(!$WhatIf){Copy-Item -LiteralPath $file.FullName -Destination $dest -Force}}}
Get-ChildItem -LiteralPath $Target -Filter '*.php' -File|Where-Object{$_.Name -notin $approvedNames}|ForEach-Object{Write-Output "REMOVE $($_.Name)";if(!$WhatIf){Remove-Item -LiteralPath $_.FullName -Force}}
Get-ChildItem -LiteralPath $Target -Filter '*.sql' -File|ForEach-Object{Write-Output "REMOVE $($_.Name)";if(!$WhatIf){Remove-Item -LiteralPath $_.FullName -Force}}
Write-Output "Backend deployment complete: $($approved.Count) approved PHP files."
