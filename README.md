# AegisPay — Autonomous On-Chain Smart Treasury & Milestone Escrow

> **Submission for the 2026 Shenzhen International FinTech Competition (Tsinghua University PBCSF & WeBank)**  
> **Topic F: Agent Wallet (Autonomous On-Chain Wallet)**

---

## 1. Executive Summary & Vision
Cross-border SMEs and digital enterprises are rapidly adopting autonomous AI agents to manage commercial operations, contractor disbursements, and vendor settlements. However, granting an LLM direct access to an unrestricted cryptographic private key introduces existential catastrophic risks: prompt injection drains, infinite token approval exploits, hallucinated recipients, and tax compliance failures.

**AegisPay solves this by strictly decoupling:**
1. **Probabilistic AI Reasoning** (natural-language agreement parsing, counterparty resolution, GitHub CI/CD delivery webhook verification).
2. **Deterministic On-Chain Execution** (Solidity session-key spending limits, recipient allowlists, target contract allowlists, selector whitelists, and automated 15% tax-reserve withholding).

Even if the AI agent's reasoning is completely hijacked by an adversarial prompt injection, **the Solidity smart account (`AegisVault.sol`) and off-chain pre-execution firewall deterministically reject the transaction, guaranteeing zero asset loss.**

---

## 2. The 4 Demo-Critical Pathways

```
                                  +-------------------------------------------------------------+
                                  |                 AI AGENT REASONING ENGINE                   |
                                  |  - Natural-Language Intent Parser (Gemini / Deterministic)  |
                                  |  - Autonomous Perception: GitHub CI/CD Attestation Proof    |
                                  +------------------------------+------------------------------+
                                                                 |
                                                  Pre-Execution Firewall (FW-01 to FW-06)
                                                                 |
                                                                 v
+-------------------------------------------------------------------------------------------------------------------------------+
|                                            DETERMINISTIC ON-CHAIN SOLIDITY LAYER                                              |
|                                                                                                                               |
|   +-----------------------------------+               +-----------------------------------+                                   |
|   |         AegisVault.sol            |               |        MilestoneEscrow.sol        |                                   |
|   |  - Delegated Session Key Policy   |  Agent Call   |  - Locked Principal (e.g. 1,200)  |   Settlement Verification     |
|   |  - Max Per-Tx: 1,500 USDC         +-------------->+  - Proof Attestation Check        +--------------> Contractor (85%)   |
|   |  - Max Daily: 3,000 USDC          |               |  - Automated 15% Tax Split        +--------------> Tax Reserve (15%)  |
|   |  - Recipient & Target Whitelists  |               +-----------------------------------+                                   |
|   |  - Zero Infinite Approvals        |                                                                                       |
|   +-----------------+-----------------+                                                                                       |
|                     ^                                                                                                         |
|                     | Tax Withheld (180 USDC)                                                                                 |
|                     +---------------------------------------------------------------------------------------------------------+
|                                           Tax Reserve Vault Sub-Account                                                       |
+-------------------------------------------------------------------------------------------------------------------------------+
```

### 1. Vault & Policy Guardrail State
- An institutional treasury account (`AegisVault.sol`) holding `MockUSDC`.
- Session key assigned to the AI Agent with strict parameters:
  - **Max Per-Transaction:** 1,500.00 USDC
  - **Max Rolling 24h Daily Budget:** 3,000.00 USDC
  - **Whitelisted Recipient:** Verified Contractor (`DevStudio` at `0x3C44...93BC`)
  - **Whitelisted Targets:** `MockUSDC` and `MilestoneEscrow`
  - **Automated Tax Withholding:** 15.00% routed to dedicated sub-account

### 2. Natural-Language Intent to Escrow Creation
- User submits commercial agreement:
  > *"Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI suite passes; withhold 15% for tax reserve"*
- Backend parses intent into structured JSON with zero latency.
- Runs off-chain firewall checks and pre-execution `eth_call` simulation.
- Signs execution via delegated Session Key and locks 1,200 USDC in `MilestoneEscrow.sol`.

### 3. Autonomous Perception & Settlement Trigger
- External GitHub Actions workflow completes successfully (`workflow_run.completed`).
- AI Agent verifies the webhook payload, computes delivery attestation hash `keccak256(...)`.
- Signs execution transaction via Session Key calling `settleEscrow`.
- Deterministic contract execution:
  - **Contractor Payout (85%):** 1,020.00 USDC sent to DevStudio.
  - **Tax Reserve Withholding (15%):** 180.00 USDC routed to Vault Tax Reserve.
  - Escrow state transitions to `Settled`.

### 4. Live Red-Team Adversarial Defense Arena
The dashboard includes 3 one-click Red-Team attack scenarios:
1. **Prompt Injection $10,000 Treasury Drain:** Reverts on-chain (`SpendLimitExceeded`).
2. **Unwhitelisted Hacker Address Transfer:** Reverts on-chain (`RecipientNotWhitelisted`).
3. **Malicious Infinite `approve()` Call:** Reverts on-chain (`InfiniteApprovalForbidden`).
- **Telemetry Verdict:** 0.00 USDC balance loss across all attack vectors.

---

## 3. Technology Stack

| Layer | Technologies & Rationale |
|---|---|
| **Smart Contracts** | Foundry (`forge`, `anvil`, `cast`), Solidity `0.8.24`, OpenZeppelin Contracts `v5.7.0` |
| **Backend API** | Python `3.11+`, FastAPI, Uvicorn, Pydantic v2, Web3.py, Pytest, Httpx |
| **Reasoning Engine** | OpenAI / Gemini OpenAI-compatible REST + Mandatory Offline Deterministic Regex Parser |
| **Frontend UI** | Node 20+, Vite 5.4, React 18.3, TypeScript 5.5, Tailwind CSS 3.4, Lucide React |

