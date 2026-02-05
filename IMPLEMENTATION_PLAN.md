# SMS Airtime-to-TXTC Implementation Plan

## 🎯 Project Structure Decision

**Answer: NO, don't create a completely new folder!**

**Instead: Extend your existing `backend-integration` and `sms-request-handler` systems.**

---

## 📁 Current Project Structure

```
Text-to-Chain/
├── sms-request-handler/          # Rust SMS handler (KEEP & EXTEND)
│   ├── src/
│   │   ├── commands/
│   │   │   └── parser.rs         # Already has SEND, SWAP, BALANCE
│   │   ├── wallet/
│   │   └── main.rs
│   └── Cargo.toml
│
├── backend-integration/          # Node.js API server (KEEP & EXTEND)
│   ├── api-server.ts            # Already has /api/redeem, /api/send
│   ├── contract-service.ts      # Already has minting, swapping
│   └── package.json
│
├── Liquidity-pools/             # Smart contracts (KEEP)
│   └── (Your existing contracts)
│
└── NEW: airtime-service/        # ADD THIS - Telco integration
    ├── src/
    │   ├── telco/               # Telco Integration Layer
    │   ├── orchestrator/        # Payment orchestrator
    │   └── index.ts
    └── package.json
```

---

## 🏗️ Recommended Architecture

### Option 1: Microservices (Recommended for Scale)

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  sms-request-handler (Rust) - Port 8080                     │
│  ├─ Receives SMS from Twilio                                │
│  ├─ Parses commands (SEND, SWAP, BALANCE)                   │
│  └─ Routes to appropriate service                           │
│                                                              │
│  backend-integration (Node.js) - Port 3000                  │
│  ├─ /api/redeem - Voucher redemption                        │
│  ├─ /api/send - Token transfers                             │
│  ├─ /api/swap - Token swaps                                 │
│  └─ contract-service.ts - Blockchain operations             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ ADD NEW SERVICE ↓
                           │
┌─────────────────────────────────────────────────────────────┐
│                    NEW: AIRTIME SERVICE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  airtime-service (Node.js) - Port 8082                      │
│  ├─ /api/airtime/buy - Buy TXTC with airtime               │
│  ├─ /api/airtime/transfer - P2P airtime transfers          │
│  ├─ /api/airtime/balance - Check airtime balance           │
│  └─ /api/airtime/rate - Get conversion rate                │
│                                                              │
│  Components:                                                 │
│  ├─ telco/ - MTN, Airtel, AT integrations                  │
│  ├─ orchestrator/ - Payment flow logic                      │
│  └─ database/ - Transaction records                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Option 2: Monolith Extension (Simpler for MVP)

```
backend-integration/
├── api-server.ts              # EXTEND with new routes
│   ├── /api/redeem            # Existing
│   ├── /api/send              # Existing
│   ├── /api/swap              # Existing
│   ├── /api/airtime/buy       # NEW
│   ├── /api/airtime/transfer  # NEW
│   └── /api/airtime/balance   # NEW
│
├── contract-service.ts        # Keep as is
│
├── telco-service.ts          # NEW - Add this file
│   ├── TelcoFactory
│   ├── MTNOperator
│   ├── AirtelOperator
│   └── AfricasTalkingOperator
│
└── airtime-orchestrator.ts   # NEW - Add this file
    └── AirtimeOrchestrator
```

---

## 🚀 Recommended Approach: Hybrid

**Best of both worlds:**

