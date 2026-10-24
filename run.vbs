Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd /c """ & Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\")) & "run.bat""", 0, False
