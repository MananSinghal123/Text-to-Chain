import dotenv from "dotenv";
import { ChainId } from "@uniswap/sdk-core";

dotenv.config();

export const CONFIG = {
  // Network
  CHAIN_ID: ChainId.SEPOLIA,
  RPC_URL: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",

  // Wallet
  PRIVATE_KEY: process.env.PRIVATE_KEY || "",

  // Contract Addresses
  POSITION_MANAGER_ADDRESS: process.env
    .POSITION_MANAGER_ADDRESS as `0x${string}`,
  STATE_VIEW_ADDRESS: process.env.STATE_VIEW_ADDRESS as `0x${string}`,
  PERMIT2_ADDRESS: process.env.PERMIT2_ADDRESS as `0x${string}`,

  // Token Configuration
  YOUR_TOKEN_ADDRESS: process.env.YOUR_TOKEN_ADDRESS as `0x${string}`,
  YOUR_TOKEN_DECIMALS: parseInt(process.env.YOUR_TOKEN_DECIMALS || "18"),
  YOUR_TOKEN_SYMBOL: process.env.YOUR_TOKEN_SYMBOL || "TKN",
  YOUR_TOKEN_NAME: process.env.YOUR_TOKEN_NAME || "YourToken",

  // Pool Configuration
  POOL_FEE: parseInt(process.env.POOL_FEE || "3000"),
  TICK_SPACING: parseInt(process.env.TICK_SPACING || "60"),

  // Transaction Settings
  SLIPPAGE_TOLERANCE: 0.5, // 0.5%
  DEADLINE_MINUTES: 20,
};

// Validation
if (!CONFIG.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY not set in .env file");
}

if (!CONFIG.YOUR_TOKEN_ADDRESS) {
  throw new Error("YOUR_TOKEN_ADDRESS not set in .env file");
}
