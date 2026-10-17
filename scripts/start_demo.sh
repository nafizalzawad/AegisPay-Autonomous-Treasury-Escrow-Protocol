#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "========================================================"
echo "  AegisPay Autonomous Agent Treasury -- Startup Sequence"
echo "========================================================"

# 1. Stop any stale processes
bash "$ROOT_DIR/scripts/stop_demo.sh" || true
sleep 1

LOG_DIR="${ROOT_DIR}/.logs"
mkdir -p "$LOG_DIR"

# 2. Start Anvil
echo "[1/4] Starting Foundry Anvil chain on :8545..."
anvil --host 0.0.0.0 --port 8545 > "${LOG_DIR}/anvil.log" 2>&1 &
ANVIL_PID=$!
echo $ANVIL_PID > "${LOG_DIR}/anvil.pid"

echo "Waiting for Anvil RPC to respond..."
for i in {1..30}; do
    if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' http://127.0.0.1:8545 >/dev/null 2>&1; then
        echo "Anvil is ready (PID: $ANVIL_PID)."
        break
    fi
    sleep 0.5
done

# 3. Deploy and seed smart contracts
echo "[2/4] Deploying and seeding smart contracts via Foundry script..."
cd "$ROOT_DIR/contracts"
forge script script/DeployAndSeed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast > "${LOG_DIR}/deploy.log" 2>&1
cd "$ROOT_DIR"
echo "Contracts deployed and seeded to shared/deployments.local.json."

# 4. Start FastAPI backend
echo "[3/4] Launching FastAPI relayer on :8000..."
PYTHON_CMD="python3"
if [ -f "$ROOT_DIR/backend/.venv/bin/python" ]; then
    PYTHON_CMD="$ROOT_DIR/backend/.venv/bin/python"
elif [ -f "$ROOT_DIR/backend/.venv/Scripts/python.exe" ]; then
    PYTHON_CMD="$ROOT_DIR/backend/.venv/Scripts/python.exe"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
fi

$PYTHON_CMD -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "${LOG_DIR}/backend.pid"

echo "Waiting for FastAPI health check..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/api/v1/health >/dev/null 2>&1; then
        echo "FastAPI relayer is healthy (PID: $BACKEND_PID)."
        break
    fi
    sleep 0.5
done

# 5. Start Frontend
echo "[4/4] Launching React Vite frontend on :5173..."
cd "$ROOT_DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 > "${LOG_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "${LOG_DIR}/frontend.pid"
cd "$ROOT_DIR"

echo "Waiting for Frontend dev server..."
for i in {1..30}; do
    if curl -s http://localhost:5173 >/dev/null 2>&1; then
        echo "Frontend is ready (PID: $FRONTEND_PID)."
        break
    fi
    sleep 0.5
done

echo ""
echo "========================================================"
echo "  AEGISPAY ORCHESTRATION COMPLETE -- ALL SERVICES LIVE"
echo "========================================================"
echo "  Frontend Dashboard : http://127.0.0.1:5173"
echo "  Backend API Docs   : http://127.0.0.1:8000/docs"
echo "  Anvil Local RPC    : http://127.0.0.1:8545"
echo "========================================================"
echo "Run 'make verify-all' to run the 10-checkpoint E2E test."
echo "Run 'make stop' to shutdown all processes."
echo "========================================================"
