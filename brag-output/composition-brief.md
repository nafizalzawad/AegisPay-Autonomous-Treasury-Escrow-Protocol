# Hyperframes Composition Brief: AegisPay

## Objective
Create a polished 50-second institutional launch/demo video for AegisPay, submitted to the 2026 Shenzhen International FinTech Competition (FinTechathon), International Track, hosted by Tsinghua University's PBC School of Finance with WeBank.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 50.0 seconds (30 fps = 1500 frames)

## Source Material
- Project root: `f:/Competition/FinTechathon/AegisPay`
- Primary files read: `README.md`, `contracts/src/AegisVault.sol`, `contracts/src/MilestoneEscrow.sol`, `frontend/src/App.tsx`, `frontend/src/components/`, `screenshot_hydrated.png`
- Product name: AegisPay
- Tagline / strongest claim: "Autonomous On-Chain Smart Treasury & Milestone Escrow Protocol"
- Key UI or visual moments to recreate:
  - Header telemetry bar with Anvil Sandbox, Vault balance ($5,000 USDC), Tax Reserve, Active Policy metrics.
  - Natural-language Intent Terminal / Command Composer with simulated typing.
  - Perceptual CI/CD settlement flow with SHA-256 attestation and 85% / 15% automatic split.
  - Red-Team Arena displaying the 3 attack vectors blocked with zero balance loss.
- Copy that must appear verbatim:
  - "AegisPay — Autonomous On-Chain Smart Treasury & Milestone Escrow Protocol"
  - "Lock 1,200 USDC in escrow for DevStudio; auto-release when GitHub CI passes; withhold 15% for tax reserve"
  - "85% ($1,020.00 USDC) to Contractor • 15% ($180.00 USDC) to Tax Reserve"
  - "Total Vault Loss Across All Exploits: $0.00"
  - "Topic F: Agent Wallet (Autonomous On-chain Wallet)"
  - "2026 Shenzhen International FinTechathon | Tsinghua PBCSF & WeBank"
  - "https://aegispay-sigma.vercel.app/"

## Creative Direction
- Tone preset: `polished`
- Creative direction: Central-bank institutional fintech, Stripe Treasury & WeBank enterprise clarity.
- Interpretation: Precision 1px hairline grid, dark slate surfaces (`#020617` / `#0f172a`), crisp cyan (`#06b6d4`) and emerald (`#10b981`) telemetry indicators, live animated counters and logs.
- Angle: Giving autonomous AI direct private-key custody of a treasury is dangerous. AegisPay decouples off-chain probabilistic AI perception from deterministic on-chain smart account policy enforcement.
- Hook (0s–7s): "What happens when you give an AI agent custody of an institutional treasury?"
- Outro / punchline (44s–50s): "Autonomous financial agency requires deterministic institutional guardrails."
- Avoid: Neon crypto tropes, cartoon icons, fake partner logos, hype claims ("revolutionary", "game-changing").

## Visual Identity
- Background: `#020617`
- Card Surfaces: `#0f172a`
- Borders: `1px solid #1e293b`
- Accents: `#06b6d4` (Cyan), `#10b981` (Emerald), `#ef4444` (Rose)
- Primary Text: `#f8fafc`
- Secondary Text: `#94a3b8`
- Display Font: `Inter`, system-ui, sans-serif
- Monospace Font: `JetBrains Mono`, monospace

## Storyboard
Refer to `brag-output/brag-plan.md` for full scene timings:
1. Scene 1 (0.0s – 7.0s): The Dilemma — AI Agent Treasury Custody & Attack Vectors
2. Scene 2 (7.0s – 14.0s): The Architecture — AegisVault.sol & Session Key Policy Guardrails
3. Scene 3 (14.0s – 25.0s): Core Flow 1 — Commercial Intent Composer & Milestone Escrow Creation
4. Scene 4 (25.0s – 35.0s): Core Flow 2 — Perceptual CI/CD Attestation & 85/15 Tax-Reserve Settlement
5. Scene 5 (35.0s – 44.0s): Red-Team Arena — 3 Live Attacks Blocked, Zero Balance Loss ($0.00)
6. Scene 6 (44.0s – 50.0s): Outro — Institutional Summary, Competition Topic F, Live Demo Link

## Audio
- Audio role: Sparse professional accents with a driving modern fintech rhythm.
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: Starts at 0s at volume 0.70, smoothly fades out over the last 2 seconds (48.0s–50.0s).
- Music cues: Strong beat alignments at scene transitions (7.0s, 14.0s, 25.0s, 35.0s, 44.0s).
- Audio files: Copied into `brag-output/composition/assets/music/`.