---

## 4. Monorepo Structure

```text
aegispay/
├── AGENTS.md                          # Engineering protocols and competition rules
├── README.md                          # Architecture and demo documentation
├── Makefile                           # Unified developer workflows
├── .env.example                       # Deterministic local sandbox keys
├── shared/
│   ├── constants.json                 # Shared policy parameters and attack presets
│   └── deployments.local.json         # Deployed contract manifest
├── contracts/
│   ├── foundry.toml                   # Solidity 0.8.24 configuration
│   ├── src/
│   │   ├── MockUSDC.sol               # 6-decimal USDC mock with sandbox faucet
│   │   ├── interfaces/IAegisPolicy.sol # Custom errors, events, and policy structs
│   │   ├── AegisVault.sol             # Smart treasury with session key guardrails
│   │   └── MilestoneEscrow.sol        # Milestone escrow with attestation & tax split
│   ├── script/DeployAndSeed.s.sol     # Automated deployment and seeding script
│   └── test/
│       ├── AegisVault.t.sol           # 12 unit and fuzz test suites (100% pass)
│       └── MilestoneEscrow.t.sol      # 5 lifecycle and autonomous settlement tests
├── backend/
│   ├── requirements.txt               # Pinned Python dependencies
│   ├── app/
│   │   ├── main.py                    # FastAPI application and CORS middleware
│   │   ├── config.py                  # Environment and contract address bindings
│   │   ├── schemas.py                 # Strict Pydantic models (0 any types)
│   │   ├── blockchain.py              # Web3.py contract interfaces and audit logging
│   │   ├── agent_parser.py            # Natural language intent parsing engine
│   │   ├── firewall.py                # Pre-Execution Off-Chain Firewall
│   │   └── routes/                    # vault, intent, escrow, security endpoints
│   └── tests/test_api.py              # 8 Pytest integration suites (100% pass)
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx                    # Institutional dark-mode dashboard
        ├── components/
        │   ├── HeaderTelemetry.tsx    # Live treasury balance and faucet
        │   ├── PolicyGuardrailCard.tsx# Spending velocity and whitelist cards
        │   ├── IntentTerminal.tsx     # Natural-language agreement input & simulation
        │   ├── EscrowLifecyclePanel.tsx # Autonomous perception & CI/CD trigger
        │   ├── FirewallInspectorModal.tsx # Dual-layer rule visualizer
        │   ├── RedTeamArena.tsx       # Live adversarial defense arena
        │   └── AuditTrailFeed.tsx     # Real-time event ledger
        ├── services/apiClient.ts      # Typed REST client
        └── types/api.ts               # Strict TypeScript models
```

---

## 5. Verification & Test Suite Output

### Smart Contracts (Foundry)
```bash
$ forge test -vvv
Ran 2 test suites: 17 passed, 0 failed, 0 skipped (17 total tests)
[PASS] test_OwnerExecution_Success() (gas: 87291)
[PASS] test_AgentExecution_ValidTransfer_Success() (gas: 136682)
[PASS] test_AgentExecution_SpendLimitExceeded_Reverts() (gas: 80242)
[PASS] test_AgentExecution_DailyLimitExceeded_Reverts() (gas: 267383)
[PASS] test_AgentExecution_DailyReset_Success() (gas: 308994)
[PASS] test_AgentExecution_UnwhitelistedRecipient_Reverts() (gas: 68255)
[PASS] test_AgentExecution_UnwhitelistedTarget_Reverts() (gas: 55789)
[PASS] test_AgentExecution_UnwhitelistedSelector_Reverts() (gas: 57735)
[PASS] test_AgentExecution_InfiniteApproval_Reverts() (gas: 66379)
[PASS] test_AgentExecution_UnauthorizedCaller_Reverts() (gas: 48768)
[PASS] test_AgentExecution_PolicyExpired_Reverts() (gas: 53013)
[PASS] testFuzz_SpendLimit(uint256) (runs: 256, μ: 64581)
[PASS] test_CreateEscrow_Success() (gas: 464081)
[PASS] test_SettleEscrow_AttestationMatch_Success() (gas: 611380)
[PASS] test_SettleEscrow_InvalidAttestation_Reverts() (gas: 455028)
[PASS] test_RefundEscrow_AfterDeadline_Success() (gas: 542069)
[PASS] test_EndToEndAutonomousAgentSettlement() (gas: 700455)
```

### Backend (Pytest)
```bash
$ pytest -v
tests/test_api.py::test_root_and_health PASSED
tests/test_api.py::test_vault_status PASSED
tests/test_api.py::test_intent_parse_deterministic PASSED
tests/test_api.py::test_intent_simulation_valid PASSED
tests/test_api.py::test_intent_simulation_over_limit_blocked PASSED
tests/test_api.py::test_escrow_lifecycle_and_webhook PASSED
tests/test_api.py::test_redteam_attacks PASSED
tests/test_api.py::test_audit_trail PASSED
======================== 8 passed in 19.71s ========================
```

### Frontend (TypeScript & Vite)
```bash
$ npm run build
vite v5.4.21 building for production...
✓ 1576 modules transformed.
✓ built in 2.19s
```

---

## 6. How to Run Locally

### 1. Start Local Anvil Blockchain
```bash
anvil --port 8545
```

### 2. Deploy Contracts
```bash
cd contracts
forge script script/DeployAndSeed.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 3. Start Backend Engine
```bash
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Start Frontend Dashboard
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```
