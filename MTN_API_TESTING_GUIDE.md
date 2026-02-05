# MTN API Testing Guide & Airtel API Access

## 🎯 Overview

This guide covers:
1. How to test your MTN API credentials
2. MTN API integration examples
3. How to get Airtel API business access
4. Testing both operators in your system

---

## 📱 MTN API Testing

### Prerequisites

You should have received from MTN:
- **API Key** (or Client ID)
- **API Secret** (or Client Secret)
- **Base URL** (e.g., `https://proxy.momoapi.mtn.com` or country-specific)
- **Product** (Collections, Disbursements, or Remittances)
- **Environment** (Sandbox or Production)

### Step 1: Test Authentication

MTN uses OAuth 2.0. First, get an access token:

```bash
#!/bin/bash
# test-mtn-auth.sh

# Your MTN credentials
MTN_API_KEY="your_api_key_here"
MTN_API_SECRET="your_api_secret_here"
MTN_BASE_URL="https://sandbox.momodeveloper.mtn.com"

# Get access token
echo "🔐 Testing MTN Authentication..."

TOKEN_RESPONSE=$(curl -X POST \
  "${MTN_BASE_URL}/collection/token/" \
  -H "Ocp-Apim-Subscription-Key: ${MTN_API_KEY}" \
  -u "${MTN_API_KEY}:${MTN_API_SECRET}" \
  -H "Content-Type: application/json")

echo "Response: ${TOKEN_RESPONSE}"

# Extract token
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Authentication successful!"
  echo "Access Token: ${ACCESS_TOKEN:0:20}..."
else
  echo "❌ Authentication failed!"
  echo "Full response: ${TOKEN_RESPONSE}"
fi
```

### Step 2: Test Account Balance Check

```bash
#!/bin/bash
# test-mtn-balance.sh

MTN_API_KEY="your_api_key_here"
MTN_BASE_URL="https://sandbox.momodeveloper.mtn.com"
ACCESS_TOKEN="your_access_token_from_step1"

echo "💰 Checking MTN Account Balance..."

BALANCE_RESPONSE=$(curl -X GET \
  "${MTN_BASE_URL}/collection/v1_0/account/balance" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Target-Environment: sandbox" \
  -H "Ocp-Apim-Subscription-Key: ${MTN_API_KEY}")

echo "Balance Response: ${BALANCE_RESPONSE}"
```

### Step 3: Test Request to Pay (Deduct Airtime)

```bash
#!/bin/bash
# test-mtn-request-to-pay.sh

MTN_API_KEY="your_api_key_here"
MTN_BASE_URL="https://sandbox.momodeveloper.mtn.com"
ACCESS_TOKEN="your_access_token"

# Generate unique reference ID
REFERENCE_ID=$(uuidgen)

echo "💸 Testing Request to Pay..."
echo "Reference ID: ${REFERENCE_ID}"

# Request payment from user
REQUEST_RESPONSE=$(curl -X POST \
  "${MTN_BASE_URL}/collection/v1_0/requesttopay" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Reference-Id: ${REFERENCE_ID}" \
  -H "X-Target-Environment: sandbox" \
  -H "Ocp-Apim-Subscription-Key: ${MTN_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "100",
    "currency": "EUR",
    "externalId": "123456",
    "payer": {
      "partyIdType": "MSISDN",
      "partyId": "46733123450"
    },
    "payerMessage": "Payment for TXTC tokens",
    "payeeNote": "Token purchase"
  }')

echo "Request Response: ${REQUEST_RESPONSE}"

# Wait a moment for processing
sleep 3

# Check transaction status
echo "🔍 Checking transaction status..."

STATUS_RESPONSE=$(curl -X GET \
  "${MTN_BASE_URL}/collection/v1_0/requesttopay/${REFERENCE_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-Target-Environment: sandbox" \
  -H "Ocp-Apim-Subscription-Key: ${MTN_API_KEY}")

echo "Status Response: ${STATUS_RESPONSE}"
```

### Step 4: Node.js Integration Test

