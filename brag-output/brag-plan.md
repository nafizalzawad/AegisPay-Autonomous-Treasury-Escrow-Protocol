# Brag Plan: AegisPay

## What is this app?
AegisPay is an institutional-grade autonomous smart treasury and milestone escrow protocol for cross-border digital contractors and SMEs, decoupling probabilistic AI reasoning from deterministic on-chain execution via ERC-4337 smart accounts and session key policies.

## The angle
Autonomous financial agents are the frontier of fintech, but granting AI direct treasury custody creates existential risk—prompt injections, rogue approvals, and unconstrained spending. AegisPay solves this by enforcing an uncompromising architecture: **Probabilistic AI Reasoning in the Off-Chain Agent, Deterministic Smart Contract Enforcement On-Chain** (`AegisVault.sol`). Even if the AI model is adversarial or hallucinating, mathematical guardrails ensure zero balance loss.

## Hook (first 2-3 seconds)
High-contrast terminal typography slamming onto a slate grid:
*"What happens when you give an AI agent custody of an institutional treasury?"*
Immediate tension: rogue prompt injection, unconstrained draining, infinite ERC-20 approvals.

## Key moments (the middle)
- **The Dual-Stage Architecture:** Off-chain FastAPI agent with pre-execution `eth_call` dry-runs paired with on-chain `AegisVault.sol` enforcing 1,500 USDC per-tx caps, 3,000 USDC daily limits, recipient allowlists, and a strict ban on ERC-20 `approve()`.
- **Natural-Language Intent to On-Chain Escrow:** Live simulation of a user intent (*"Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI passes; withhold 15% for tax reserve"*) parsed into structured parameters and funded into `MilestoneEscrow.sol`.
- **Autonomous Settlement & Perceptual Attestation:** Simulated GitHub CI webhook fires -> Agent verifies payload, computes SHA-256 `attestationHash`, signs via delegated session key -> releases 85% ($1,020.00 USDC) to Contractor and routes 15% ($180.00 USDC) to the Vault's Tax Reserve.
- **Live Red-Team Defense Matrix:** 3 hostile attack vectors ($10,000 drain attempt, unwhitelisted hacker address, infinite approve hijack) deterministically blocked by Stage 1 & Stage 2 with exact Solidity revert reasons and **$0.00 total loss**.

## Outro / punchline
*"Autonomous financial agency requires deterministic institutional guardrails."*
Landing screen displaying live demo URL: `https://aegispay-sigma.vercel.app/`
Theme: 2026 Shenzhen International FinTechathon | Topic F: Agent Wallet (Autonomous On-Chain Wallet).

## User flow worth showing
1. **Entry:** User types or selects commercial intent in the Command Composer -> 2-Stage Firewall validates -> 1,200 USDC locked into escrow.
2. **Autonomous Trigger & Settlement:** GitHub CI webhook delivers `build_status: success` -> AI attestation generated -> 1,020 USDC released to Contractor + 180 USDC split into Tax Reserve sub-account.
3. **Adversarial Red-Team Arena:** Attack triggered -> Pre-Execution Firewall & Solidity contract reject -> $0.00 balance impact verified.

## Tone
- Preset: `polished`
- Creative direction: Institutional central-bank and high-tier enterprise fintech (WeBank / Stripe Treasury / Swiss architectural grid).
- Interpretation: Deep dark slate `#020617` and `#0f172a` canvas, precision 1px borders `#1e293b`, crisp cyan `#06b6d4` and emerald `#10b981` accents, clean metric animations, zero pastel fluff, zero crypto hype words.

## Format: landscape — 1920x1080
## Duration: 50.0 seconds (Approved 6-scene competition roadmap)

## Visual identity (from the project)
- Canvas Background: `#020617` (Slate 950)
- Surface Background: `#0f172a` (Slate 900)
- Hairline Borders: `#1e293b` (Slate 800)
- Primary Accent: `#06b6d4` (Cyan 500 / Electric Cyan)
- Success Accent: `#10b981` (Emerald 500)
- Threat / Red-Team Accent: `#ef4444` (Rose / Red 500)
- Warning Accent: `#f59e0b` (Amber 500)
- Primary Text: `#f8fafc` (Slate 50)
- Muted Text: `#94a3b8` (Slate 400)
- Display font: `Inter`, system-ui, sans-serif
- Monospace / Metric font: `JetBrains Mono`, monospace

## Share copy (draft)
AegisPay: Autonomous On-Chain Treasury & Milestone Escrow Protocol with Deterministic Session-Key Guardrails. Built for the 2026 FinTechathon (Topic F: Agent Wallet).

## Audio direction
- Role: Sparse professional accents with a driving modern fintech rhythm.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: Starts at t=0s at volume 0.7, maintains rhythmic energy through transitions, fades smoothly over the final 2 seconds (t=48s–50s).
- Music cue guidance: Preset upbeat tempo (~120 BPM). Strong cues at scene shifts (t=7.0s, t=14.0s, t=25.0s, t=35.0s, t=44.0s).
- Audio-reactive treatment: Subtle card glow and border opacity breathing to beat energy (RMS).
- SFX posture: High-precision minimal UI sounds: subtle mechanical key ticks on command composer, smooth digital swoosh on escrow deployment, crisp chime on settlement, and low-frequency alert on red-team block.
- Restraint rule: No generic EDM risers, no loud explosions, no voiceover.

