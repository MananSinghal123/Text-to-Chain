import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { CONFIG } from "../config/constants";

// Create account from private key
export const account = privateKeyToAccount(CONFIG.PRIVATE_KEY as `0x${string}`);

// Create public client for reading blockchain data
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(CONFIG.RPC_URL),
});

// Create wallet client for sending transactions
export const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(CONFIG.RPC_URL),
});

// Helper to get current block timestamp
export async function getCurrentTimestamp(): Promise<number> {
  const block = await publicClient.getBlock();
  return Number(block.timestamp);
}

// Helper to calculate deadline
export async function getDeadline(
  minutesFromNow: number = 20,
): Promise<bigint> {
  const currentTimestamp = await getCurrentTimestamp();
  return BigInt(currentTimestamp + minutesFromNow * 60);
}

// Helper to format token amounts for display
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return (Number(amount) / 10 ** decimals).toFixed(decimals > 6 ? 6 : decimals);
}

// Helper to parse token amounts from human-readable strings
export function parseTokenAmount(amount: string, decimals: number): bigint {
  return BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));
}
