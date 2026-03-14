# Starknomo — Problem, Solution & Impact

One place for the **what** and **why** of Starknomo, optimized. **Canonical story (why / what / how):** see [Why Starknomo?](README.md#why-starknomo) and [Solution — Starknomo](README.md#solution--starknomo) in the main README.

---

## 1. Problem

- **Binary options in Web3 do not exist today.** In Web2, binary options apps are broken, fraudulent, and algorithmically biased.
- **Root cause:** No real-time data oracles existed that could deliver price feeds in **&lt;1 second.**
- **590 million** crypto users and **400 million** transactions on the top 200 blockchains every single day — and one big news/move/crash can **crash oracles**, creating a huge gap for a high-demand dApp like Starknomo.


**Who is affected**

- **Retail traders** who want transparent, verifiable, on‑chain binary options rather than opaque Web2 brokers.
- **Starknet users** who want a native binary options venue with STRK and house balance.
- **Ecosystem builders** (wallets, analytics, influencers) who need simple, engaging products they can plug into and promote.

**Why it matters**

- Binary options represent a **multi‑billion‑dollar market** in Web2 and a fast‑growing segment in crypto.
- Bringing this activity **on Starknet** aligns incentives, improves transparency, and drives **volume + users to the Starknet ecosystem**.
- Short‑duration products (5s–1m) are extremely engaging and shareable; done correctly, they can be a powerful **acquisition + retention loop** for the ecosystem.

---

## 2. Solution

### High-level approach

Starknomo is the **on‑chain binary options trading dApp on Starknet (Sepolia)**. It combines:

- **Pyth Hermes** for **millisecond‑grade price attestations** across 300+ assets.
- A **house balance** model (off‑chain ledger in Supabase) where only deposits/withdrawals hit the chain.
- **Two game modes** (Classic + Box) for different risk/reward and engagement profiles.

This lets users place **sub‑minute, oracle‑settled binary options** with low latency, low fees, and fully transparent settlement.

### Key Features

- **Classic Mode** — Simple “UP / DOWN” on an asset (e.g. BTC/USDT) over 5s–1m rounds with oracle‑bound resolution.
- **Box Mode** — Tap multipliers on a tiled price chart; win if price touches the tile before expiry (up to 10x payouts).
- **House Balance** — Users deposit STRK once, then place many bets off‑chain against their balance; only deposit/withdraw are on-chain txs.
- **Starknet Native** — Built only for Starknet Sepolia; Argent X, Braavos, Cartridge; STRK as the native token.
- **Starkzap & Cartridge** — Social Login (email, Google, Discord), gasless STRK deposits via Cartridge paymaster when supported, with user-paid gas fallback; policy-based sponsorship for treasury deposits.
- **Transparent Treasury** — Treasury address with clear reserves and planned upgrades to multi‑sig and smart‑contract vaults.

### Why this approach works

- **Performance**: Off‑chain execution + Pyth Hermes allows **1,000+ bets/second** with <100ms settlement latency.
- **UX**: No transaction popups per bet; users get a CEX‑like experience with on‑chain guarantees at deposit/withdraw boundaries.
- **Safety & future‑proofing**: The design phases toward **multi‑sig and smart‑contract vaults**, plus an insurance fund from protocol fees.

**User journey (short view)** — see `USER_JOURNEY.md` for a full breakdown:

```mermaid
flowchart LR
    A[Connect Wallet] --> B[Deposit STRK to Treasury]
    B --> C[Play Classic or Box Rounds]
    C --> D[Oracle Settlement via Pyth Hermes]
    D --> E[House Balance Updates]
    E --> F[Withdraw STRK from Treasury]
```

Connect via Argent X, Braavos, or Social Login (Starkzap/Cartridge).

---

## 3. Business & Ecosystem Impact

### Target users & adoption path

- **Starknet DeFi traders** looking for new high‑frequency products with simple UX.
- **Binary options / prediction market users** moving from Web2 platforms toward transparent, on‑chain venues.
- **Communities & KOLs** who need an exciting, easy‑to‑explain product to power content and engagement.

Adoption strategy (high‑level):

- Launch on **Starknet Sepolia** (then mainnet), then run **onboarding quests, referral programs, and streak‑based rewards** to bootstrap activity.
- Partner with **Starknet wallets and KOLs** for co‑marketing and embedded experiences.
- Expand asset coverage (crypto, FX, indices) using Pyth feeds to tap into broader user bases.

### Value to Starknet & ecosystem

- **Volume & users**: On‑chain deposits/withdrawals and high trading activity drive **transaction volume and address growth** on Starknet.
- **Composable infra**: Starknomo’s oracle usage, treasury design, and data can be integrated into **analytics, structured products, and bots**.
- **Showcase for Pyth Hermes + Starknet**: Demonstrates real‑time oracle usage and Starknet’s low‑latency capabilities with a clear, understandable UX.

### Monetization & sustainability

- **Protocol fees** (1.5–2% per bet) allocated to:
  - Treasury reserves
  - Insurance fund
  - Team + community incentives
- **Referral fees**: Long‑term fee share for referrers.
- **Future token utility**: Token for fee discounts, governance, and liquidity incentives (see `ROADMAP.md` for full tokenomics).

---

## 4. Limitations & Future Work

### Current limitations / risks

- **Single treasury (Phase 1)** — Current implementation uses a single treasury address on Starknet Sepolia (see `docs/starknet.address.json` and env), with planned upgrade to multi‑sig and smart‑contract vaults.
- **Oracle dependency** — Settlement quality depends on **Pyth Hermes** performance and availability; circuit breakers are planned for extreme deviation events.
- **Regulatory uncertainty** — Binary options have varying regulatory treatment across jurisdictions; Starknomo is infrastructure and may require per‑region front‑end access policies.

### Short‑term roadmap

- Deploy to **Starknet mainnet**, finalize **multi‑sig treasury**, and harden monitoring/alerts.
- Ship **advanced analytics**, **demo mode refinements**, and improve mobile UX.
- Run targeted **Starknet ecosystem campaigns** and community trading competitions.

### Longer‑term roadmap

- Launch **governance token**, DAO‑style governance, and liquidity mining.
- Remain **Starknet-only**; no cross-chain expansion — focus on depth and quality on Starknet.
- Release **institutional APIs** for bots, market‑makers, and partner integrations.

> For a detailed timeline, see `ROADMAP.md`. For a deep technical breakdown and setup instructions, see `docs/TECHNICAL.md` and `DEVELOPER_GUIDE.md`.