```javascript
// test-mtn-api.js

const axios = require('axios');
const { v4: uuidgen } = require('uuid');

class MTNAPITester {
  constructor(apiKey, apiSecret, baseURL = 'https://sandbox.momodeveloper.mtn.com') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseURL = baseURL;
    this.accessToken = null;
  }

  async authenticate() {
    console.log('🔐 Authenticating with MTN API...');
    
    try {
      const response = await axios.post(
        `${this.baseURL}/collection/token/`,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
        }
      );
      
      this.accessToken = response.data.access_token;
      console.log('✅ Authentication successful!');
      console.log(`Token: ${this.accessToken.substring(0, 20)}...`);
      
      return this.accessToken;
    } catch (error) {
      console.error('❌ Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkBalance() {
    console.log('\n💰 Checking account balance...');
    
    try {
      const response = await axios.get(
        `${this.baseURL}/collection/v1_0/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
        }
      );
      
      console.log('✅ Balance retrieved:');
      console.log(`   Available: ${response.data.availableBalance} ${response.data.currency}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Balance check failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async requestToPay(phoneNumber, amount, currency = 'EUR') {
    console.log(`\n💸 Requesting payment: ${amount} ${currency} from ${phoneNumber}...`);
    
    const referenceId = uuidgen();
    
    try {
      // Initiate payment request
      await axios.post(
        `${this.baseURL}/collection/v1_0/requesttopay`,
        {
          amount: amount.toString(),
          currency: currency,
          externalId: Date.now().toString(),
          payer: {
            partyIdType: 'MSISDN',
            partyId: phoneNumber,
          },
          payerMessage: 'Payment for TXTC tokens',
          payeeNote: 'Token purchase',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log(`✅ Payment request initiated. Reference: ${referenceId}`);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check status
      const status = await this.checkTransactionStatus(referenceId);
      
      return { referenceId, status };
    } catch (error) {
      console.error('❌ Payment request failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async checkTransactionStatus(referenceId) {
    console.log(`\n🔍 Checking transaction status for ${referenceId}...`);
    
    try {
      const response = await axios.get(
        `${this.baseURL}/collection/v1_0/requesttopay/${referenceId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
        }
      );
      
      console.log('✅ Transaction status:');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Amount: ${response.data.amount} ${response.data.currency}`);
      console.log(`   Reason: ${response.data.reason || 'N/A'}`);
      
      return response.data;
    } catch (error) {
      console.error('❌ Status check failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async validateAccountHolder(phoneNumber) {
    console.log(`\n✓ Validating account holder: ${phoneNumber}...`);
    
    try {
      const response = await axios.get(
        `${this.baseURL}/collection/v1_0/accountholder/msisdn/${phoneNumber}/active`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Target-Environment': 'sandbox',
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
        }
      );
      
      console.log(`✅ Account is ${response.data.result ? 'ACTIVE' : 'INACTIVE'}`);
      
      return response.data.result;
    } catch (error) {
      console.error('❌ Validation failed:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Run tests
async function runTests() {
  // Replace with your actual credentials
  const tester = new MTNAPITester(
    process.env.MTN_API_KEY || 'your_api_key',
    process.env.MTN_API_SECRET || 'your_api_secret'
  );

  try {
    // Test 1: Authentication
    await tester.authenticate();
    
    // Test 2: Check Balance
    await tester.checkBalance();
    
    // Test 3: Validate Account
    await tester.validateAccountHolder('46733123450'); // Sandbox test number
    
    // Test 4: Request Payment
    await tester.requestToPay('46733123450', 100, 'EUR');
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = MTNAPITester;
```

### Step 5: Test with Real Phone Numbers (Production)

**⚠️ Important:** Sandbox uses test numbers. For production:

```javascript
// Production configuration
const productionTester = new MTNAPITester(
  process.env.MTN_PROD_API_KEY,
  process.env.MTN_PROD_API_SECRET,
  'https://proxy.momoapi.mtn.com' // Production URL
);

// Use real phone numbers (must be MTN subscribers)
await productionTester.requestToPay('+256771234567', 5000, 'UGX');
```

---

## 🔧 Common MTN API Issues & Solutions

### Issue 1: "Invalid Subscription Key"

**Problem:** API key not recognized  
**Solution:**
- Verify you're using the correct key for the environment (sandbox vs production)
- Check if key is active in MTN Developer Portal
- Ensure no extra spaces in the key

### Issue 2: "401 Unauthorized"

**Problem:** Authentication failed  
**Solution:**
```javascript
// Make sure you're using Basic Auth correctly
const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
headers['Authorization'] = `Basic ${auth}`;
```

### Issue 3: "Target environment header is required"

**Problem:** Missing X-Target-Environment header  
**Solution:**
```javascript
headers['X-Target-Environment'] = 'sandbox'; // or 'production'
```

### Issue 4: "Transaction failed"

