# Text-to-Chain
### DeFi for the Next Billion Users — Powered by SMS & AI Agents
*"Bringing the power of Web3 to 2.5 billion feature phone users via simple text messages."*

---

# COMPLETE SYSTEM FLOW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER SEGMENTS                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐         ┌──────────────────────────────┐
│  USERS (Tier 1 Users)        │         │  USERS (Tier 2 Users)        │
│                              │         │                              │
│  • Have crypto in exchanges  │         │  • Cash only                 │
│  • 90% of unbanked worldwide │         │  • No bank account           │
│  • Have smartphones          │         │  • 10% of unbanked           │
│  • Use MetaMask/Binance      │         │  • Feature phones            │
│  • ~100M users potential     │         │  • ~2.5B users potential     │
│                              │         │                              │
└────────────┬─────────────────┘         └────────────┬─────────────────┘
             │                                        │
             │                                        │
             ▼                                        ▼
┌─────────────────────────────┐         ┌─────────────────────────────┐
│   ONBOARDING PATH A         │         │   ONBOARDING PATH B         │
│                             │         │                             │
│   Direct Crypto Deposit     │         │   Buy Voucher at Shop       │
│                             │         │                             │
│   SMS: "JOIN"               │         │   SMS: "JOIN"               │
│   → Wallet created          │         │   → Wallet created          │
│                             │         │                             │
│   SMS: "DEPOSIT"            │         │   SMS: "DEPOSIT"            │
│   → Get address             │         │   → Get address             │
│                             │         │                             │
│   Send from MetaMask        │         │   Visit shop with cash      │
│   → Polygon network         │         │   → Buy ₹500 voucher        │
│   → 0x742d35Cc..            │         │   → Get voucher code        │
│                             │         │                             │
│   Wait 1 min                │         │   SMS: "REDEEM [code]"      │
│   → Backend detects         │         │   → Custom tokens sent      │
│   → Auto-swap if needed     │         │   → Redeem in account       │
│                             │         │   → ETH swapped for it      │
│                             │         │                             │
│   SMS: "✓ 50 USDC received!"│         │   SMS: "✓ 0.1 ETH received!"│
└────────────┬────────────────┘         └────────────┬────────────────┘
             │                                        │
             └────────────────┬───────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │   UNIFIED SMS INTERFACE  │
                │                         │
                │   All users interact    │
                │   the same way          │
                │   via SMS commands      │
                └────────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼


┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND SERVICES (RUST)                                │
└─────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────┐
│   1. SMS WEBHOOK HANDLER     │
│                              │
│   Receives SMS from Twilio   │
│   ↓                          │
│   Parse command              │
│   ↓                          │
│   Route to appropriate       │
│   service                    │
└────────────┬─────────────────┘
             │
             ├───────────────────────┐
             │                       │
             ▼                       ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│ 2. ACCOUNT MANAGEMENT   │  │ 3. WALLET SERVICE        │
