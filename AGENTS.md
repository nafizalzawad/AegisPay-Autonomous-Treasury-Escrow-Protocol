# AGENTS.md — AegisPay Engineering Rules & Protocols

## 1. PRODUCT VISION & DEMO-CRITICAL PATH
AegisPay is an institutional-grade, autonomous on-chain smart treasury and milestone escrow wallet for cross-border SMEs and digital contractors. It decouples **Probabilistic AI Reasoning** (natural-language contract parsing and delivery webhook verification) from **Deterministic On-Chain Execution** (Solidity session-key spending limits, recipient whitelists, selector whitelists, and automated tax-reserve splitting).

### The Demo-Critical Path (Must Work 100% End-to-End Without Failure):
1. **Vault & Policy State:** The UI displays a deployed `AegisVault` smart account holding `MockUSDC`, governed by an active on-chain `SessionKeyPolicy` assigned to the AI Agent key (Max Per-Tx: 1,500 USDC, Max Daily: 3,000 USDC, Whitelisted Recipient: Contractor `0x...`, Allowed Targets: `MockUSDC` & `MilestoneEscrow`, Automated Tax Withholding: 15%).
2. **Natural-Language Intent to Escrow Creation:** The user enters a natural-language commercial agreement (e.g., *"Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve"*). The backend parses the intent into structured JSON, runs a pre-execution `eth_call` simulation, and locks 1,200 USDC into `MilestoneEscrow.sol`.
3. **Autonomous Perception & Settlement:** The user triggers a simulated GitHub CI/CD passing webhook. The AI Agent verifies the payload, computes a SHA-256 `attestationHash`, signs an execution transaction using its delegated Session Key, releases 1,020 USDC (85%) to the Contractor and routes 180 USDC (15%) to the Vault's Tax Reserve sub-account.
4. **Live Red-Team Adversarial Defense:** The user clicks from 3 Red-Team Attack scenarios (Prompt Injection $10,000 Drain, Unwhitelisted Hacker Address Transfer, Malicious Infinite `approve()` Call). Both the Off-Chain Pre-Execution Firewall and the On-Chain Solidity Contract (`AegisVault.sol`) deterministically reject/revert the attack, displaying the exact revert reason and zero balance loss.

## 2. PINNED TECH STACK & RATIONALE
Use boring, battle-tested tools that install cleanly and run deterministically offline or online:
- **Smart Contracts:** Foundry (`forge`, `anvil`, `cast`) + Solidity `0.8.24` + OpenZeppelin Contracts `v5.0.2` (or latest `5.x` via `forge install OpenZeppelin/openzeppelin-contracts` and adjust imports). Rationale: Foundry runs Solidity unit/fuzz tests 10x faster than Hardhat and includes `anvil` for instant zero-latency local chains.
- **Backend API & Agent Engine:** Python `3.11+`, FastAPI `0.115.0`, Uvicorn `0.30.6`, Pydantic `2.9.2`, Web3.py `6.20.3`, Pytest `8.3.3`, Httpx `0.27.2`, Python-dotenv `1.0.1` (or compatible minor versions in `requirements.txt`). Rationale: FastAPI gives automatic OpenAPI docs, strict Pydantic schema validation, and seamless Web3.py contract bindings.
- **LLM Integration:** OpenAI-compatible REST client via `httpx` (supports OpenAI / Gemini OpenAI-compatible endpoint) **PLUS a mandatory Deterministic Rule/Regex Intent Parser Fallback** enabled whenever `LLM_PROVIDER=deterministic` or when API calls fail/timeout (>4 seconds).
- **Frontend UI:** Node `20+`, Vite `5.4.x`, React `18.3.1`, TypeScript `5.5.x`, Tailwind CSS `3.4.x`, Lucide React `0.446.0`, Viem `2.21.x`. Rationale: Institutional desktop dashboard with zero heavy wallet-modal bloat.

