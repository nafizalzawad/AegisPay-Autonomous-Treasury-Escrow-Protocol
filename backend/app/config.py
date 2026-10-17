import os
import json
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# Base paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent
SHARED_DIR = ROOT_DIR / "shared"

# Load .env file from project root
ENV_FILE = ROOT_DIR / ".env"
load_dotenv(dotenv_path=ENV_FILE, override=True)


class Settings:
    # Chain & Node RPC
    RPC_URL: str = os.getenv("RPC_URL", "http://127.0.0.1:8545")
    CHAIN_ID: int = int(os.getenv("CHAIN_ID", "31337"))

    # Anvil Deterministic Keys
    OWNER_ADDRESS: str = os.getenv(
        "OWNER_ADDRESS", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    )
    OWNER_PRIVATE_KEY: str = os.getenv(
        "OWNER_PRIVATE_KEY",
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    )

    AGENT_ADDRESS: str = os.getenv(
        "AGENT_ADDRESS", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    )
    AGENT_PRIVATE_KEY: str = os.getenv(
        "AGENT_PRIVATE_KEY",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    )

    CONTRACTOR_ADDRESS: str = os.getenv(
        "CONTRACTOR_ADDRESS", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
    )
    CONTRACTOR_PRIVATE_KEY: str = os.getenv(
        "CONTRACTOR_PRIVATE_KEY",
        "0x5de4111afa1a4b93908f83103eb25d2b91de182d2a49e4537f8d7eb5ce647c52",
    )

    ATTACKER_ADDRESS: str = os.getenv(
        "ATTACKER_ADDRESS", "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
    )
    ATTACKER_PRIVATE_KEY: str = os.getenv(
        "ATTACKER_PRIVATE_KEY",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    )

    # Server settings
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # LLM & Reasoning Engine
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "deterministic")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-1.5-flash")

    # Shared file paths
    CONSTANTS_FILE: Path = SHARED_DIR / "constants.json"
    DEPLOYMENTS_FILE: Path = SHARED_DIR / "deployments.local.json"

    def load_constants(self) -> Dict[str, Any]:
        if self.CONSTANTS_FILE.exists():
            with open(self.CONSTANTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def load_deployments(self) -> Dict[str, Any]:
        if self.DEPLOYMENTS_FILE.exists():
            with open(self.DEPLOYMENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"contracts": {}, "accounts": {}}


settings = Settings()
