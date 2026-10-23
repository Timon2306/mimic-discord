$desktop = [System.Environment]::GetFolderPath('Desktop')
$targetExe = "C:\Users\alesa\Documents\antigravity\peaceful-salk\src-tauri\target\release\mimic.exe"
$workingDir = "C:\Users\alesa\Documents\antigravity\peaceful-salk\src-tauri\target\release"
$iconPath = "C:\Users\alesa\Documents\antigravity\peaceful-salk\src-tauri\icons\icon.ico"
$shortcutPath = Join-Path $desktop "mimic.lnk"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = $workingDir
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = "mimic - Discord Game Detection Booster"
$shortcut.Save()

Write-Output "Shortcut created at $shortcutPath"
