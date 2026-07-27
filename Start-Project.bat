@echo off
REM Batch file to start the project (runs PowerShell script)
powershell.exe -ExecutionPolicy Bypass -File "%~dp0Start-Project.ps1" -WaitForServers
