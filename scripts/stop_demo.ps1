Write-Host "Stopping AegisPay processes on ports 8545, 8000, 5173..."
$ports = @(8545, 8000, 5173)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "Stopped process $($c.OwningProcess) on port $port."
            }
        }
    } catch {}
}
Get-Process -Name "anvil", "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "AegisPay services stopped cleanly."
