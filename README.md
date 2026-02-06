# Text-to-Chain: SMS-Based DeFi Platform

> **Bringing Web3 to everyone through simple text messages**

An SMS-based DeFi platform enabling users to interact with blockchain technology using only text messages. No smartphone, no app, no MetaMask required.

**Target Users:** 2.5 billion feature phone users worldwide who lack access to traditional banking and smartphone-based crypto wallets.

---

## 💬 SMS Commands

| Command | Description | Example |
|---------|-------------|---------|
| `JOIN` | Create wallet + ENS subdomain | `JOIN alice` |
| `BALANCE` | Check TXTC and ETH balances | `BALANCE` |
| `DEPOSIT` | Get wallet address | `DEPOSIT` |
| `REDEEM <code>` | Redeem voucher for tokens | `REDEEM ABC123` |
| `SEND <amt> <token> TO <recipient>` | Send tokens (batched via Yellow Network) | `SEND 10 TXTC TO alice.ttcip.eth` |
| `SWAP <amt> TXTC` | Swap TXTC for ETH (Uniswap V3) | `SWAP 5 TXTC` |
| `BRIDGE <amt> <token> FROM <chain> TO <chain>` | Cross-chain bridge (Li.Fi, mainnet) | `BRIDGE 10 USDC FROM POLYGON TO BASE` |
| `SAVE <name> <phone>` | Save a contact | `SAVE alice +919876543210` |
| `CONTACTS` | List saved contacts | `CONTACTS` |
| `CHAIN <name>` | Switch active chain | `CHAIN polygon` |
| `PIN <xxxx>` | Set/change PIN | `PIN 1234` |
| `HELP` | Show commands | `HELP` |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER LAYER                               │
│  Feature Phone ──► SMS ──► Twilio/SMSCountry ──► Webhook        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SMS REQUEST HANDLER (Rust, Port 8080)           │
│  • Command Parser (parser.rs)                                    │
│  • User Auth (phone → wallet)                                    │
│  • SQLite DB (users, vouchers, contacts)                         │
│  • Routes to backend APIs                                        │
└──────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Backend API  │   │  Yellow Network  │   │   Li.Fi Bridge   │
│ (Port 3000)  │   │  (Port 8083)     │   │  (via Backend)   │
│              │   │                  │   │                  │
│ • Swap       │   │ • Batch SEND     │   │ • Cross-chain    │
│ • Redeem     │   │ • 3-min sessions │   │ • Quote/Execute  │
│ • Balance    │   │ • Off-chain xfer │   │ • Mainnet only   │
│ • ENS        │   │ • On-chain settle│   │ • USDC/USDT/ETH  │
│ • Deposit    │   │ • Nitrolite SDK  │   │                  │
└──────┬───────┘   └────────┬─────────┘   └──────────────────┘
       │                    │
       ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                   SMART CONTRACTS (Sepolia Testnet)               │
│                                                                  │
│  TokenXYZ (TXTC)     0x0F0E4A3F59C3B8794A9044a0dC0155fB3C3fA223 │
│  VoucherManager      0x74B02854a16cf33416541625C100beC97cC94F01  │
│  EntryPointV3        0x0084FA06Fa317D4311d865f35d62dCBcb0517355  │
│  Uniswap V3 Pool     0xfdbf742dfc37b7ed1da429d3d7add78d99026c23  │
│  ENS Registrar       0xcD057A8AbF3832e65edF5d224313c6b4e6324F76  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Implemented Features

### 1. SMS Command Interface
- **Rust-based** SMS webhook handler (Axum framework)
- Command parser with pattern matching for all commands above
- Twilio + SMSCountry integration for SMS delivery
- SQLite database for users, vouchers, contacts, deposits

### 2. Wallet Management
- Automatic wallet creation on `JOIN`
- ENS subdomain registration (`alice.ttcip.eth`)
- On-chain ENS registrar at `0xcD057A8AbF3832e65edF5d224313c6b4e6324F76`
- Phone-to-wallet mapping in SQLite

### 3. Token Transfers via Yellow Network
- **Off-chain batching** using Nitrolite SDK state channels
- Transactions queued and processed every **3 minutes**
- Flow: Queue → Open Yellow session → Off-chain transfers → On-chain TXTC mint → Close session
- WebSocket connection to `wss://clearnet-sandbox.yellow.com/ws`
- Custody address: `0x019B65A265EB3363822f2752141b3dF16131b262`
- Asset: `ytest.usd` (Yellow sandbox token)
- On-chain settlement mints TXTC to recipients on Sepolia
- SMS notifications on completion

### 4. Token Swaps (Uniswap V3)
- `SWAP <amount> TXTC` → swaps TXTC for ETH
- Backend burns user's TXTC, mints to itself, swaps via Uniswap V3
- Pool: TXTC/WETH at 0.3% fee tier
- SwapRouter: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`
- Async execution with SMS notification on completion

### 5. Cross-Chain Bridge (Li.Fi) — Mainnet Ready
- `BRIDGE 10 USDC FROM POLYGON TO BASE`
- Li.Fi aggregates 20+ bridges (Stargate, Across, Hop, etc.)
- **Supported chains:** Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BSC
- **Supported tokens:** USDC, USDT, ETH, MATIC
- Quote endpoint returns estimated output, min output, execution time
- Async execution with SMS notification
- **Note:** Li.Fi is mainnet-only — does not work with testnet tokens

### 6. Voucher System
- On-chain voucher creation via VoucherManager
- `REDEEM <code>` mints TXTC + ETH gas bonus
- No shop registration required

### 7. Deposit Detection
- Blockchain polling service monitors user wallets
- Detects incoming ETH and ERC20 transfers
- SMS notification on deposit

### 8. Contact Book
- `SAVE alice +919876543210` — save contacts
- `CONTACTS` — list saved contacts
- Send to contacts by name

### 9. Airtime-to-Token Conversion
- Buy TXTC tokens with mobile airtime (MTN, Airtel)
- USSD menu interface (`*384*46750#`)
- 90% TXTC + 10% ETH distribution
- Africa's Talking payment gateway integration

