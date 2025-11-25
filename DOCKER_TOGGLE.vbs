' ============================================================================
' SMS Docker Toggle - Standalone VBS Script
' Direct Docker CLI control - No PowerShell dependency
' Universal Windows compatibility with robust error handling
' ============================================================================

Option Explicit

Dim objShell, objFSO, scriptDir
Dim containerName, result, isRunning, statusOutput
Dim smsUrl, objExec, errorMsg

' Initialize
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
scriptDir = objFSO.GetParentFolderName(WScript.ScriptFullName)
containerName = "sms-app"
smsUrl = "http://localhost:8082"

' ============================================================================
' ERROR HANDLING - Log Function
' ============================================================================
Sub LogError(msg)
    Dim logFile, logPath, timestamp
    On Error Resume Next
    logPath = scriptDir & "\logs\docker_toggle_vbs.log"
    
    ' Ensure logs directory exists
    If Not objFSO.FolderExists(scriptDir & "\logs") Then
        objFSO.CreateFolder(scriptDir & "\logs")
    End If
    
    Set logFile = objFSO.OpenTextFile(logPath, 8, True)
    timestamp = Now()
    logFile.WriteLine timestamp & " - " & msg
    logFile.Close
    On Error GoTo 0
End Sub

' ============================================================================
' Check Prerequisites
' ============================================================================
LogError "========== Toggle Started =========="

' ============================================================================
' Check Docker Availability
' ============================================================================
LogError "Checking Docker availability..."

On Error Resume Next
result = objShell.Run("cmd /c docker ps >nul 2>&1", 0, True)
If Err.Number <> 0 Then
    errorMsg = "ERROR: Docker Command Failed" & vbCrLf & vbCrLf & _
               "Cannot execute Docker commands." & vbCrLf & vbCrLf & _
               "Please ensure:" & vbCrLf & _
               "  - Docker Desktop is installed" & vbCrLf & _
               "  - Docker Desktop is running" & vbCrLf & _
               "  - Docker is in your system PATH" & vbCrLf & vbCrLf & _
               "-----------------------------" & vbCrLf & _
               "Closing in 10 seconds..."
    LogError "ERROR: Cannot execute docker command - " & Err.Description
    objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
    WScript.Quit 1
End If
On Error GoTo 0

If result <> 0 Then
    ' Docker daemon not running - try to start Docker Desktop
    LogError "Docker daemon not running - attempting to start Docker Desktop..."
    
    message = "Docker Desktop is not running." & vbCrLf & vbCrLf & _
              "Starting Docker Desktop..." & vbCrLf & vbCrLf & _
              "This may take 30-60 seconds."
    objShell.Popup message, 3, "SMS Toggle - Starting Docker", vbInformation
    
    ' Try to start Docker Desktop
    On Error Resume Next
    objShell.Run "cmd /c start """" ""C:\Program Files\Docker\Docker\Docker Desktop.exe""", 0, False
    If Err.Number <> 0 Then
        LogError "Failed to start Docker Desktop - " & Err.Description
        errorMsg = "ERROR: Could Not Start Docker Desktop" & vbCrLf & vbCrLf & _
                   "Please start Docker Desktop manually." & vbCrLf & vbCrLf & _
                   "-----------------------------" & vbCrLf & _
                   "Closing in 10 seconds..."
        objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
        WScript.Quit 1
    End If
    On Error GoTo 0
    
    LogError "Docker Desktop launch command sent, waiting for daemon to start..."
    
    ' Wait for Docker daemon to start (check every 5 seconds for up to 60 seconds)
    Dim maxWait, waitInterval, totalWaited
    maxWait = 60
    waitInterval = 5
    totalWaited = 0
    
    Do While totalWaited < maxWait
        WScript.Sleep waitInterval * 1000
        totalWaited = totalWaited + waitInterval
        
        ' Check if Docker is now available
        On Error Resume Next
        result = objShell.Run("cmd /c docker ps >nul 2>&1", 0, True)
        On Error GoTo 0
        
        If result = 0 Then
            LogError "Docker Desktop started successfully after " & totalWaited & " seconds"
            Exit Do
        End If
        
        LogError "Waiting for Docker... (" & totalWaited & "s elapsed)"
    Loop
    
    ' Final check
    If result <> 0 Then
        errorMsg = "ERROR: Docker Desktop Timeout" & vbCrLf & vbCrLf & _
                   "Docker Desktop did not start within 60 seconds." & vbCrLf & vbCrLf & _
                   "Please:" & vbCrLf & _
                   "  - Check if Docker Desktop opened" & vbCrLf & _
                   "  - Wait for it to fully start" & vbCrLf & _
                   "  - Try the shortcut again" & vbCrLf & vbCrLf & _
                   "-----------------------------" & vbCrLf & _
                   "Closing in 10 seconds..."
        LogError "ERROR: Docker daemon still not available after " & maxWait & " seconds"
        objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
        WScript.Quit 1
    End If
