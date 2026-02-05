# Operator Balance Transfer - Complete Architecture & Implementation Plan

## Overview
Integration of telco-managed airtime transfers with blockchain-based token system, enabling users to convert mobile airtime credits into TXTC tokens or perform P2P transfers.

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACES                           │
├─────────────────┬───────────────────┬──────────────────────────┤
│   USSD Menu     │    SMS Gateway    │   Existing SMS Handler   │
│  *123*456#      │  SEND $10 TO...   │   REDEEM, BALANCE, etc   │
└────────┬────────┴─────────┬─────────┴──────────┬───────────────┘
         │                  │                    │
         ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              TELCO INTEGRATION LAYER (NEW)                       │
├─────────────────────────────────────────────────────────────────┤
│  • USSD Gateway Service                                          │
│  • Airtime Balance API                                           │
│  • Operator Transfer API                                         │
│  • SMS Confirmation Service                                      │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│           BALANCE TRANSFER ORCHESTRATOR (NEW)                    │
├─────────────────────────────────────────────────────────────────┤
│  • Airtime → TXTC Conversion Engine                              │
│  • P2P Transfer Manager                                          │
│  • Transaction Validator                                         │
│  • Rate Calculator (dynamic pricing)                             │
└────────┬────────────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┬─────────────────┐
         ▼                  ▼                  ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Existing   │  │   Contract   │  │  Blockchain  │  │   Database   │
│ SMS Handler  │  │     API      │  │   (Sepolia)  │  │   (SQLite)   │
│  (Rust)      │  │ (TypeScript) │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Detailed Component Design

### 1. **USSD Gateway Service** (New Microservice)

**Technology:** Node.js/Express or Rust (Actix-web)  
**Port:** 8081  
**Purpose:** Handle USSD session management and menu navigation

#### USSD Menu Structure:
```
*123*456#
├─ 1. Buy TXTC Tokens
│  ├─ Enter amount ($1-$100)
│  ├─ Confirm purchase
│  └─ Receive TXTC + SMS confirmation
│
├─ 2. Transfer Airtime
│  ├─ Enter phone number
│  ├─ Enter amount
│  ├─ Confirm transfer
│  └─ Both parties get SMS
│
├─ 3. Check Balance
│  ├─ Airtime balance
│  └─ TXTC balance
│
└─ 4. Transaction History
   └─ Last 5 transactions
```

#### API Endpoints:
```typescript
POST /ussd/session
  - Manages USSD session state
  - Routes to appropriate handler
  
POST /ussd/buy-tokens
  - Converts airtime to TXTC
  - Calls Balance Transfer Orchestrator
  
POST /ussd/transfer-airtime
  - P2P airtime transfer
  - Records on blockchain
```

---

### 2. **Balance Transfer Orchestrator** (New Core Service)

**Technology:** TypeScript (Node.js)  
**Port:** 8082  
**Purpose:** Central logic for all balance operations

#### Key Modules:

##### A. Airtime → TXTC Conversion Engine
```typescript
interface ConversionRequest {
  phoneNumber: string;
  airtimeAmount: number;  // in local currency
  operatorId: string;     // MTN, Airtel, etc.
}

interface ConversionResponse {
  txtcAmount: number;
  conversionRate: number;
  fees: number;
  txHash: string;
  walletAddress: string;
}

class AirtimeConverter {
  // Dynamic rate based on liquidity pool
  async getConversionRate(currency: string): Promise<number>
  
  // Deduct airtime via operator API
  async deductAirtime(phone: string, amount: number): Promise<boolean>
  
  // Mint TXTC tokens
  async mintTokens(userAddress: string, amount: number): Promise<string>
  
  // Record transaction
  async recordConversion(data: ConversionRequest): Promise<void>
}
```

##### B. P2P Transfer Manager
```typescript
interface P2PTransfer {
  fromPhone: string;
  toPhone: string;
  amount: number;
  transferType: 'airtime' | 'txtc';
}

class P2PManager {
  // Transfer airtime between users
  async transferAirtime(transfer: P2PTransfer): Promise<TransferResult>
  
  // Transfer TXTC tokens (uses existing SEND command)
  async transferTokens(transfer: P2PTransfer): Promise<TransferResult>
  
  // Hybrid: airtime from sender, TXTC to receiver
  async hybridTransfer(transfer: P2PTransfer): Promise<TransferResult>
}
```