│                         │  │                          │
│ Commands:               │  │ • Create wallet          │
│ • JOIN                  │  │ • Generate keypair       │
│ • BALANCE               │  │ • HISTORY               │
│ • PIN [xxxx]            │  │ • Encrypt private key    │
│                         │  │ • Store in DB            │
│ Database:               │  │ • Multi-chain support    │
│ users                   │  │                          │
│ ├─ id                   │  │ Encryption:              │
│ ├─ phone                │  │ • AES-256-GCM            │
│ ├─ wallet_address       │  │ • Key derivation         │
│ ├─ encrypted_key        │  │ • Secure storage         │
│ ├─ pin_hash             │  └──────────────────────────┘
│ ├─ balance_usdc         │
│ └─ created_at           │
└─────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 4. DEPOSIT DETECTION SERVICE                                     │
│                                                                  │
│ Multi-Chain Monitoring:                                          │
│                                                                  │
│ Ethereum RPC ─┐                                                  │
│ Polygon RPC ──┼─→ WebSocket Listeners                            │
│ Base RPC ─────┤   ↓                                              │
│ Arbitrum RPC ─┘   Detect tx to user wallets                      │
│                   ↓                                              │
│                   Filter by address                              │
│                   ↓                                              │
│                   Wait for confirmations (12 blocks)             │
│                   ↓                                              │
│                   Tokens added? ──Yes→ Update balance            │
│                   ↓                                              │
│                   Send SMS notification                          │
│                                                                  │
│ Components:                                                      │
│ • BlockchainListener (per chain)                                 │
│ • TransactionFilter                                              │
│ • ConfirmationTracker                                            │
│ • AutoSwapOrchestrator                                           │
│ • BalanceUpdater                                                 │
│ • SMSNotifier                                                    │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 5. VOUCHER SYSTEM                                                │
│                                                                  │
│ Smart Contract (Polygon):                                        │
│                                                                  │
│ registerShop()                                                   │
│ ├─ Shop provides liquidity                                       │
│ ├─ Gets voucher generation rights                                │
│ └─ Earns yield on stake                                          │
│                                                                  │
│ generateVouchers(count, amounts)                                 │
│ ├─ Generate cryptographic codes                                  │
│ ├─ Store on-chain                                                │
│ └─ Return codes to shop                                          │
│                                                                  │
│ redeemVoucher(code)                                              │
│ ├─ Verify code validity                                          │
│ ├─ Mint/Transfer Custom Token                                    │
│ ├─ Uniswap Pool Interaction                                      │
│ ├─ Swap Custom Token → ETH (Gas)                                 │
│ ├─ Convert remainder to USDC                                     │
│ └─ Emit event                                                    │
│                                                                  │
│ settleCash()                                                     │
│ ├─ Shop reports cash collected                                   │
│ ├─ Off-chain: Shop sends cash to TextChain                       │
│ ├─ On-chain: Liquidity rebalancing                               │
│ └─ Shop can issue more vouchers                                  │
│                                                                  │
│ Backend Service:                                                 │
│ • Monitor RedeemVoucher events                                   │
│ • Update user balance                                            │
│ • Send SMS confirmation                                          │
│ • Track shop settlements                                         │
│ • Calculate commissions                                          │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 6. TRANSACTION SERVICE                                           │
│                                                                  │
│ User: "SEND 10 USDC TO +254712345678"                            │
│ ↓                                                                │
│ CommandParser                                                    │
│ ├─ Extract: amount=10, token=USDC, recipient=+254712345678       │
│ └─ Validate format                                               │
│ ↓                                                                │
│ SecurityService                                                  │
│ ├─ Verify PIN (if set)                                           │
│ ├─ Check daily limit ($500/day)                                  │
│ ├─ Check transaction limit ($100/tx)                             │
│ ├─ Fraud check (velocity, patterns)                              │
│ └─ ✓ Approved                                                    │
│ ↓                                                                │
│ RecipientResolver                                                │
│ ├─ Lookup +254712345678 in database                              │
│ ├─ Found: wallet_address = 0x8f5c2a...                           │
│ └─ Get recipient's preferred chain (Base)                        │
│ ↓                                                                │
│ LiFiService (Route Optimization)                                │
│ ├─ User on: Polygon                                             │
│ ├─ Recipient on: Base                                           │
│ ├─ Compare routes:                                              │
│ │  • Polygon → Base via Stargate: $1.50                        │
│ │  • Polygon → Base via Across: $0.50                          │
│ │  • Polygon → Base via Hop: $0.80                             │
│ └─ Select: Across (cheapest)                                    │
│ ↓                                                                │
│ Bridge Execution                                                 │
│ ├─ Lock 10 USDC on Polygon                                      │
│ ├─ Wait for filler/relayer                                      │
│ ├─ Release 10 USDC on Base                                      │
│ └─ Tx hash: 0xabc123...                                         │
│ ↓                                                                │
│ BalanceUpdater                                                   │
│ ├─ Sender: -10 USDC                                             │
│ └─ Recipient: +10 USDC                                          │
│ ↓                                                                │
│ SMSNotifier                                                      │
│ ├─ To sender: "✓ Sent 10 USDC to Kenya. Fee: $0.50"           │
│ └─ To recipient: "✓ Received 10 USDC from India"               │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 7. UNISWAP INTEGRATION                                           │
│                                                                  │
│ User: "POOL ADD 25 USDC 0.01 ETH"                              │
│ ↓                                                                │
│ UniswapService                                                   │
│ ├─ Validate amounts                                             │
│ ├─ Check balances                                               │
│ ├─ Select fee tier (0.3%)                                       │
│ └─ Calculate tick range (±10% from current price)              │
│ ↓                                                                │
│ Approve tokens                                                   │
│ ├─ USDC.approve(PositionManager, 25 USDC)                      │
│ └─ WETH.approve(PositionManager, 0.01 ETH)                     │
│ ↓                                                                │
│ Uniswap V3 Position Manager                                     │
│ ├─ mint() function                                              │
│ │  ├─ token0: USDC                                             │
│ │  ├─ token1: WETH                                             │
│ │  ├─ fee: 3000 (0.3%)                                         │
│ │  ├─ tickLower: -887220                                       │
│ │  ├─ tickUpper: 887220                                        │
│ │  ├─ amount0: 25 USDC                                         │
│ │  └─ amount1: 0.01 ETH                                        │
│ ├─ Returns: tokenId = 12345                                     │
│ └─ NFT minted to user                                           │
│ ↓                                                                │
│ PositionTracker                                                  │
│ ├─ Store position ID                                            │
│ ├─ Track initial amounts                                        │
│ ├─ Monitor fees earned                                          │
│ └─ Calculate APY                                                │
│ ↓                                                                │
│ SMS: "✓ Pool created! Position #12345. Earning 0.3% fees"      │
│                                                                  │
│ Ongoing:                                                         │
│ • Every 1 hour: Check fees earned                              │
│ • Every 1 day: Calculate APY                                   │
│ • User queries: "POOL EARNINGS" → Show real-time fees          │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 8. LIQUIDITY MANAGEMENT                                          │
│                                                                  │
│ TextChain Treasury                                              │
│ ┌──────────────────────────────────────────────────────┐       │
│ │                                                        │       │
│ │  Total: $500,000 USDC                                 │       │
│ │                                                        │       │
│ │  Hot Wallet (10%): $50K                               │       │
│ │  ├─ Instant redemptions                               │       │
│ │  ├─ Monitored 24/7                                    │       │
│ │  └─ Auto-refilled when < $10K                         │       │
│ │                                                        │       │
│ │  Warm Wallet (30%): $150K                             │       │
│ │  ├─ Daily operations                                  │       │
│ │  ├─ Shop settlements                                  │       │
│ │  └─ Refills hot wallet                                │       │
│ │                                                        │       │
│ │  Cold Storage (40%): $200K                            │       │
│ │  ├─ Multi-sig Gnosis Safe                             │       │
│ │  ├─ 3/5 signatures required                           │       │
│ │  └─ Emergency reserves                                │       │
│ │                                                        │       │
│ │  Yield Farming (20%): $100K                           │       │
│ │  ├─ Uniswap V3 pools                                  │       │
│ │  ├─ Earning 10-15% APY                                │       │
│ │  └─ Withdrawable if needed                            │       │
│ │                                                        │       │
│ └──────────────────────────────────────────────────────┘       │
│                                                                  │
│ Shop Stakes (Distributed Liquidity)                             │
│ ┌──────────────────────────────────────────────────────┐       │
│ │                                                        │       │
│ │  Shop A: $10,000 USDC staked                          │       │
│ │  Shop B: $10,000 USDC staked                          │       │
│ │  Shop C: $10,000 USDC staked                          │       │
│ │  ...                                                   │       │
│ │  Shop Z: $10,000 USDC staked                          │       │
│ │                                                        │       │
│ │  Total: $1,000,000 in distributed liquidity           │       │
│ │  (from 100 shops)                                     │       │
│ │                                                        │       │
│ └──────────────────────────────────────────────────────┘       │
│                                                                  │
│ Auto-Rebalancing (Every Hour)                                   │
│ ├─ Check hot wallet balance                                     │
│ ├─ If < $10K: Transfer from warm wallet                        │
│ ├─ If warm < $50K: Withdraw from yield farming                 │
│ ├─ If total < 20% obligations: Emergency mode                  │
│ └─ Alert team if critical                                       │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 9. SECURITY SYSTEM                                               │
│                                                                  │
│ Every Transaction Goes Through:                                 │
│                                                                  │
│ 1. PIN Verification                                             │
│    ├─ Hash entered PIN with Argon2                             │
│    ├─ Compare with stored hash                                  │
│    ├─ 3 attempts before lockout                                │
│    └─ ✓ / ✗                                                     │
│                                                                  │
│ 2. Limit Checks                                                 │
│    ├─ Daily limit: $500/day (adjustable)                       │
│    ├─ Per-tx limit: $100/tx (adjustable)                       │
│    ├─ Spending today: $50                                       │
│    └─ ✓ $60 tx approved (within limits)                        │
│                                                                  │
│ 3. Velocity Check                                               │
│    ├─ Max 10 tx per hour                                        │
│    ├─ Current: 3 tx in last hour                               │
│    └─ ✓ Approved                                                │
│                                                                  │
│ 4. Fraud Detection                                              │
│    ├─ New user + large amount? Flag                            │
│    ├─ Sends to many addresses? Flag                            │
│    ├─ Known scam address? Block                                │
│    ├─ Unusual pattern? Review                                   │
│    └─ Score: 15/100 (low risk) → ✓ Approved                    │
│                                                                  │
│ 5. Geographic Check                                             │
│    ├─ User location: India                                      │
│    ├─ Recipient: Kenya                                          │
│    ├─ Pattern: Normal cross-border                             │
│    └─ ✓ Approved                                                │
│                                                                  │
│ If ANY check fails:                                             │
│ ├─ Yellow flag: Require SMS confirmation                        │
│ ├─ Orange flag: Manual review (1-24 hours)                     │
│ └─ Red flag: Block + notify user                               │
└──────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│ 10. DATABASE SCHEMA                                              │
│                                                                  │
│ PostgreSQL Tables:                                              │
│                                                                  │
│ users                                                            │
│ ├─ id (uuid, primary key)                                       │
│ ├─ phone_number (varchar, unique)                              │
│ ├─ wallet_address (varchar)                                     │
│ ├─ encrypted_private_key (text)                                │
│ ├─ pin_hash (varchar)                                           │
│ ├─ preferred_language (varchar)                                │
│ ├─ daily_limit_usd (decimal)                                   │
│ ├─ balance_usdc (decimal)                                       │
│ ├─ kyc_status (enum)                                            │
│ ├─ is_active (boolean)                                          │
│ ├─ created_at (timestamp)                                       │
│ └─ updated_at (timestamp)                                       │
│                                                                  │
│ transactions                                                     │
│ ├─ id (uuid, primary key)                                       │
│ ├─ user_id (uuid, foreign key)                                 │
│ ├─ type (enum: deposit, send, receive, swap, pool)            │
│ ├─ amount (decimal)                                             │
│ ├─ token (varchar)                                              │
│ ├─ from_address (varchar)                                       │
│ ├─ to_address (varchar)                                         │
│ ├─ chain_id (integer)                                           │
│ ├─ tx_hash (varchar)                                            │
│ ├─ status (enum: pending, confirmed, failed)                   │
│ ├─ fee_usdc (decimal)                                           │
│ ├─ created_at (timestamp)                                       │
│ └─ confirmed_at (timestamp)                                     │
│                                                                  │
│ uniswap_positions                                               │
│ ├─ id (uuid, primary key)                                       │
│ ├─ user_id (uuid, foreign key)                                 │
│ ├─ position_id (bigint, unique)                                │
│ ├─ token0 (varchar)                                             │
│ ├─ token1 (varchar)                                             │
│ ├─ amount0 (decimal)                                            │
│ ├─ amount1 (decimal)                                            │
│ ├─ fees_earned (decimal)                                        │
│ ├─ chain_id (integer)                                           │
│ ├─ created_at (timestamp)                                       │
│ └─ last_updated (timestamp)                                     │
│                                                                  │
│ vouchers                                                         │
│ ├─ id (uuid, primary key)                                       │
│ ├─ code_hash (varchar, unique)                                 │
│ ├─ shop_address (varchar)                                       │
│ ├─ inr_amount (decimal)                                         │
│ ├─ is_redeemed (boolean)                                        │
│ ├─ redeemed_by (uuid, foreign key, nullable)                   │
│ ├─ created_at (timestamp)                                       │
│ └─ redeemed_at (timestamp, nullable)                           │
│                                                                  │
│ shops                                                            │
│ ├─ id (uuid, primary key)                                       │
│ ├─ address (varchar, unique)                                    │
│ ├─ name (varchar)                                               │
│ ├─ location (varchar)                                           │
│ ├─ staked_amount (decimal)                                      │
│ ├─ available_balance (decimal)                                  │
│ ├─ total_commission (decimal)                                   │
│ ├─ vouchers_sold (integer)                                      │
│ ├─ vouchers_redeemed (integer)                                  │
│ ├─ is_active (boolean)                                          │
│ └─ created_at (timestamp)                                       │
│                                                                  │
│ Redis Cache:                                                     │
│ ├─ balance:{user_id} → USDC balance (TTL: 5 min)              │
│ ├─ rate:USDC:INR → Exchange rate (TTL: 1 min)                 │
│ ├─ pending_tx:{tx_hash} → Transaction status (TTL: 1 hour)    │
│ └─ session:{phone} → Command context (TTL: 10 min)            │
└──────────────────────────────────────────────────────────────────┘
```

# COMPLETE USER FLOWS

## Flow 1: Crypto User (Tier 1)

```
1. Registration
   User → SMS: "JOIN"
   Backend → Create wallet
   Backend → SMS: "Welcome! Wallet: 0x742d..."

