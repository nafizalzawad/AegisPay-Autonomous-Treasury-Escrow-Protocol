#!/usr/bin/env bash
set -e

echo "Stopping AegisPay processes on ports 8545, 8000, 5173..."

# 1. Kill by port using lsof or fuser if available
for port in 8545 8000 5173; do
    if command -v lsof >/dev/null 2>&1; then
        pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "Killing process on port $port (PIDs: $pids)..."
            kill -9 $pids 2>/dev/null || true
        fi
    elif command -v fuser >/dev/null 2>&1; then
        fuser -k ${port}/tcp >/dev/null 2>&1 || true
    fi
done

# 2. Kill by process name pattern
pkill -f "anvil.*8545" 2>/dev/null || true
pkill -f "uvicorn.*8000" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# 3. Clean stored PID files
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -d "$ROOT_DIR/.logs" ]; then
    for pidfile in "$ROOT_DIR/.logs"/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile" 2>/dev/null || true)
            if [ -n "$pid" ]; then
                kill -9 "$pid" 2>/dev/null || true
            fi
            rm -f "$pidfile"
        fi
    done
fi

echo "AegisPay services stopped cleanly."