##### C. Rate Calculator
```typescript
class RateCalculator {
  // Get current TXTC/USD rate from Uniswap pool
  async getTXTCRate(): Promise<number>
  
  // Get airtime/USD rate from operator
  async getAirtimeRate(operator: string): Promise<number>
  
  // Calculate conversion with fees
  calculateConversion(airtimeAmount: number): {
    txtcAmount: number;
    operatorFee: number;
    platformFee: number;
    gasFee: number;
  }
}
```

---

### 3. **Telco Integration Layer** (Adapter Pattern)

**Purpose:** Abstract different operator APIs

```typescript
interface TelcoOperator {
  name: string;
  checkBalance(phoneNumber: string): Promise<number>;
  deductBalance(phoneNumber: string, amount: number): Promise<boolean>;
  transferBalance(from: string, to: string, amount: number): Promise<boolean>;
  sendSMS(to: string, message: string): Promise<boolean>;
}

// Implementations for different operators
class MTNOperator implements TelcoOperator { }
class AirtelOperator implements TelcoOperator { }
class VodafoneOperator implements TelcoOperator { }

class TelcoFactory {
  static getOperator(phoneNumber: string): TelcoOperator {
    // Detect operator from phone prefix
    // Return appropriate implementation
  }
}
```

---

## Database Schema Extensions

### New Tables:

```sql
-- Airtime transactions
CREATE TABLE airtime_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL,
  operator TEXT NOT NULL,
  airtime_amount REAL NOT NULL,
  txtc_amount REAL NOT NULL,
  conversion_rate REAL NOT NULL,
  tx_hash TEXT,
  status TEXT CHECK(status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- P2P transfers
CREATE TABLE p2p_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  amount REAL NOT NULL,
  transfer_type TEXT CHECK(transfer_type IN ('airtime', 'txtc', 'hybrid')),
  tx_hash TEXT,
  status TEXT CHECK(status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Operator rates cache
CREATE TABLE operator_rates (
  operator TEXT PRIMARY KEY,
  currency TEXT NOT NULL,
  rate_per_unit REAL NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USSD sessions
CREATE TABLE ussd_sessions (
  session_id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  current_menu TEXT,
  session_data TEXT, -- JSON
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Integration with Existing System

### Modified SMS Handler Commands

Add new commands to existing Rust SMS handler:

```rust
pub enum Command {
    // Existing commands
    Redeem { code: String },
    Balance,
    Send { amount: String, recipient: String },
    Swap { amount: String },
    Help,
    
    // NEW: Airtime commands
    BuyWithAirtime { amount: String },           // BUY $10
    CheckAirtimeBalance,                          // AIRTIME
    TransferAirtime { amount: String, to: String }, // TRANSFER $5 TO +1234567890
}
```

### New API Endpoints in Contract API

```typescript
// backend-integration/api-server.ts

// Convert airtime to TXTC
app.post('/api/airtime/buy', async (req, res) => {
  const { phoneNumber, airtimeAmount, operator } = req.body;
  
  // 1. Verify airtime balance with operator
  // 2. Calculate TXTC amount
  // 3. Deduct airtime
  // 4. Mint TXTC tokens
  // 5. Send confirmation SMS
});

// P2P airtime transfer
app.post('/api/airtime/transfer', async (req, res) => {
  const { fromPhone, toPhone, amount } = req.body;
  
  // 1. Verify sender balance
  // 2. Execute operator transfer
  // 3. Record on blockchain (optional)
  // 4. Send confirmation to both parties
});

