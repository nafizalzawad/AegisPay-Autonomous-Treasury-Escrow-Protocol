.PHONY: all install test test-contracts test-backend chain deploy dev-backend dev-frontend build

all: install build test

install:
	@echo "Installing Smart Contracts dependencies..."
	cd contracts && forge install
	@echo "Installing Backend dependencies..."
	cd backend && python -m venv .venv && .venv/Scripts/python.exe -m pip install -r requirements.txt
	@echo "Installing Frontend dependencies..."
	cd frontend && npm install

test: test-contracts test-backend

test-contracts:
	@echo "Running Solidity Foundry Unit and Fuzz Tests..."
	cd contracts && forge test -vvv

test-backend:
	@echo "Running Python Backend Pytest Suite..."
	cd backend && .venv/Scripts/pytest.exe -v

chain:
	@echo "Starting Anvil Local Sandbox (31337)..."
	anvil --port 8545

deploy:
	@echo "Deploying and Seeding AegisPay protocol on Anvil..."
	cd contracts && forge script script/DeployAndSeed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

dev-backend:
	@echo "Starting FastAPI Backend Engine on http://localhost:8000..."
	cd backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	@echo "Starting React + Vite Institutional Dashboard on http://localhost:5173..."
	cd frontend && npm run dev

build:
	@echo "Building Smart Contracts..."
	cd contracts && forge build
	@echo "Building Frontend App..."
	cd frontend && npm run build