## 3. MONOREPO DIRECTORY TREE
Maintain this exact directory structure. Do not scatter files outside these paths:
```text
aegispay/
├── AGENTS.md
├── README.md
├── Makefile
├── .env.example
├── .gitignore
├── shared/
│   ├── constants.json
│   └── deployments.local.json
├── contracts/
│   ├── foundry.toml
│   ├── src/
│   │   ├── MockUSDC.sol
│   │   ├── interfaces/
│   │   │   └── IAegisPolicy.sol
│   │   ├── AegisVault.sol
│   │   └── MilestoneEscrow.sol
│   ├── script/
│   │   └── DeployAndSeed.s.sol
│   └── test/
│       ├── AegisVault.t.sol
│       └── MilestoneEscrow.t.sol
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas.py
│   │   ├── blockchain.py
│   │   ├── agent_parser.py
│   │   ├── firewall.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── vault.py
│   │       ├── intent.py
│   │       ├── escrow.py
│   │       └── security.py
│   └── tests/
│       ├── __init__.py
│       └── test_api.py
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/
        │   └── api.ts
        ├── services/
        │   └── apiClient.ts
        └── components/
            ├── HeaderTelemetry.tsx
            ├── PolicyGuardrailCard.tsx
            ├── IntentTerminal.tsx
            ├── EscrowLifecyclePanel.tsx
            ├── FirewallInspectorModal.tsx
            ├── RedTeamArena.tsx
            └── AuditTrailFeed.tsx
```

## 4. CODING, LOGGING & ERROR-HANDLING STANDARDS
- **Solidity:** Use custom errors (e.g., `error SpendLimitExceeded(uint256 requested, uint256 available);`), never long `require` strings. Emit indexed events for every state transition (`PolicyUpdated`, `AgentExecutionSucceeded`, `AgentExecutionBlocked`, `EscrowCreated`, `EscrowSettled`). Follow Checks-Effects-Interactions (CEI) strictly.
- **Python:** Full type hints on every function. All request/response payloads defined in `backend/app/schemas.py` using Pydantic `BaseModel`. Every endpoint returns structured JSON; unhandled exceptions must be caught by a FastAPI exception handler returning `{"ok": false, "error_code": "...", "detail": "..."}` with appropriate HTTP status codes.
- **TypeScript/React:** Strict typing (`noImplicitAny`). Zero `any` types in `src/types/api.ts`. Every interactive button must show loading spinner state while awaiting response and render explicit success or error banners.
- **Honest Labeling:** Any simulated external trigger (such as the GitHub CI webhook simulator button or local Anvil chain mode) must be explicitly labeled in the UI (`[Simulated Webhook Trigger]` / `[Testnet / Anvil Sandbox — MockUSDC]`).

## 5. SECURITY RULES
- **Testnet & Local Sandbox Only:** Never connect to Ethereum Mainnet or use real private keys holding real assets. Only use standard Foundry Anvil deterministic test accounts or dedicated empty testnet keys loaded from `.env`.
- **Secret Hygiene:** Never commit `.env` files. Keep `.env` in `.gitignore` and maintain `.env.example` with safe defaults for local Anvil execution.
- **No Infinite Approvals:** Neither the backend nor the frontend may ever construct `IERC20.approve(spender, type(uint256).max)`. Approvals must match the exact escrow amount.

## 6. GIT CONVENTIONS
- Branch: `main` (or feature branches merged cleanly into `main`).
- Commit format: `feat(scope): concise description`, `test(scope): ...`, `fix(scope): ...`, `docs(scope): ...`.
- Commit at the end of every verified task within a phase after tests pass.

## 7. AGENT WORKING PROTOCOL (MANDATORY EVERY PHASE)
1. **Plan First:** Restate the phase goal and list every file you will create or modify.
2. **Implement Completely:** Write complete, production-grade files. Never write `// TODO`, `pass # implement later`, or truncated code in demo-critical files.
3. **Verify via Terminal:** Run the exact test commands (`forge test -vvv`, `pytest`, `npm run build`). Read the real terminal output. Fix any failure immediately. Never claim a test passed without executing it.
4. **Verify via Browser (when UI is touched):** Start the stack, open the browser in Antigravity, click through the user flows, and inspect console/network logs.
5. **Report & Handoff:** Conclude every phase with the mandatory **STATE HANDOFF** block containing deployed contract addresses, active ports, API routes, and test results.

## 8. UNIVERSAL DEFINITION OF DONE (DoD)
A phase is ONLY complete when:
- All files specified for the phase exist at their exact paths in the monorepo tree.
- All automated tests for the phase pass with 0 errors and real terminal output shown.
- The repo builds cleanly from root commands.
- Git working tree is clean with changes committed.
- The **STATE HANDOFF** block is printed at the end of your response.
