' Chay mot script trong thu muc nay ma khong hien cua so (tranh nhap nhay man hinh moi lan Task Scheduler chay).
'   wscript //B run_hidden.vbs run_check.cmd     -> cmd /c
'   wscript //B run_hidden.vbs run_report.ps1    -> powershell -File
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
If WScript.Arguments.Count < 1 Then WScript.Quit 1
target = WScript.Arguments(0)
If LCase(Right(target, 4)) = ".ps1" Then
  cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & dir & "\" & target & """"
Else
  cmd = "cmd /c """ & dir & "\" & target & """"
End If
' Cho tien trinh chay xong va tra ve dung ma thoat, de Task Scheduler biet ket qua that,
' va de "khong chay chong" cung gioi han thoi gian cua tac vu ap dung cho ca lan quet.
WScript.Quit CreateObject("WScript.Shell").Run(cmd, 0, True)