End If

LogError "Docker is available and running"

' ============================================================================
' Check Container Status
' ============================================================================
LogError "Checking container status..."

On Error Resume Next
Set objExec = objShell.Exec("cmd /c docker ps --filter ""name=^" & containerName & "$"" --format ""{{.Status}}""")

' Wait for command to complete with timeout
Dim timeout, waitTime
timeout = 5
waitTime = 0
Do While objExec.Status = 0 And waitTime < timeout
    WScript.Sleep 100
    waitTime = waitTime + 0.1
Loop

If Err.Number <> 0 Then
    errorMsg = "ERROR: Failed to Check Container Status" & vbCrLf & vbCrLf & _
               "Error: " & Err.Description & vbCrLf & vbCrLf & _
               "-----------------------------" & vbCrLf & _
               "Closing in 10 seconds..."
    LogError "ERROR: Failed to check status - " & Err.Description
    objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
    WScript.Quit 1
End If

statusOutput = objExec.StdOut.ReadAll()
On Error GoTo 0

isRunning = (InStr(statusOutput, "Up") > 0)
LogError "Container status - Running: " & isRunning

' ============================================================================
' Toggle: Stop if Running, Start if Stopped
' ============================================================================
Dim action, dockerStopCmd, dockerStartCmd, message, title, popupResult

If isRunning Then
    ' ========================================================================
    ' STOP: Container is running - Ask for confirmation then STOP
    ' ========================================================================
    LogError "Container is running - preparing to stop"
    
    action = "stop"
    title = "SMS Toggle"
    message = "WARNING: SMS is Currently Running" & vbCrLf & vbCrLf & _
              "Do you want to STOP the application?" & vbCrLf & vbCrLf & _
              "This will:" & vbCrLf & _
              "  - Close all SMS connections" & vbCrLf & _
              "  - Stop the Docker container" & vbCrLf & _
              "  - Make SMS inaccessible"
    
    ' Ask for confirmation (Yes/No)
    popupResult = MsgBox(message, vbQuestion + vbYesNo + vbDefaultButton2, title)
    
    If popupResult = vbNo Then
        LogError "User cancelled stop operation"
        WScript.Quit 0
    End If
    
    ' Show stopping message (auto-closes after 2 seconds)
    title = "SMS Toggle"
    message = "Stopping SMS Application..." & vbCrLf & vbCrLf & _
              "Please wait a few seconds..."
    objShell.Popup message, 2, title, vbInformation
    
    LogError "Executing stop command..."
    
    ' Execute docker stop command directly (avoids PowerShell nesting issues)
    dockerStopCmd = "cmd /c docker stop " & containerName & " >nul 2>&1"
    
    On Error Resume Next
    result = objShell.Run(dockerStopCmd, 0, True)
    If Err.Number <> 0 Then
        errorMsg = "ERROR: Stop Command Failed" & vbCrLf & vbCrLf & _
                   "Error: " & Err.Description & vbCrLf & vbCrLf & _
                   "-----------------------------" & vbCrLf & _
                   "Closing in 10 seconds..."
        LogError "ERROR: Stop command failed - " & Err.Description
        objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
        WScript.Quit 1
    End If
    On Error GoTo 0
    
    LogError "Docker stop command executed, waiting for container shutdown..."
    
    ' Wait to ensure container is stopped (increased to 10 seconds for graceful shutdown)
    WScript.Sleep 10000
    
    ' Verify container actually stopped by checking status again
    On Error Resume Next
    Set objExec = objShell.Exec("cmd /c docker ps --filter ""name=^" & containerName & "$"" --format ""{{.Status}}""")
    waitTime = 0
    Do While objExec.Status = 0 And waitTime < 5
        WScript.Sleep 100
        waitTime = waitTime + 0.1
    Loop
    statusOutput = objExec.StdOut.ReadAll()
    On Error GoTo 0
    
    Dim actuallyRunning
    actuallyRunning = (InStr(statusOutput, "Up") > 0)
    
    If Not actuallyRunning Then
        ' Container is actually stopped - success!
        LogError "Stop command completed successfully (verified container stopped)"
        
        ' Success message (auto-closes after 4 seconds)
        message = "SUCCESS: SMS Stopped" & vbCrLf & vbCrLf & _
                  "Application is no longer running." & vbCrLf & vbCrLf & _
                  "Double-click the shortcut to restart." & vbCrLf & vbCrLf & _
                  "-----------------------------" & vbCrLf & _
                  "Closing in 4 seconds..."
        
        objShell.Popup message, 4, "SMS Toggle", vbInformation
        LogError "========== Toggle Completed (Stop) =========="
        result = 0
    Else
        ' Container still running - actual failure
        LogError "ERROR: Stop failed - container still running after command"
        errorMsg = "ERROR: Failed to Stop SMS" & vbCrLf & vbCrLf & _
                   "Container is still running." & vbCrLf & vbCrLf & _
                   "Check logs for details:" & vbCrLf & _
                   scriptDir & "\logs\docker_toggle_vbs.log" & vbCrLf & vbCrLf & _
                   "-----------------------------" & vbCrLf & _
                   "Closing in 10 seconds..."
        objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
        result = 1
    End If
    