// Get conversion rates
app.get('/api/airtime/rates', async (req, res) => {
  const { operator } = req.query;
  
  // Return current conversion rates
});
```

---

## Implementation Phases

### **Phase 1: Foundation (Week 1-2)**

1. **Set up Telco Integration Layer**
   - Research operator APIs (MTN, Airtel, etc.)
   - Implement mock operator for testing
   - Create TelcoOperator interface

2. **Database Extensions**
   - Add new tables
   - Create migration scripts
   - Update existing repositories

3. **Rate Calculator**
   - Implement dynamic rate fetching
   - Add fee calculation logic
   - Create rate caching mechanism

**Deliverable:** Working rate calculator with mock operator

---

### **Phase 2: Core Services (Week 3-4)**

1. **Balance Transfer Orchestrator**
   - Implement AirtimeConverter
   - Implement P2PManager
   - Add transaction validation

2. **API Endpoints**
   - Add `/api/airtime/*` endpoints
   - Integrate with existing Contract API
   - Add proper error handling

3. **SMS Handler Updates**
   - Add new commands (BUY, TRANSFER, AIRTIME)
   - Update command parser
   - Add response handlers

**Deliverable:** End-to-end airtime → TXTC conversion via SMS

---

### **Phase 3: USSD Integration (Week 5-6)**

1. **USSD Gateway Service**
   - Implement session management
   - Create menu navigation
   - Add USSD → API bridge

2. **USSD Menu Implementation**
   - Buy tokens flow
   - Transfer airtime flow
   - Balance check flow

3. **Testing**
   - USSD simulator testing
   - Integration testing with SMS
   - Load testing

**Deliverable:** Working USSD interface

---

### **Phase 4: Production Readiness (Week 7-8)**

1. **Real Operator Integration**
   - Replace mocks with real APIs
   - Handle operator-specific quirks
   - Add retry logic and fallbacks

2. **Security & Compliance**
   - Add transaction limits
   - Implement fraud detection
   - KYC/AML compliance (if needed)

3. **Monitoring & Analytics**
   - Add logging
   - Set up alerts
   - Create admin dashboard

**Deliverable:** Production-ready system

---

## Technical Stack

### New Services:

```yaml
Balance Transfer Orchestrator:
  Language: TypeScript
  Framework: Express.js
  Port: 8082
  Dependencies:
    - ethers.js (blockchain interaction)
    - axios (HTTP client)
    - sqlite3 (database)

USSD Gateway:
  Language: TypeScript or Rust
  Framework: Express.js or Actix-web
  Port: 8081
  Dependencies:
    - ussd-menu-builder (if using Node.js)
    - redis (session management)

Telco Integration:
  Language: TypeScript
  Pattern: Adapter + Factory
  APIs:
    - MTN MoMo API
    - Airtel Money API
    - Africa's Talking (aggregator)
```

---

## Data Flow Examples

### Example 1: Buy TXTC with Airtime (USSD)

```
1. User dials *123*456# → USSD Gateway
2. User selects "1. Buy TXTC Tokens"
3. User enters amount: $10
4. USSD Gateway → Balance Transfer Orchestrator
   POST /api/airtime/buy
   {
     "phoneNumber": "+254712345678",
     "airtimeAmount": 10,
     "operator": "MTN"
   }

5. Orchestrator:
   a. Check user airtime balance (Telco API)
   b. Calculate TXTC amount (Rate Calculator)
      - $10 airtime = 1000 TXTC (at 1:100 rate)
      - Minus 2% platform fee = 980 TXTC
   c. Deduct $10 airtime (Telco API)
   d. Get/create user wallet address
   e. Mint 980 TXTC tokens (Contract API)
   f. Record transaction in database
   g. Send confirmation SMS

6. User receives:
   - USSD confirmation message
   - SMS: "You bought 980 TXTC with $10 airtime. 
           Wallet: 0x7190... TX: 0xabc..."
```

### Example 2: P2P Airtime Transfer (SMS)

```
1. User sends SMS: "TRANSFER $5 TO +254798765432"
2. SMS Handler (Rust) → Balance Transfer Orchestrator
   POST /api/airtime/transfer
   {
     "fromPhone": "+254712345678",
     "toPhone": "+254798765432",
     "amount": 5
   }

3. Orchestrator:
   a. Verify sender has $5 airtime
   b. Execute transfer via Telco API
   c. Record transaction on blockchain (optional)
   d. Update database

4. Both users receive SMS:
   - Sender: "You sent $5 airtime to +254798765432. 
             New balance: $15. TX: 0xdef..."
   - Receiver: "You received $5 airtime from +254712345678. 
               New balance: $25."
```

### Example 3: Hybrid Transfer (Airtime → TXTC)

```
User A (has airtime) → User B (receives TXTC)

1. User A: "SEND $10 TXTC TO +254798765432"
2. System detects User A has no TXTC but has airtime
3. Orchestrator:
   a. Convert $10 airtime to TXTC (980 TXTC)
   b. Transfer 980 TXTC to User B's wallet
   c. Record both transactions

4. Confirmations:
   - User A: "Converted $10 airtime to 980 TXTC and sent to +254798765432"
   - User B: "Received 980 TXTC from +254712345678"
```

---

## Configuration

### Environment Variables

```bash
# Telco Integration
MTN_API_KEY=your_mtn_api_key
MTN_API_SECRET=your_mtn_secret
AIRTEL_API_KEY=your_airtel_key
AFRICAS_TALKING_API_KEY=your_at_key

# USSD
USSD_SHORTCODE=*123*456#
USSD_SESSION_TIMEOUT=180

# Rates & Fees
PLATFORM_FEE_PERCENT=2
MIN_AIRTIME_AMOUNT=1
MAX_AIRTIME_AMOUNT=100

# Services
BALANCE_ORCHESTRATOR_URL=http://localhost:8082
USSD_GATEWAY_URL=http://localhost:8081
CONTRACT_API_URL=http://localhost:3000
SMS_HANDLER_URL=http://localhost:8080
```

---

## Testing Strategy

### 1. Unit Tests
- Rate calculator logic
- Conversion formulas
- Fee calculations

### 2. Integration Tests
- Mock operator API responses
- End-to-end conversion flow
- P2P transfer flow

### 3. USSD Simulator
```bash
# Use Africa's Talking USSD simulator
# Or build custom simulator
curl -X POST http://localhost:8081/ussd/session \
  -d "sessionId=123&phoneNumber=+254712345678&text=*123*456%231"
```

### 4. Load Testing
- Concurrent USSD sessions
- High-volume SMS processing
- Operator API rate limits

---

## Security Considerations

1. **Transaction Limits**
   - Max $100 per transaction
   - Daily limit per user
   - Velocity checks (prevent rapid transactions)

2. **Fraud Detection**
   - Monitor unusual patterns
   - Blacklist suspicious numbers
   - Require confirmation for large amounts

3. **API Security**
   - Rate limiting
   - API key authentication
   - Request signing for operator APIs

4. **Data Protection**
   - Encrypt sensitive data
   - PCI DSS compliance (if handling cards)
   - GDPR compliance (if in EU)

---

## Monitoring & Alerts

### Key Metrics:
- Conversion volume (airtime → TXTC)
- P2P transfer volume
- Failed transactions rate
- Average conversion time
- Operator API uptime

### Alerts:
- Failed operator API calls
- High failed transaction rate
- Unusual conversion patterns
- Low liquidity in pool

---

## Cost Estimates

### Development:
- Phase 1-2: 4 weeks (core functionality)
- Phase 3: 2 weeks (USSD)
- Phase 4: 2 weeks (production hardening)
- **Total: 8 weeks**

### Infrastructure:
- VPS for new services: $20-50/month
- Operator API fees: Variable (per transaction)
- SMS costs: $0.01-0.05 per SMS
- USSD shortcode: $500-1000/month (one-time setup)

### Operator Fees:
- MTN MoMo: 1-3% per transaction
- Airtel Money: 1-3% per transaction
- Africa's Talking: $0.008 per USSD session

---

## Next Steps

1. **Choose Operator Partner**
   - Research available APIs
   - Compare fees and coverage
   - Sign up for developer accounts

2. **Set Up Development Environment**
   - Create new services (orchestrator, USSD gateway)
   - Set up mock operator
   - Extend database schema

3. **Implement Phase 1**
   - Start with rate calculator
   - Add telco integration layer
   - Test with mock data

4. **Iterate and Test**
   - Build incrementally
   - Test each component
   - Get user feedback

---

## Questions to Answer Before Starting

1. **Which operators to support first?**
   - MTN, Airtel, Vodafone?
   - Single country or multi-country?

2. **Conversion rate strategy?**
   - Fixed rate or dynamic?
   - How often to update rates?

3. **Fee structure?**
   - Platform fee percentage?
   - Who pays gas fees?

4. **USSD shortcode?**
   - Apply for own shortcode?
   - Use aggregator (Africa's Talking)?

5. **Compliance requirements?**
   - KYC needed?
   - Transaction reporting?
   - Licensing requirements?

---

## Conclusion

This architecture provides a complete, production-ready system for integrating operator balance transfers with your blockchain token system. The phased approach allows for incremental development and testing, while the modular design makes it easy to add new operators or features.

**Key Benefits:**
- ✅ Seamless airtime → TXTC conversion
- ✅ P2P transfers (airtime or tokens)
- ✅ Multiple interfaces (USSD, SMS)
- ✅ Scalable and maintainable
- ✅ Operator-agnostic design

Ready to start implementation? Let me know which phase you'd like to begin with!
