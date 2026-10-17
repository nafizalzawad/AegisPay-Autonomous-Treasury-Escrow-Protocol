from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.config import settings
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


# Register API Route Handlers
app.include_router(vault.router, prefix="/api")
app.include_router(intent.router, prefix="/api")
app.include_router(escrow.router, prefix="/api")
app.include_router(security.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
