# TXTC Airtime Service

SMS Airtime to TXTC Token Conversion Service - Convert mobile airtime to blockchain tokens via SMS/USSD.

## Features

- ✅ Buy TXTC tokens with mobile airtime (MTN, Airtel)
- ✅ Automatic 90% TXTC + 10% ETH distribution
- ✅ SMS command interface
- ✅ USSD menu interface (*384*1234#)
- ✅ Automatic wallet creation
- ✅ Transaction history
- ✅ Multi-operator support

## Quick Start

### 1. Install Dependencies

```bash
cd airtime-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required variables:
- `MTN_API_KEY` - MTN MoMo API key
- `MTN_API_SECRET` - MTN MoMo API secret
- `AT_API_KEY` - Africa's Talking API key
- `AT_USERNAME` - Africa's Talking username
- `CONTRACT_API_URL` - Backend integration URL (http://localhost:3000)

### 3. Run Development Server

```bash
npm run dev
```

Server starts on port 8082.

### 4. Test with Sandbox

```bash
# Test MTN API
npm run test:mtn

# Test webhook
npm run test:webhook
```

## API Endpoints

### Buy Tokens

```bash
POST /api/airtime/buy
Content-Type: application/json

{
  "phoneNumber": "+256771234567",
  "airtimeAmount": 5000
}
```

Response:
```json
{
  "success": true,
  "totalTXTC": 135,
  "txtcToUser": 121.5,
  "txtcForSwap": 13.5,
  "ethAmount": 0.0045,
  "mintTxHash": "0xabc123...",
  "swapTxHash": "0xdef456..."
}
```

### Check Balance

```bash
GET /api/balance/:phoneNumber
```

### Transaction History

```bash
GET /api/transactions/:phoneNumber?limit=10
```

### Payment Webhook (Africa's Talking)

```bash
POST /api/webhooks/payment
```

### USSD Callback

```bash
POST /api/ussd/callback
```

## SMS Commands

Users can send SMS to your shortcode:

- `BUY 5000` - Buy tokens with 5000 UGX airtime
- `BALANCE` - Check token balance
- `HISTORY` - View recent transactions

## USSD Menu

Users dial `*384*1234#`:

```
Welcome to TXTC
1. Buy Tokens
2. Check Balance
3. Transaction History
```

## Architecture

```
User (SMS/USSD)
    ↓
Africa's Talking Gateway
    ↓
Airtime Service (Port 8082)
    ├─ Telco Integration (MTN/Airtel APIs)
    ├─ Payment Orchestrator
    └─ Database (SQLite)
    ↓
Contract API (Port 3000)
    ↓
Blockchain (Sepolia)
```

## Token Distribution

When user buys with airtime:

1. **Deduct airtime** from user's phone (via MTN/Airtel API)
2. **Calculate tokens:** $10 = 1000 TXTC
3. **Mint 100%** to user wallet
4. **Split:**
   - 90% TXTC stays with user (900 TXTC)
   - 10% TXTC swapped for ETH (100 TXTC → 0.033 ETH)
5. **User receives:** 900 TXTC + 0.033 ETH (for gas fees)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  phone_number TEXT UNIQUE,
  wallet_address TEXT,
  encrypted_private_key TEXT,
  created_at DATETIME,
  last_active DATETIME
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  type TEXT,
  from_phone TEXT,
  airtime_amount REAL,
  txtc_amount REAL,
  eth_amount REAL,
  telco_tx_id TEXT,
  blockchain_tx_hash TEXT,
  status TEXT,
  created_at DATETIME
);
```

## Integration with Existing System

### SMS Handler Integration

Update `sms-request-handler/src/commands/parser.rs`:

```rust
if command.starts_with("BUY") {
    // Call airtime service
    let response = reqwest::Client::new()
        .post("http://localhost:8082/api/airtime/buy")
        .json(&json!({
            "phoneNumber": from,
            "airtimeAmount": amount
        }))
        .send()
        .await?;
    
    // Return result to user via SMS
}
```

## Testing

### Test MTN Sandbox

```bash
npm run test:mtn
```

### Test Complete Flow

```bash
# 1. Start airtime service
npm run dev

# 2. Start backend integration
cd ../backend-integration
npm start

# 3. Send test SMS (via Twilio/AT)
curl -X POST http://localhost:8082/api/airtime/buy \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+256771234567",
    "airtimeAmount": 5000
  }'
```

## Deployment

### Production Checklist

- [ ] Set strong `ENCRYPTION_KEY` (32 characters)
- [ ] Configure production MTN/Airtel credentials
- [ ] Set up Africa's Talking production account
- [ ] Configure USSD shortcode
- [ ] Set up SSL/TLS
- [ ] Configure webhook URLs
- [ ] Set transaction limits
- [ ] Enable monitoring/logging
- [ ] Set up database backups

### Deploy to VPS

```bash
# Build
npm run build

# Start with PM2
pm2 start dist/index.js --name airtime-service

# Or with systemd
sudo systemctl start airtime-service
```

## Troubleshooting

### MTN Authentication Failed
- Check `MTN_API_KEY` and `MTN_API_SECRET`
- Verify sandbox vs production environment
- Check API subscription status

### Payment Not Processing
- Check Africa's Talking webhook URL
- Verify phone number format (+256...)
- Check transaction limits
- Review logs: `tail -f airtime.log`

### Database Locked
- Only one process should access SQLite
- Consider PostgreSQL for production

## Support

- MTN API Docs: https://momodeveloper.mtn.com
- Africa's Talking: https://africastalking.com/docs
- Issues: Open GitHub issue

## License

MIT