2. Deposit
   User → Opens Binance
   User → Withdraw USDC to 0x742d...
   User → Network: Polygon
   User → Amount: 50 USDC
   User → Confirm
   [2-5 minutes pass]
   Backend → Detects deposit
   Backend → SMS: "✓ Received 50 USDC"

3. Check Balance
   User → SMS: "BALANCE"
   Backend → SMS: "Balance: 50.00 USDC"

4. Create Pool
   User → SMS: "POOL ADD 25 USDC 0.01 ETH"
   Backend → Approve tokens
   Backend → Call Uniswap
   Backend → SMS: "✓ Pool created! Earning 0.3% fees"

5. Send Money
   User → SMS: "SEND 10 USDC TO +254712345678"
   Backend → LI.FI routing (Polygon → Base)
   Backend → Execute Bridge (Across/Stargate)
   Backend → SMS: "✓ Sent! Fee: $0.50"
   Recipient → SMS: "✓ Received 10 USDC from India"
```

## Flow 2: Cash User (Tier 2)

```
1. Registration
   User → SMS: "JOIN"
   Backend → Create wallet
   Backend → SMS: "Welcome! Wallet: 0x742d..."

2. Find Shop
   User → SMS: "SHOPS"
   Backend → Query database for nearby shops
   Backend → SMS: "Raj Kirana - 500m away
                   Address: CP, Delhi"

