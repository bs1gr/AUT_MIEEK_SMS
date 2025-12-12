' ============================================================================
' Student Management System - Docker Toggle Script
' Quick Start/Stop for Desktop Shortcut
' ============================================================================
'
' This VBScript provides a silent, double-click experience to toggle the
' Docker container state. It automatically detects whether the container
' is running and performs the opposite action.
'
' Features:
' - Silent execution (no console window)
' - Automatic state detection
' - Runs PowerShell with appropriate privileges
' - Error handling with user notifications
' ============================================================================

Option Explicit

Dim objShell, objFSO, scriptDir, dockerScript
Dim result, errorMsg

' Get script directory
Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("WScript.Shell")
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
dockerScript = objFSO.BuildPath(scriptDir, "DOCKER.ps1")

' Check if DOCKER.ps1 exists
If Not objFSO.FileExists(dockerScript) Then
    MsgBox "Cannot find DOCKER.ps1 in:" & vbCrLf & scriptDir & vbCrLf & vbCrLf & _
           "Please reinstall the application.", vbCritical, "SMS Docker Toggle"
    WScript.Quit 1
End If

' Check current container status and toggle
On Error Resume Next
result = objShell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""docker ps --filter 'name=sms-fullstack' --format '{{.Names}}' 2>$null""", 0, True)

If Err.Number <> 0 Then
    errorMsg = "Docker check failed:" & vbCrLf & Err.Description
    MsgBox errorMsg, vbExclamation, "SMS Docker Toggle"
    Err.Clear
    WScript.Quit 1
End If

' Toggle: If container running (result 0), stop it. Otherwise start it.
If result = 0 Then
    ' Container is running - stop it
    result = objShell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & dockerScript & """ -Stop", 0, False)
Else
    ' Container is not running - start it
    result = objShell.Run("powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & dockerScript & """ -Start", 0, False)
End If

' Check for errors
If Err.Number <> 0 Then
    errorMsg = "Docker toggle failed:" & vbCrLf & Err.Description
    MsgBox errorMsg, vbExclamation, "SMS Docker Toggle"
    Err.Clear
    WScript.Quit 1
End If

WScript.Quit 0
