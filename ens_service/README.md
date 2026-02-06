# ENS Integration — Text-to-Chain

> **ENS Partner Prize Submission**

SMS-based ENS subdomain registration and resolution. Users create human-readable wallet names (`alice.ttcip.eth`) by simply texting `JOIN alice` — no browser, no MetaMask, no smartphone required.

---

## What We Built

Text-to-Chain integrates ENS deeply into an SMS-based DeFi platform, making ENS names accessible to **2.5 billion feature phone users** who can't use traditional ENS frontends.

### ENS Features

- **Subdomain Registration via SMS** — Text `JOIN alice` to get `alice.ttcip.eth`
- **On-Chain Minting** — Subdomains are minted on-chain via our custom ENS Subdomain Registrar
- **Name Resolution** — Send tokens to `alice.ttcip.eth` instead of `0x742d35Cc...`
- **Parent Domain Registration** — Full commit-reveal flow for registering `.eth` domains on Sepolia
- **Namehash & Labelhash** — Pure Rust implementation of ENS namehash (EIP-137)
- **ENS Registry Integration** — Direct interaction with ENS Registry and Public Resolver contracts

### How It Works

```
User sends SMS: "JOIN alice"
    ↓
SMS Handler (Rust) parses command
    ↓
Backend creates wallet for user
    ↓
ENS Registrar mints subdomain on-chain:
  • Sets subnode owner in ENS Registry
  • Points subdomain to Public Resolver
  • Sets address record (alice.ttcip.eth → 0x...)
    ↓
User receives SMS: "Welcome! Your wallet: alice.ttcip.eth"
```

Later, anyone can send tokens to this user:
```
SMS: "SEND 10 TXTC TO alice.ttcip.eth"
    ↓
ENS resolution: alice.ttcip.eth → 0x742d35Cc...
    ↓
Tokens transferred on-chain
```

---

## Architecture

### Rust ENS Service (`ens_service/`)

Standalone Rust service for ENS operations:

| File | Purpose |
|------|---------|
| `src/ens.rs` | Core ENS logic — namehash, labelhash, `EnsMinter` for subdomain minting, ENS Registry + Public Resolver contract bindings |
| `src/register.rs` | Parent domain registration via ETHRegistrarController (commit-reveal flow) |
| `src/sms.rs` | SMS conversation handler for ENS naming (stateful multi-step flow) |
| `src/main.rs` | Interactive CLI for testing ENS operations |

### TypeScript ENS Service (`backend-integration/ens-service.ts`)

Production ENS service used by the API server:

- Checks subdomain availability (`isAvailable`)
- Registers subdomains on-chain (`registerSubdomain`)
- Resolves names to addresses (`resolve`)
- Registers in ENS Registry with proper resolver setup
- Fallback to in-memory store if contract unavailable

### Smart Contract

**ENS Subdomain Registrar:** [`0xcD057A8AbF3832e65edF5d224313c6b4e6324F76`](https://sepolia.etherscan.io/address/0xcD057A8AbF3832e65edF5d224313c6b4e6324F76)

- Parent domain: `ttcip.eth`
- Network: Sepolia Testnet
- Functions: `isAvailable()`, `registerSubdomain()`, `resolve()`

### ENS Contracts Used

| Contract | Address (Sepolia) |
|----------|-------------------|
| ENS Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` |
| Public Resolver | `0x8FADE66B79cC9f707aB26799354482EB93a5B7dD` |
| ETH Registrar Controller | `0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72` |
| TTC Subdomain Registrar | `0xcD057A8AbF3832e65edF5d224313c6b4e6324F76` |

---

## SMS Commands Using ENS

| Command | ENS Usage |
|---------|-----------|
| `JOIN alice` | Registers `alice.ttcip.eth` on-chain, maps to new wallet |
| `SEND 10 TXTC TO alice.ttcip.eth` | Resolves ENS name → address, sends tokens |
| `BALANCE` | Shows balance for user's ENS-linked wallet |

---

## Setup

### Rust Service

```bash
cd ens_service
cp .env.example .env
# Edit .env with your keys

cargo run
```

### Environment

```env
PRIVATE_KEY=0x...                    # Wallet that owns ttcip.eth
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PARENT_DOMAIN=ttcip.eth
```

### Run Tests

```bash
cargo test
```

Tests include:
- `test_namehash_eth` — Verifies namehash("eth") matches known value
- `test_namehash_vitalik_eth` — Verifies namehash("vitalik.eth")
- `test_labelhash` — Verifies keccak256 label hashing
- `test_menu_flow` — SMS conversation flow
- `test_registration_flow` — Full registration via SMS

---

## Key Implementation Details

### Namehash (EIP-137)

Pure Rust implementation in `ens.rs`:

```rust
pub fn namehash(name: &str) -> [u8; 32] {
    let mut node = [0u8; 32];
    if name.is_empty() { return node; }
    let labels: Vec<&str> = name.split('.').collect();
    for label in labels.into_iter().rev() {
        let label_hash = keccak256(label.as_bytes());
        let mut combined = Vec::with_capacity(64);
        combined.extend_from_slice(&node);
        combined.extend_from_slice(&label_hash);
        node = keccak256(&combined);
    }
    node
}
```

### Subdomain Minting (3-step on-chain process)

1. **Set subnode owner** — `registry.setSubnodeOwner(parentNode, labelHash, targetAddress)`
2. **Set resolver** — `registry.setResolver(subdomainNode, publicResolver)`
3. **Set address record** — `resolver.setAddr(subdomainNode, targetAddress)`

### Parent Domain Registration (commit-reveal)

Full ENS commit-reveal flow to prevent front-running:
1. `makeCommitment()` → generate commitment hash
2. `commit()` → submit commitment on-chain
3. Wait for minimum commitment age (~60s on Sepolia)
4. `register()` → complete registration with payment

---

## Why ENS + SMS Matters

- **2.5 billion** feature phone users can't use ENS frontends
- SMS makes ENS names accessible without internet browsers
- Human-readable names replace 42-character hex addresses
- Users text `SEND 10 TXTC TO alice.ttcip.eth` instead of copying hex addresses
- ENS subdomains are minted on-chain — fully verifiable and portable

---

## License

MIT