3. Buy Voucher
   User → Visits Raj Kirana
   User → "I want ₹500 TextChain voucher"
   Raj → Prints voucher code: JKXM4P29SL
   User → Pays ₹510 cash

4. Redeem Voucher
   User → SMS: "REDEEM JKXM4P29SL"
   Backend → Validate code
   Backend → Call smart contract
   Smart Contract → Mint Custom Shop Token (tSHOP) to User
   Backend → Trigger Uniswap Auto-Swap
   Uniswap → Swap tSHOP for ETH (Gas) & USDC
   Backend → SMS: "✓ Redeemed! Balance: 5.92 USDC"

5. Send Money
   User → SMS: "SEND 5 USDC TO +254712345678"
   [Same as Flow 1, step 5]
```

---

## 📂 Repository Structure

*   **`sms-request-handler/`**: The core Rust application.
    *   Handles SMS webhooks.
    *   Parses natural language-like commands.
    *   Manages the database (Users, Vouchers, Transactions).
    *   Executes blockchain transactions using `ethers-rs`.

## 🚀 Getting Started

### Prerequisites
*   Rust (latest stable)
*   PostgreSQL / SQLite
*   Twilio Account (for SMS)

### Installation
```bash
git clone https://github.com/minrawsjar/Text-to-Chain.git
cd Text-to-Chain/sms-request-handler

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run database setup
./run-sqlite.sh # or setup Postgres

# Run server
cargo run
```

---

## 💬 Command Reference
| Command | Description |
| --- | --- |
| `JOIN` | Create a new wallet |
| `BALANCE` | Check account balance across chains |
| `DEPOSIT` | Get wallet address for funding |
| `REDEEM <code>` | Redeem a cash voucher |
| `SEND <amt> <token> TO <phone>` | Send crypto to another phone number |
| `CHAIN <name>` | Switch active network (e.g., `CHAIN POLYGON`) |
