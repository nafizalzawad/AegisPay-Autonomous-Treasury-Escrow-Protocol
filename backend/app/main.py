from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
from app.blockchain import blockchain_service
from app.routes import vault, intent, escrow, security

app = FastAPI(
    title="AegisPay Autonomous Smart Treasury & Milestone Escrow API",
    description="Autonomous Agent Wallet decoupling probabilistic reasoning from deterministic on-chain execution.",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "ok": False,
            "error_code": "VALIDATION_ERROR",
            "detail": str(exc.errors()),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "ok": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "detail": str(exc),
        },
    )


@app.get("/")
async def root():
    return {
        "service": "AegisPay Smart Treasury Engine",
        "status": "online",
        "version": "1.0.0",
        "chainId": settings.CHAIN_ID,
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "rpc": settings.RPC_URL,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/v1/health")
async def health_v1():
    deps = settings.load_deployments()
    contracts = deps.get("contracts", {})
    vault_addr = contracts.get("AegisVault") or contracts.get("aegisVault") or ""
    connected = blockchain_service.is_connected()
    total_balance_usdc = 0.0
    escrow_count = 0
    if connected and vault_addr:
        try:
            state = blockchain_service.get_vault_state()
            total_balance_usdc = state.total_balance_usdc
            escrows = blockchain_service.list_escrows()
            escrow_count = len(escrows)
        except Exception:
            pass

    return {
        "ok": True,
        "chain_connected": connected,
        "chain_id": settings.CHAIN_ID,
        "vault_address": vault_addr,
        "total_balance_usdc": total_balance_usdc,
        "escrow_count": escrow_count,
        "llm_mode": settings.LLM_PROVIDER,
    }


# Register API Route Handlers under /api/v1 (primary) and /api (legacy)
app.include_router(vault.router, prefix="/api/v1")
app.include_router(escrow.router, prefix="/api/v1")
app.include_router(intent.router, prefix="/api/v1")
app.include_router(security.router, prefix="/api/v1")

app.include_router(vault.router, prefix="/api")
app.include_router(escrow.router, prefix="/api")
app.include_router(intent.router, prefix="/api")
app.include_router(security.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
