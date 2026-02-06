# Backend Integration

TypeScript/Node.js API server that bridges the SMS handler with smart contracts, Yellow Network, and Li.Fi.

## Services

| File | Purpose |
|------|---------|
| `api-server.ts` | Express API server (Port 3000) |
| `contract-service.ts` | Smart contract interactions (swap, redeem, mint, balance) |
| `lifi-service.ts` | Li.Fi cross-chain bridge/swap + chain/token resolution |
| `ens-service.ts` | ENS subdomain registration (`*.ttcip.eth`) |
| `blockchain-monitor.ts` | Deposit detection + SMS notifications |
| `contracts.config.ts` | Contract addresses (Sepolia) |

## API Endpoints

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/redeem` | Redeem voucher code |
| GET | `/api/balance/:address` | Get TXTC + ETH balance |
| POST | `/api/swap` | Swap TXTC → ETH (Uniswap V3) |
| POST | `/api/send` | Send TXTC to address |
| POST | `/api/quote` | Get swap quote |
| GET | `/api/price` | Current TXTC price |
| GET | `/api/contracts` | Contract addresses |

### Li.Fi (Cross-Chain)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lifi/quote` | Get bridge/swap quote |
| POST | `/api/bridge` | Execute cross-chain bridge |
| GET | `/api/lifi/status/:txHash` | Check bridge tx status |
| GET | `/api/lifi/chains` | List supported chains |

### ENS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ens/check/:name` | Check name availability |
| POST | `/api/ens/register` | Register subdomain |
| GET | `/api/ens/resolve/:name` | Resolve name → address |

## Deployed Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| TokenXYZ (TXTC) | `0x0F0E4A3F59C3B8794A9044a0dC0155fB3C3fA223` |
| VoucherManager | `0x74B02854a16cf33416541625C100beC97cC94F01` |
| EntryPointV3 | `0x0084FA06Fa317D4311d865f35d62dCBcb0517355` |
| Uniswap V3 Pool | `0xfdbf742dfc37b7ed1da429d3d7add78d99026c23` |
| ENS Registrar | `0xcD057A8AbF3832e65edF5d224313c6b4e6324F76` |
| SwapRouter | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` |

## Setup

```bash
cd backend-integration
npm install
```

### Environment

```env
PRIVATE_KEY=0x...
ENS_PRIVATE_KEY=0x...
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
LIFI_API_KEY=...              # Optional
```

### Run

```bash
npm start
# or
npx ts-node api-server.ts
```

## Testing

```bash
# Health check
curl http://localhost:3000/health

# Get balance
curl http://localhost:3000/api/balance/0xYourAddress

# LiFi quote (mainnet tokens)
curl -X POST http://localhost:3000/api/lifi/quote \
  -H "Content-Type: application/json" \
  -d '{"fromChain":"polygon","toChain":"base","fromToken":"USDC","toToken":"USDC","amount":"10","userAddress":"0x..."}'

# Supported chains
curl http://localhost:3000/api/lifi/chains
```