**Problem:** Payment request rejected  
**Reasons:**
- Insufficient balance (user doesn't have enough airtime)
- Invalid phone number
- User canceled the payment
- Network timeout

**Solution:**
```javascript
// Always check transaction status
const status = await checkTransactionStatus(referenceId);
if (status.status === 'FAILED') {
  console.log('Failure reason:', status.reason);
  // Handle refund or retry logic
}
```

---

## 📞 Airtel API Business Access

### How to Get Airtel API Access

#### Option 1: Direct Airtel Partnership (Recommended for Scale)

**Step 1: Contact Airtel Business**

**Uganda:**
- Website: https://www.airtel.co.ug/business
- Email: business@ug.airtel.com
- Phone: +256 200 100 100

**Kenya:**
- Website: https://www.airtel.co.ke/business
- Email: business@ke.airtel.com
- Phone: +254 730 100 100

**Nigeria:**
- Website: https://www.airtel.com.ng/business
- Email: business@ng.airtel.com
- Phone: +234 111 111 1111

**Step 2: Submit Application**

Required documents:
- ✅ Business registration certificate
- ✅ Tax identification number
- ✅ Director's ID/passport
- ✅ Business plan/use case
- ✅ Bank account details
- ✅ Technical integration plan

**Step 3: Technical Integration Meeting**

Airtel will:
- Review your use case
- Provide API documentation
- Assign integration support engineer
- Set up sandbox environment

**Step 4: Sandbox Testing**

You'll receive:
- Sandbox API credentials
- Test phone numbers
- API documentation
- Integration timeline (usually 2-4 weeks)

**Step 5: Go Live**

After successful testing:
- Security audit
- Production credentials
- Commercial agreement (revenue share or fixed fees)
- Launch support

**Timeline:** 4-8 weeks  
**Cost:** Usually free API access, but revenue share (1-3%) or monthly fees

#### Option 2: Use Aggregator (Faster, Easier)

**Africa's Talking** (Supports Airtel + MTN + others)

**Pros:**
- ✅ Single API for multiple operators
- ✅ Quick setup (1-2 days)
- ✅ No direct operator negotiations
- ✅ Built-in fallbacks

**Cons:**
- ❌ Higher fees (2-3% vs 1% direct)
- ❌ Less control
- ❌ Shared infrastructure

**Setup:**
```bash
# 1. Sign up at https://africastalking.com
# 2. Get API key
# 3. Start using immediately

npm install africastalking

# Test
const AfricasTalking = require('africastalking')({
  apiKey: 'YOUR_API_KEY',
  username: 'YOUR_USERNAME',
});

const payments = AfricasTalking.PAYMENTS;

// Works with Airtel, MTN, Safaricom, etc.
payments.mobileCheckout({
  productName: 'TXTC',
  phoneNumber: '+256701234567', // Airtel number
  currencyCode: 'UGX',
  amount: 5000,
}).then(console.log);
```

#### Option 3: Flutterwave (Alternative Aggregator)

**Setup:**
```bash
npm install flutterwave-node-v3

const Flutterwave = require('flutterwave-node-v3');
const flw = new Flutterwave(PUBLIC_KEY, SECRET_KEY);

// Mobile money payment (supports Airtel)
const payload = {
  tx_ref: 'MC-' + Date.now(),
  amount: 10,
  currency: 'UGX',
  network: 'AIRTELMONEY',
  phone_number: '0701234567',
  email: 'user@example.com',
};

flw.MobileMoney.uganda(payload).then(console.log);
```

---

## 🧪 Testing Both MTN and Airtel

### Unified Testing Script

```javascript
// test-both-operators.js

const MTNAPITester = require('./test-mtn-api');
const AfricasTalking = require('africastalking');

class MultiOperatorTester {
  constructor() {
    // MTN Direct API
    this.mtn = new MTNAPITester(
      process.env.MTN_API_KEY,
      process.env.MTN_API_SECRET
    );
    
    // Africa's Talking (for Airtel)
    this.at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });
  }

  detectOperator(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Uganda
    if (cleaned.startsWith('25677') || cleaned.startsWith('25678')) {
      return 'MTN_UG';
    }
    if (cleaned.startsWith('25670') || cleaned.startsWith('25675')) {
      return 'AIRTEL_UG';
    }
    
    // Kenya
    if (cleaned.startsWith('2547')) {
      return 'SAFARICOM_KE';
    }
    if (cleaned.startsWith('2541')) {
      return 'AIRTEL_KE';
    }
    
    return 'UNKNOWN';
  }

  async testPayment(phoneNumber, amount, currency) {
    const operator = this.detectOperator(phoneNumber);
    
    console.log(`\n📱 Testing payment for ${operator}: ${phoneNumber}`);
    
    if (operator.startsWith('MTN')) {
      return await this.testMTN(phoneNumber, amount, currency);
    } else if (operator.startsWith('AIRTEL')) {
      return await this.testAirtel(phoneNumber, amount, currency);
    } else {
      throw new Error('Unsupported operator');
    }
  }

  async testMTN(phoneNumber, amount, currency) {
    console.log('Using MTN Direct API...');
    
    await this.mtn.authenticate();
    const result = await this.mtn.requestToPay(phoneNumber, amount, currency);
    
    return {
      operator: 'MTN',
      success: result.status.status === 'SUCCESSFUL',
      transactionId: result.referenceId,
      status: result.status,
    };
  }

  async testAirtel(phoneNumber, amount, currency) {
    console.log('Using Africa\'s Talking API...');
    
    const result = await this.at.PAYMENTS.mobileCheckout({
      productName: 'TXTC',
      phoneNumber: phoneNumber,
      currencyCode: currency,
      amount: amount,
      metadata: {
        operator: 'AIRTEL',
        test: true,
      },
    });
    
    return {
      operator: 'AIRTEL',
      success: result.status === 'Success',
      transactionId: result.transactionId,
      status: result,
    };
  }
}

// Run tests
async function runMultiOperatorTests() {
  const tester = new MultiOperatorTester();
  
  const testCases = [
    { phone: '+256771234567', amount: 5000, currency: 'UGX' }, // MTN Uganda
    { phone: '+256701234567', amount: 5000, currency: 'UGX' }, // Airtel Uganda
  ];
  
  for (const test of testCases) {
    try {
      const result = await tester.testPayment(test.phone, test.amount, test.currency);
      console.log('✅ Test result:', result);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

runMultiOperatorTests();
```

---

## 📊 Comparison: Direct API vs Aggregator

| Feature | MTN Direct API | Airtel Direct API | Africa's Talking | Flutterwave |
|---------|---------------|-------------------|------------------|-------------|
| **Setup Time** | 4-8 weeks | 4-8 weeks | 1-2 days | 1-2 days |
| **Transaction Fee** | 1-2% | 1-2% | 2-3% | 3-5% |
| **Operators Supported** | MTN only | Airtel only | All major | All major |
| **Technical Support** | Limited | Limited | Excellent | Good |
| **Documentation** | Good | Fair | Excellent | Excellent |
| **Sandbox** | Yes | Yes | Yes | Yes |
| **Best For** | High volume MTN | High volume Airtel | MVP/Testing | Quick launch |

---

## 🎯 Recommended Approach

### For Your Current Situation:

**Phase 1: Test MTN API (Now)**
1. Use the test scripts above
2. Verify authentication works
3. Test with sandbox numbers
4. Test with real MTN numbers (small amounts)

**Phase 2: Add Airtel via Aggregator (Week 2)**
1. Sign up for Africa's Talking
2. Get API credentials
3. Test with Airtel numbers
4. Compare costs vs direct API

**Phase 3: Evaluate Direct Airtel (Month 2-3)**
1. If volume is high (>$10k/month), apply for direct API
2. Negotiate better rates
3. Migrate from aggregator

### Cost Analysis Example:

**Scenario:** $50,000/month transaction volume

**Option A: All via Aggregator**
- Fee: 3% = $1,500/month
- Setup: $0
- Time: 1 week

**Option B: MTN Direct + Airtel Aggregator**
- MTN (60% volume): 1.5% on $30k = $450
- Airtel (40% via AT): 3% on $20k = $600
- Total: $1,050/month
- Savings: $450/month

**Option C: Both Direct APIs**
- MTN: 1.5% on $30k = $450
- Airtel: 1.5% on $20k = $300
- Total: $750/month
- Savings: $750/month
- But: 8 weeks setup, more complexity

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install axios uuid africastalking flutterwave-node-v3

# Set environment variables
export MTN_API_KEY="your_mtn_key"
export MTN_API_SECRET="your_mtn_secret"
export AT_API_KEY="your_at_key"
export AT_USERNAME="your_at_username"

# Run MTN test
node test-mtn-api.js

# Run multi-operator test
node test-both-operators.js
```

---

## 📞 Support Contacts

**MTN Developer Support:**
- Portal: https://momodeveloper.mtn.com
- Email: api@mtn.com
- Slack: MTN MoMo Developer Community

**Airtel Business:**
- Uganda: business@ug.airtel.com
- Kenya: business@ke.airtel.com

**Africa's Talking:**
- Support: https://help.africastalking.com
- Email: support@africastalking.com
- Slack: Africa's Talking Community

**Flutterwave:**
- Support: https://support.flutterwave.com
- Email: developers@flutterwavego.com

---

## ✅ Next Steps

1. **Test your MTN API** using the scripts above
2. **Sign up for Africa's Talking** to test Airtel
3. **Run the multi-operator test** script
4. **Monitor costs** and decide on direct Airtel API later
5. **Integrate into your Text-to-Chain system**

Good luck testing! 🚀
