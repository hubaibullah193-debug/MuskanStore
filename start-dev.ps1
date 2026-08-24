param($WorkDir)
$process = Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -command `\"Set-Location $WorkDir; while($true) { npm run dev } `"` -Wait -PassThru
# We just need to start; we can exit after starting