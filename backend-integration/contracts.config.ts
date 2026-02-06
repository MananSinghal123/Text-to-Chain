/**
 * Smart Contract Configuration for Text-to-Chain Backend
 * Sepolia Testnet Deployment
 */

export const SEPOLIA_CONFIG = {
  chainId: 11155111,
  network: 'sepolia',
  rpcUrl: process.env.RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
  
  contracts: {
    tokenXYZ: '0x0F0E4A3F59C3B8794A9044a0dC0155fB3C3fA223', // New - with burnFromAny
    voucherManager: '0x74B02854a16cf33416541625C100beC97cC94F01', // New - with new TokenXYZ
    uniswapV3PoolManager: '0xd9794c0daC0382c11F6Cf4a8365a8A49690Dcfc8',
    entryPointV3: '0x0084FA06Fa317D4311d865f35d62dCBcb0517355', // New - with new addresses
    uniswapV3Pool: '0xfdbf742dfc37b7ed1da429d3d7add78d99026c23', // New pool with new TokenXYZ
  },
  
  uniswap: {
    factory: '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
    positionManager: '0x1238536071E1c677A632429e3655c799b22cDA52',
    swapRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
    weth9: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  },
  
  poolInfo: {
    positionNftId: '223628',
    fee: 3000, // 0.3%
    tickSpacing: 60,
  },
  
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    baseUrl: 'https://sepolia.etherscan.io',
  },
} as const;

export type ContractAddresses = typeof SEPOLIA_CONFIG.contracts;
