# AegisPay — FinTechathon 2026 Submission Package Manifest

> **2026 Shenzhen International FinTech Competition (Tsinghua University PBCSF & WeBank)**  
> **Track:** International Track  
> **Topic:** **Topic F: Agent Wallet (Autonomous On-Chain Wallet)**  
> **Submission Deadline:** October 20, 2026, 23:59 (Beijing Time, UTC+8)  
> **Repository:** `https://github.com/nafizalzawad/AegisPay-Autonomous-Treasury-Escrow-Protocol.git`  
> **Live Web Demo:** `https://aegispay-sigma.vercel.app/`

---

## 1. Submission Package Directory Structure

This folder contains all required deliverables strictly matching the official 6-item competition checklist:

```text
submission_package/
│
├── 01_Technical_Documentation/
│   ├── 01_Technical_Documentation_AegisPay.pdf       # Primary PDF submission
│   └── 01_Technical_Documentation_AegisPay.md        # Raw GitHub-flavored Markdown
│
├── 02_Presentation_Deck/
│   ├── 02_Presentation_Deck_AegisPay_16x9.pdf       # Primary 16:9 Landscape Widescreen PDF (11 slides)
│   ├── 02_Presentation_Deck_Interactive.html         # Interactive web deck with 10:00 timer & presenter notes
│   ├── 02_Presentation_Script_and_Judge_QA.pdf       # 9m30s speech script & 4-tier judge Q&A defense
│   └── 02_Presentation_Script_and_Judge_QA.md        # Markdown speech script
│
├── 03_Demo_Video/
│   ├── 03_Demo_Video_AegisPay_1080p.mp4              # 50.0s 1080p Full HD video (4.3 MB)
│   ├── 03_Demo_Video_Poster.jpg                      # High-resolution video poster frame
│   └── 03_Video_Metadata_and_Links.txt               # Transcript, specs, and cloud streaming links
│
├── 04_Source_Code/
│   ├── 04_Source_Code_AegisPay.zip                   # Complete clean source code archive (14.2 MB)
│   ├── 04_GitHub_Repository_and_Quickstart.txt       # Official repository link & reproduction commands
│   └── README.md                                     # Full project documentation & architecture guide
│
├── 05_Security_Self_Assessment_Report/
│   ├── 05_Security_Self_Assessment_Report_AegisPay.pdf # Primary PDF (4-tier RBAC & 8-part risk list)
│   └── 05_Security_Self_Assessment_Report_AegisPay.md  # Raw Markdown
│
├── 06_Execution_Evidence/
│   ├── 06_Execution_Evidence_AegisPay.pdf            # Primary PDF (on-chain tx hashes & revert logs)
│   └── 06_Execution_Evidence_AegisPay.md             # Raw Markdown
│
├── SUBMISSION_FORM_COPY_PASTE.txt                    # Form-ready copy-paste text for every portal field
├── SUBMISSION_MANIFEST.md                            # This manifest file
└── AegisPay_FinTechathon_2026_Full_Package_Topic_F.zip # Master archive of entire submission (5.78 MB)
```

---

## 2. Checklist Item-by-Item Verification

### [Item 01] Technical Documentation
- **File:** `01_Technical_Documentation/01_Technical_Documentation_AegisPay.pdf`
- **Scope:**
  - System architecture decoupling probabilistic reasoning from deterministic Solidity bytecode.
  - 5 core formal mathematical algorithms with pseudocode (Firewall Decision Engine, Webhook Attestation Engine, Rolling 24h Velocity Tracking, Automated Tax Reserve Splitting, and Dual-Mode Intent Parser).
  - Threat mitigation matrix covering prompt injections, infinite approvals, velocity drains, phishing, and delivery tampering.
  - EVM & enterprise consortium chain portability (FISCO BCOS compatibility).

