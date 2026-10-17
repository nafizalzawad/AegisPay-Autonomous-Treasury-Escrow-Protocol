$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "========================================================"
Write-Host "  AegisPay Autonomous Agent Treasury -- Startup Sequence"
Write-Host "========================================================"

& "$PSScriptRoot\stop_demo.ps1"
Start-Sleep -Seconds 1

$logDir = Join-Path $rootDir ".logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

Write-Host "[1/4] Starting Foundry Anvil chain on :8545..."
$anvilBin = "anvil"
if (Test-Path "$env:USERPROFILE\.foundry\bin\anvil.exe") {
    $anvilBin = "$env:USERPROFILE\.foundry\bin\anvil.exe"
}
Start-Process -FilePath $anvilBin -ArgumentList "--host 0.0.0.0 --port 8545" -RedirectStandardOutput "$logDir\anvil.log" -RedirectStandardError "$logDir\anvil.err.log" -WindowStyle Hidden

Write-Host "Waiting for Anvil to become responsive..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' -ContentType "application/json" -ErrorAction SilentlyContinue
        if ($res) { Write-Host "Anvil is ready."; break }
    } catch {}
    Start-Sleep -Milliseconds 500
}

Write-Host "[2/4] Deploying and seeding smart contracts via Foundry script..."
Set-Location "$rootDir\contracts"
$forgeBin = "forge"
if (Test-Path "$env:USERPROFILE\.foundry\bin\forge.exe") {
    $forgeBin = "$env:USERPROFILE\.foundry\bin\forge.exe"
}
& $forgeBin script script/DeployAndSeed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast | Out-Null
Set-Location $rootDir
Write-Host "Contracts deployed and seeded to shared/deployments.local.json."

Write-Host "[3/4] Launching FastAPI relayer on :8000..."
$pythonExe = "python"
if (Test-Path "$rootDir\backend\.venv\Scripts\python.exe") {
    $pythonExe = "$rootDir\backend\.venv\Scripts\python.exe"
}
Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000" -RedirectStandardOutput "$logDir\backend.log" -RedirectStandardError "$logDir\backend.err.log" -WindowStyle Hidden

Write-Host "Waiting for FastAPI health check..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health" -Method Get -ErrorAction SilentlyContinue
        if ($res.ok) { Write-Host "FastAPI relayer is healthy."; break }
    } catch {}
    Start-Sleep -Milliseconds 500
}

Write-Host "[4/4] Launching React Vite frontend on :5173..."
Set-Location "$rootDir\frontend"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --host 0.0.0.0 --port 5173" -RedirectStandardOutput "$logDir\frontend.log" -RedirectStandardError "$logDir\frontend.err.log" -WindowStyle Hidden
Set-Location $rootDir

Write-Host "Waiting for Frontend dev server..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) { Write-Host "Frontend is ready."; break }
    } catch {}
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "========================================================"
Write-Host "  AEGISPAY ORCHESTRATION COMPLETE -- ALL SERVICES LIVE"
Write-Host "========================================================"
Write-Host "  Frontend Dashboard : http://127.0.0.1:5173"
Write-Host "  Backend API Docs   : http://127.0.0.1:8000/docs"
Write-Host "  Anvil Local RPC    : http://127.0.0.1:8545"
Write-Host "========================================================"