Else
    ' ========================================================================
    ' START: Container is stopped - START IT
    ' ========================================================================
    LogError "Container is stopped - preparing to start"
    
    action = "start"
    title = "SMS Toggle"
    message = "Starting SMS Application..." & vbCrLf & vbCrLf & _
              "This may take 10-30 seconds." & vbCrLf & _
              "Browser will open automatically."
    
    ' Show starting message (auto-closes after 3 seconds)
    objShell.Popup message, 3, title, vbInformation
    
    LogError "Executing start command..."
    
    ' Execute docker start command directly (avoids PowerShell nesting issues)
    dockerStartCmd = "cmd /c docker start " & containerName & " >nul 2>&1"
    
    On Error Resume Next
    result = objShell.Run(dockerStartCmd, 0, True)
    If Err.Number <> 0 Then
        errorMsg = "ERROR: Start Command Failed" & vbCrLf & vbCrLf & _
                   "Error: " & Err.Description & vbCrLf & vbCrLf & _
                   "-----------------------------" & vbCrLf & _
                   "Closing in 10 seconds..."
        LogError "ERROR: Start command failed - " & Err.Description
        objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
        WScript.Quit 1
    End If
    On Error GoTo 0
    
    LogError "Docker start command executed, waiting for container to be healthy..."
    
    ' Wait for application to start and be healthy (Docker health checks take time)
    WScript.Sleep 15000
    
    ' Verify container actually started by checking status again
    On Error Resume Next
    Set objExec = objShell.Exec("cmd /c docker ps --filter ""name=^" & containerName & "$"" --format ""{{.Status}}""")
    waitTime = 0
    Do While objExec.Status = 0 And waitTime < 5
        WScript.Sleep 100
        waitTime = waitTime + 0.1
    Loop
    statusOutput = objExec.StdOut.ReadAll()
    On Error GoTo 0
    
    actuallyRunning = (InStr(statusOutput, "Up") > 0)
    
    If actuallyRunning Then
        ' Container is actually running - success!
        LogError "Start command completed successfully (verified container running)"
        
        ' Open browser automatically
        LogError "Opening browser to: " & smsUrl
        On Error Resume Next
        objShell.Run "cmd /c start " & smsUrl, 0, False
        If Err.Number <> 0 Then
            LogError "WARNING: Failed to open browser - " & Err.Description
        End If
        On Error GoTo 0
        
        ' Success message (auto-closes after 4 seconds)
        message = "SUCCESS: SMS Started" & vbCrLf & vbCrLf & _
                  "Opening browser to:" & vbCrLf & _
                  "    " & smsUrl & vbCrLf & vbCrLf & _
                  "Double-click the shortcut to stop." & vbCrLf & vbCrLf & _
                  "-----------------------------" & vbCrLf & _
                  "Closing in 4 seconds..."
        
        objShell.Popup message, 4, "SMS Toggle", vbInformation
        LogError "========== Toggle Completed (Start) =========="
        result = 0
    Else
        ' Container not running - actual failure
        LogError "ERROR: Start failed - container not running after command"
        errorMsg = "ERROR: Failed to Start SMS" & vbCrLf & vbCrLf & _
                   "Container did not start." & vbCrLf & vbCrLf & _
                   "Please ensure:" & vbCrLf & _
                   "  - Docker Desktop is running" & vbCrLf & _
                   "  - No port conflicts exist" & vbCrLf & vbCrLf & _
                   "Check logs:" & vbCrLf & _
                   scriptDir & "\logs\docker_toggle_vbs.log" & vbCrLf & vbCrLf & _
                   "-----------------------------" & vbCrLf & _
                   "Closing in 10 seconds..."
        objShell.Popup errorMsg, 10, "SMS Toggle - Error", vbCritical
        result = 1
    End If
End If

WScript.Quit result