### [Item 02] Presentation Deck
- **File:** `02_Presentation_Deck/02_Presentation_Deck_AegisPay_16x9.pdf`
- **Scope:**
  - **11 slides** formatted in **16:9 Landscape Widescreen** (`1440 x 810 pt` / `1920 x 1080 px`).
  - Strict 10-minute presentation constraint (timed at **9 minutes 30 seconds**).
  - Accompanied by interactive browser slides (`presentation_deck.html`) with 10:00 countdown timer, presenter notes drawer (`N`), and fullscreen mode (`F`).
  - Accompanied by verbatim speaking script and 4-tier academic/industry judge defense (`02_Presentation_Script_and_Judge_QA.pdf`).

### [Item 03] Demonstration Video
- **File:** `03_Demo_Video/03_Demo_Video_AegisPay_1080p.mp4`
- **Scope:**
  - **Duration:** 50.0 seconds (well within the 5-minute competition ceiling).
  - **Resolution:** 1080p 30fps Full HD (1920 $\times$ 1080), 4.3 MB file size.
  - **Content:** Demonstrates all 4 demo-critical flows without voiceover (monochrome typography, crisp UI captures, sound design, and on-screen cues).

### [Item 04] Source Code & Repository
- **GitHub Link:** `https://github.com/nafizalzawad/AegisPay-Autonomous-Treasury-Escrow-Protocol.git`
- **Archive File:** `04_Source_Code/04_Source_Code_AegisPay.zip`
- **Scope:**
  - Complete monorepo containing Solidity smart contracts (`contracts/`), FastAPI backend (`backend/`), Vite React frontend (`frontend/`), and GitHub Actions CI workflow (`.github/workflows/ci.yml`).
  - 19/19 passing Foundry unit and invariant fuzz tests (`forge test -vvv`).
  - 10-checkpoint automated full-stack E2E verification suite (`python scripts/e2e_verify.py`).

### [Item 05] Security Self-Assessment Report
- **File:** `05_Security_Self_Assessment_Report/05_Security_Self_Assessment_Report_AegisPay.pdf`
- **Scope:**
  - **4-Tier Permission Matrix:** Tier 0 (SME Root Admin), Tier 1 (Delegated AI Agent Session Key), Tier 2 (Contractor / Vendor), Tier 3 (Isolated Tax Reserve Sub-Account).
  - **Smart Contract RBAC Table:** 10 methods across `AegisVault.sol` and `MilestoneEscrow.sol` mapped to callers and custom revert errors.
  - **3-Stage Defense-in-Depth Pipeline:** Off-chain static checks, EVM `eth_call` delta simulation, and on-chain CEI execution.
  - **8-Item Known-Risk List (`RSK-01` to `RSK-08`):** Complete with CVSS scores, likelihood, technical mitigations, and operational procedures.

### [Item 06] Execution Evidence
- **File:** `06_Execution_Evidence/06_Execution_Evidence_AegisPay.pdf`
- **Scope:**
  - Real transaction hashes, block numbers, nonces, and gas metrics for all 12 deployment & policy provisioning transactions.
  - Provenance of Escrow #1 (seeded) and Escrow #2 (live session-key execution for $1,200 USDC).
  - Conservation-of-value balance sheet proving zero loss ($24,880.00 USDC invariant).
  - Red-team adversarial revert logs showing deterministic custom reverts (`PerTxSpendLimitExceeded`, `RecipientNotWhitelisted`, `FunctionSelectorNotAllowed`) with **$0.00 balance loss**.
  - Interactive judge verification playbook (`cast call`, `curl`, and `pytest`).

---

## 3. Recommended Submission Strategy

1. **If the competition portal has individual upload fields:**
   - Upload the `.pdf` file from each corresponding numbered folder.
   - For Item 03, upload `03_Demo_Video_AegisPay_1080p.mp4`.
   - For Item 04, paste the GitHub link and upload `04_Source_Code_AegisPay.zip`.
2. **If the competition portal requires a single master file:**
   - Upload `AegisPay_FinTechathon_2026_Full_Package_Topic_F.zip` (5.78 MB).
3. **For text boxes and form fields:**
   - Open `SUBMISSION_FORM_COPY_PASTE.txt` and copy the pre-formatted project title, one-line pitch, executive summary, GitHub link, live demo link, and transaction hashes directly into the form.