## Storyboard

### Scene 1 — The Dilemma: Autonomous AI Treasury Custody — 7.0s (0.0s – 7.0s)
- **Visuals:** Dark architectural grid. Center title reveals: "The Promise: Autonomous AI Financial Agents." Counter-question surfaces: "The Reality: Direct private key custody creates catastrophic risk." Visual threat matrix flashes: Prompt Injections, Rogue Approvals, Unlimited Drains.
- **Sequential/interaction:** 3 threat vectors appear sequentially with warning indicators.
- **Audio intent:** Tension and high-stakes financial gravity.
- **Audio-coupled idea:** Low synth pulse, subtle digital glitches on threat appearances.
- **Transition mood:** Hard confident wipe → Scene 2.

### Scene 2 — The Solution: AegisPay Protocol Architecture — 7.0s (7.0s – 14.0s)
- **Visuals:** AegisPay brand mark and architecture diagram: "AegisVault.sol (ERC-4337 Smart Account)". Two clear pillars appear side-by-side: "Probabilistic AI Reasoning (Off-Chain Agent)" vs "Deterministic Enforcement (Solidity Session Keys)".
- **Key metrics badge:** $1,500 Max/Tx • $3,000 Daily Cap • Recipient Allowlist • Zero `approve()` Permitted.
- **Sequential/interaction:** Dual pillars slide in with connecting mathematical proof vectors.
- **Audio intent:** Institutional clarity and security confidence.
- **Transition mood:** Clean slide → Scene 3.

### Scene 3 — Core Lifecycle Part 1: Intent to Escrow — 11.0s (14.0s – 25.0s)
- **Visuals:** Command Composer UI. Natural language intent types out: *"Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI passes; withhold 15% for tax reserve"*.
- **Pre-execution Firewall:** Stage 1 `eth_call` simulation passes. 1,200 USDC locked into `MilestoneEscrow.sol`. Vault balance updates from 5,000.00 USDC to 3,800.00 USDC.
- **Sequential/interaction:** Simulated typing in composer -> Green check on Stage 1 Firewall -> Escrow card creates with ID `#ESC-8842`.
- **Audio intent:** Precision workflow execution.
- **Audio-coupled idea:** Crisp keyboard ticks, confirmation blip.
- **Transition mood:** Seamless pan → Scene 4.

### Scene 4 — Core Lifecycle Part 2: Perceptual Attestation & Settlement — 10.0s (25.0s – 35.0s)
- **Visuals:** Simulated GitHub CI/CD webhook triggers (`build_status: success`, commit `8f2a1c`). Agent verifies webhook payload, calculates SHA-256 `attestationHash`.
- **Automated Settlement:** Agent calls `releaseMilestoneWithTax()`. 85% ($1,020.00 USDC) transferred directly to Contractor (`0xDevStudio...`), 15% ($180.00 USDC) automatically deposited to Vault Tax Reserve.
- **Sequential/interaction:** Webhook event arrives -> SHA-256 hash generates -> Escrow status badges to `SETTLED` -> Dual payout split counters update.
- **Audio intent:** Decisive, automated financial settlement.
- **Audio-coupled idea:** Digital data sweep, pleasant settlement chime.
- **Transition mood:** Dramatic pulse → Scene 5.

### Scene 5 — Red-Team Arena: Live Adversarial Defense Matrix — 9.0s (35.0s – 44.0s)
- **Visuals:** High-security Red-Team Arena. 3 attack scenarios tested in real-time:
  1. *Prompt Injection $10,000 Drain* -> REVERTED (`SpendLimitExceeded: 10,000 > 1,500`)
  2. *Unwhitelisted Recipient Hijack* -> REVERTED (`RecipientNotWhitelisted`)
  3. *Malicious Infinite approve()* -> REVERTED (`DisallowedSelector`)
- **Telemetry result:** Total Vault Loss: **$0.00 (Zero Balance Loss Guarantee)**.
- **Sequential/interaction:** 3 attack cards activate, strike the firewall, and get stamped with red `REVERTED / 0 LOSS` stamps.
- **Audio intent:** Impenetrable algorithmic defense.
- **Audio-coupled idea:** 3 rapid low impact strikes followed by a solid vault lock sound.
- **Transition mood:** Clean fade → Scene 6.

### Scene 6 — Outro: Autonomous Agency Meets Institutional Guardrails — 6.0s (44.0s – 50.0s)
- **Visuals:** AegisPay institutional badge.
- **Text:** "AegisPay — Autonomous On-Chain Smart Treasury & Milestone Escrow Protocol"
- **Metadata tags:**
  - Topic F: Agent Wallet (Autonomous On-chain Wallet)
  - 2026 Shenzhen International FinTechathon | Tsinghua PBCSF & WeBank
  - Live Demo: `https://aegispay-sigma.vercel.app/`
- **Sequential/interaction:** Metric cards lock in place, live URL glows, music fades out gracefully.
- **Audio intent:** Authoritative closure.

**Music mood for this video:** Driving modern fintech rhythm, confident, clean.
**Audio summary:** A rhythmic, tech-forward audio track providing continuous momentum, punctuated by clean digital UI accents and resolving in a polished institutional outro.