---

## 📂 Repository Structure

```
Text-to-Chain/
├── sms-request-handler/     # Rust SMS webhook + command parser (Port 8080)
│   ├── src/commands/        # Command parsing (parser.rs)
│   ├── src/sms/             # Twilio/SMSCountry webhooks
│   ├── src/db/              # SQLite (users, vouchers, contacts, deposits)
│   └── src/wallet/          # Wallet creation, chains, tokens
│
├── backend-integration/     # TypeScript API server (Port 3000)
│   ├── api-server.ts        # Express endpoints (swap, redeem, balance, bridge, ENS)
│   ├── contract-service.ts  # Smart contract interactions
│   ├── lifi-service.ts      # Li.Fi bridge/swap service + chain/token maps
│   ├── ens-service.ts       # ENS subdomain registration
│   ├── blockchain-monitor.ts# Deposit detection
│   └── contracts.config.ts  # Contract addresses
│
├── yellow/                  # Yellow Network batch service (Port 8083)
│   └── src/
│       ├── batch-service.ts # Nitrolite SDK, 3-min batch loop, on-chain settlement
│       └── api-server.ts    # Queue/status/pending endpoints
│
├── lifi/                    # Li.Fi SDK example + config
│   └── src/
│       ├── config/          # Chain IDs, token addresses, SDK init
│       ├── services/        # Li.Fi API helpers (quote, allowance, status)
│       └── routes/          # Bridge/swap route handlers
│
├── ens_service/             # ENS integration (Partner Prize)
│   └── src/
│       ├── ens.rs           # Namehash, EnsMinter, ENS Registry bindings
│       ├── register.rs      # Parent domain registration (commit-reveal)
│       ├── sms.rs           # SMS conversation handler for ENS naming
│       └── main.rs          # Interactive CLI for ENS operations
│
├── Liquidity-pools/         # Solidity smart contracts (Foundry)
│   └── src/
│       ├── TokenXYZ.sol     # ERC20 with burnFromAny
│       ├── VoucherManager.sol
│       ├── EntryPointV3.sol
│       └── UniswapV3PoolManager.sol
│
├── airtime-service/         # Airtime-to-token conversion (Port 8082)
│
└── front/                   # Frontend (if applicable)
```

---

## 🔧 Technical Stack

| Layer | Technology |
|-------|-----------|
| **SMS Handler** | Rust, Axum, SQLite, reqwest |
| **Backend API** | TypeScript, Express, ethers.js v6 |
| **Yellow Network** | Nitrolite SDK, WebSocket, state channels |
| **Cross-Chain** | Li.Fi SDK/API |
| **Smart Contracts** | Solidity ^0.8.20, Foundry |
| **Blockchain** | Ethereum Sepolia (testnet) |
| **SMS Gateway** | Twilio, SMSCountry |
| **RPC Provider** | Alchemy |

---

## 🚀 Setup & Running

### Prerequisites

- Rust (latest stable)
- Node.js v18+
- Foundry (`foundryup`)

### Environment Variables

**`backend-integration/.env`:**
```env
PRIVATE_KEY=0x...
ENS_PRIVATE_KEY=0x...
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
LIFI_API_KEY=...              # Optional
```

**`yellow/.env`:**
```env
PRIVATE_KEY=0x...
ALCHEMY_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PORT=8083
```

### Start Services

```bash
# 1. Backend API (Port 3000)
cd backend-integration && npm install && npm start

# 2. Yellow Network Batch Service (Port 8083)
cd yellow && npm install && npm run dev

# 3. SMS Handler (Port 8080)
cd sms-request-handler && cargo run

# 4. Expose for Twilio (optional)
ngrok http 8080
```

### Test Commands

```bash
# Test SMS webhook
curl -X POST http://localhost:8080/webhook/sms \
  -H "Content-Type: application/json" \
  -d '{"From": "+919876543210", "Body": "HELP"}'

# Test LiFi quote
curl -X POST http://localhost:3000/api/lifi/quote \
  -H "Content-Type: application/json" \
  -d '{"fromChain":"polygon","toChain":"base","fromToken":"USDC","toToken":"USDC","amount":"10","userAddress":"0x..."}'

# Test Yellow send queue
curl -X POST http://localhost:8083/api/yellow/send \
  -H "Content-Type: application/json" \
  -d '{"recipientAddress":"0x...","amount":"10","userPhone":"+919876543210"}'

# Check supported chains
curl http://localhost:3000/api/lifi/chains
```

---

## 🔐 Security

- Backend wallet key in environment variables (never committed)
- User wallets created on-chain (no private key storage in DB)
- Owner-only smart contract functions (`burnFromAny`, `mint`)
- Phone number authentication for all commands
- PIN support for transaction protection

---

## 📚 Resources

- [Uniswap V3 Docs](https://docs.uniswap.org/)
- [ENS Docs](https://docs.ens.domains/)
- [Li.Fi Docs](https://docs.li.fi/)
- [Yellow Network Docs](https://docs.yellow.org/)
- [Nitrolite SDK](https://github.com/erc7824/nitrolite)
- [Twilio SMS API](https://www.twilio.com/docs/sms)

---

## 📄 License

MIT

---

**Built for the next billion crypto users**