1. **Keep existing system as-is** (don't break what works)
2. **Add new `airtime-service` folder** (clean separation)
3. **Integrate via API calls** (loose coupling)

### Folder Structure:

```
Text-to-Chain/
│
├── sms-request-handler/          # EXISTING - Extend commands
│   └── src/commands/parser.rs
│       ├── SEND (existing)
│       ├── SWAP (existing)
│       ├── BALANCE (existing)
│       ├── BUY (NEW - add this)      ← Calls airtime-service
│       └── AIRTIME (NEW - add this)  ← Calls airtime-service
│
├── backend-integration/          # EXISTING - Keep as is
│   ├── api-server.ts
│   └── contract-service.ts
│
├── airtime-service/             # NEW - Create this
│   ├── src/
│   │   ├── index.ts            # Main server
│   │   ├── api/
│   │   │   └── routes.ts       # API endpoints
│   │   ├── telco/
│   │   │   ├── TelcoFactory.ts
│   │   │   ├── MTNOperator.ts
│   │   │   ├── AirtelOperator.ts
│   │   │   └── interfaces.ts
│   │   ├── orchestrator/
│   │   │   └── AirtimeOrchestrator.ts
│   │   └── database/
│   │       └── schema.sql
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
└── Liquidity-pools/             # EXISTING - Keep as is
```

---

## 📝 Implementation Steps

### Step 1: Create New Airtime Service (Week 1)

```bash
# Create new folder
mkdir -p airtime-service/src/{api,telco,orchestrator,database}
cd airtime-service

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express axios dotenv ethers
npm install -D typescript @types/node @types/express ts-node

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
EOF

# Create .env
cat > .env << 'EOF'
# Telco APIs
MTN_API_KEY=your_mtn_key
MTN_API_SECRET=your_mtn_secret
AT_API_KEY=your_at_key
AT_USERNAME=your_at_username

# Backend Integration
CONTRACT_API_URL=http://localhost:3000

# Database
DATABASE_URL=sqlite:./airtime.db

# Server
PORT=8082
EOF
```

### Step 2: Build Telco Integration Layer

```typescript
// airtime-service/src/telco/interfaces.ts
export interface TelcoOperator {
  name: string;
  checkBalance(phone: string): Promise<BalanceResponse>;
  deductBalance(phone: string, amount: number): Promise<DeductionResponse>;
  // ... (from TELCO_INTEGRATION_LAYER_DETAILED.md)
}
```

```typescript
// airtime-service/src/telco/MTNOperator.ts
// Copy implementation from MTN_API_TESTING_GUIDE.md
```

### Step 3: Create API Routes

```typescript
// airtime-service/src/api/routes.ts
import express from 'express';
import { AirtimeOrchestrator } from '../orchestrator/AirtimeOrchestrator';

const router = express.Router();
const orchestrator = new AirtimeOrchestrator();

// Buy TXTC with airtime
router.post('/airtime/buy', async (req, res) => {
  const { phoneNumber, airtimeAmount } = req.body;
  
  const result = await orchestrator.buyTokensWithAirtime(
    phoneNumber,
    airtimeAmount
  );
  
  res.json(result);
});

// Check airtime balance
router.get('/airtime/balance/:phoneNumber', async (req, res) => {
  const { phoneNumber } = req.params;
  
  const balance = await orchestrator.checkAirtimeBalance(phoneNumber);
  
  res.json(balance);
});

export default router;
```

### Step 4: Update SMS Handler to Call Airtime Service

```rust
// sms-request-handler/src/commands/parser.rs

// Add new command
pub async fn process_command(&self, from: &str, text: &str) -> String {
    let command = text.trim().to_uppercase();
    
    // Existing commands
    if command.starts_with("SEND") { /* ... */ }
    if command.starts_with("SWAP") { /* ... */ }
    if command == "BALANCE" { /* ... */ }
    
    // NEW: Buy tokens with airtime
    if command.starts_with("BUY") {
        return self.buy_with_airtime(from, &command).await;
    }
    
    // NEW: Check airtime balance
    if command == "AIRTIME" {
        return self.check_airtime_balance(from).await;
    }
    
    // ... rest of code
}

async fn buy_with_airtime(&self, from: &str, command: &str) -> String {
    // Parse: "BUY 5000" -> amount = 5000
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.len() != 2 {
        return "Invalid format. Use: BUY <amount>".to_string();
    }
    
    let amount: u32 = match parts[1].parse() {
        Ok(a) => a,
        Err(_) => return "Invalid amount".to_string(),
    };
    
    // Call airtime service
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:8082/api/airtime/buy")
        .json(&serde_json::json!({
            "phoneNumber": from,
            "airtimeAmount": amount
        }))
        .send()
        .await;
    
    match response {
        Ok(res) => {
            let result: serde_json::Value = res.json().await.unwrap();
            if result["success"].as_bool().unwrap_or(false) {
                format!(
                    "✓ Bought {} TXTC for {} UGX. TX: {}",
                    result["txtcAmount"],
                    amount,
                    result["txHash"]
                )
            } else {
                format!("Failed: {}", result["error"])
            }
        }
        Err(_) => "Service unavailable. Try again.".to_string(),
    }
}
```

### Step 5: Start All Services

```bash
# Terminal 1: SMS Handler (existing)
cd sms-request-handler
./start-sms-handler.sh

# Terminal 2: Backend Integration (existing)
cd backend-integration
npm start

# Terminal 3: Airtime Service (new)
cd airtime-service
npm run dev
```

---

## 🔄 Integration Flow

```
User sends SMS: "BUY 5000"
         │
         ▼
┌─────────────────────┐
│  SMS Handler (Rust) │  Port 8080
│  - Receives SMS     │
│  - Parses "BUY 5000"│
└──────────┬──────────┘
           │
           │ HTTP POST /api/airtime/buy
           ▼
┌─────────────────────┐
│ Airtime Service     │  Port 8082
│ - Check balance     │
│ - Deduct airtime    │
│ - Calculate TXTC    │
└──────────┬──────────┘
           │
           │ HTTP POST /api/mint
           ▼
┌─────────────────────┐
│ Backend Integration │  Port 3000
│ - Mint TXTC tokens  │
│ - Send to user      │
└──────────┬──────────┘
           │
           │ Blockchain TX
           ▼
┌─────────────────────┐
│   Sepolia Testnet   │
│ - Record on chain   │
└─────────────────────┘
```

---

## 📊 Comparison: New Folder vs Extend Existing

| Aspect | New Folder | Extend Existing |
|--------|-----------|-----------------|
| **Complexity** | Medium | Low |
| **Separation** | Clean | Mixed |
| **Scalability** | High | Medium |
| **Development Speed** | Slower | Faster |
| **Maintenance** | Easier | Harder |
| **Recommended For** | Production | MVP/Testing |

---

## ✅ My Recommendation

**For your situation: Create `airtime-service` as a new folder**

**Why?**
1. ✅ Clean separation of concerns
2. ✅ Can scale independently
3. ✅ Won't break existing voucher system
4. ✅ Easy to test in isolation
5. ✅ Can deploy separately if needed

**But keep it simple:**
- Don't overcomplicate
- Reuse existing contract-service
- Share database if possible
- Start with basic features

---

## 🚀 Quick Start Command

```bash
# Create the new service structure
mkdir -p airtime-service/src/{api,telco,orchestrator,database}

# I can help you create all the files!
# Just say: "create the airtime service files"
```

**Next steps:**
1. Create `airtime-service` folder structure
2. Copy telco integration code from guides
3. Add new SMS commands to Rust handler
4. Test with MTN sandbox
5. Deploy and launch!

Want me to create the complete folder structure and starter files for you? 🚀
