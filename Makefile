.PHONY: install test-contracts test-backend build-frontend verify-all demo reset stop

install:
	cd contracts && forge build
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

test-contracts:
	cd contracts && forge test -vvv

test-backend:
	cd backend && pytest -v

build-frontend:
	cd frontend && npm run build

verify-all: test-contracts test-backend build-frontend
	python3 scripts/e2e_verify.py || python scripts/e2e_verify.py

demo:
	bash scripts/start_demo.sh

reset:
	curl -s -X POST http://127.0.0.1:8000/api/v1/vault/reset-demo | python3 -m json.tool || python -m json.tool

stop:
	bash scripts/stop_demo.sh
