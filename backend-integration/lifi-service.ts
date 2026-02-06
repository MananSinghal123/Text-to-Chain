import axios from 'axios';
import { ethers } from 'ethers';

const LIFI_API_URL = 'https://li.quest/v1';

interface QuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  integrator: string;
  slippage?: number;
  order?: 'CHEAPEST' | 'FASTEST';
}

interface LifiQuote {
  estimate: {
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
  };
  action: {
    fromToken: { address: string };
    fromAmount: string;
    fromChainId: number;
    toChainId: number;
  };
  transactionRequest: any;
}

export class LifiService {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get a quote for token transfer (same-chain or cross-chain)
   */
  async getQuote(params: QuoteParams): Promise<LifiQuote> {
    try {
      const headers = this.apiKey ? { 'x-lifi-api-key': this.apiKey } : {};
      
      const response = await axios.get(`${LIFI_API_URL}/quote`, {
        params,
        headers,
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = errors.map((err: any) => 
          `${err.tool}: ${err.message}`
        ).join(', ');
        throw new Error(`Li.Fi error: ${errorMessages}`);
      }
      throw new Error(`Failed to get Li.Fi quote: ${error.message}`);
    }
  }

  /**
   * Check and set token allowance if needed
   */
  async checkAndSetAllowance(
    wallet: ethers.Wallet,
    tokenAddress: string,
    approvalAddress: string,
    amount: string
  ): Promise<string | null> {
    // Native token doesn't need approval
    if (tokenAddress === ethers.ZeroAddress) {
      return null;
    }

    const erc20Abi = [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ];

    const erc20 = new ethers.Contract(tokenAddress, erc20Abi, wallet);
    const walletAddress = await wallet.getAddress();
    const allowance = await erc20.allowance(walletAddress, approvalAddress);

    if (allowance < BigInt(amount)) {
      console.log(`Setting allowance for ${tokenAddress}...`);
      const tx = await erc20.approve(approvalAddress, ethers.MaxUint256);
      await tx.wait();
      console.log(`Allowance set: ${tx.hash}`);
      return tx.hash;
    }

    return null;
  }

  /**
   * Execute a transfer using Li.Fi
   */
  async executeTransfer(
    wallet: ethers.Wallet,
    fromToken: string,
    toToken: string,
    amount: string,
    toAddress: string,
    fromChain: number = 11155111, // Sepolia
    toChain: number = 11155111 // Sepolia (same-chain transfer)
  ): Promise<{ txHash: string; estimatedOutput: string }> {
    try {
      const fromAddress = await wallet.getAddress();

      console.log(`Getting Li.Fi quote for transfer...`);
      console.log(`From: ${fromAddress} on chain ${fromChain}`);
      console.log(`To: ${toAddress} on chain ${toChain}`);
      console.log(`Amount: ${amount} of token ${fromToken}`);

      // Get quote
      const quote = await this.getQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount: amount,
        fromAddress,
        toAddress,
        integrator: 'TextToChain',
        slippage: 0.005, // 0.5%
        order: 'CHEAPEST',
      });

      console.log(`Estimated output: ${quote.estimate.toAmount}`);
      console.log(`Minimum output: ${quote.estimate.toAmountMin}`);

      // Set allowance if needed
      await this.checkAndSetAllowance(
        wallet,
        quote.action.fromToken.address,
        quote.estimate.approvalAddress,
        quote.action.fromAmount
      );

      // Execute transaction
      const { from, ...txRequest } = quote.transactionRequest;
      const tx = await wallet.sendTransaction(txRequest);
      
      console.log(`Transfer TX sent: ${tx.hash}`);
      await tx.wait();
      console.log(`Transfer confirmed!`);

      return {
        txHash: tx.hash,
        estimatedOutput: quote.estimate.toAmount,
      };
    } catch (error: any) {
      console.error('Li.Fi transfer error:', error);
      throw new Error(`Failed to execute transfer: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getStatus(txHash: string, fromChain?: number, toChain?: number) {
    try {
      const response = await axios.get(`${LIFI_API_URL}/status`, {
        params: { txHash, fromChain, toChain },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }
}

// Chain name → chain ID mapping
export const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  eth: 1,
  polygon: 137,
  matic: 137,
  arbitrum: 42161,
  arb: 42161,
  optimism: 10,
  op: 10,
  base: 8453,
  avalanche: 43114,
  avax: 43114,
  bsc: 56,
  bnb: 56,
  sepolia: 11155111,
};

// Token symbol → address per chain (common tokens)
export const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    56: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  USDT: {
    1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    8453: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    56: '0x55d398326f99059fF775485246999027B3197955',
  },
  ETH: {
    1: '0x0000000000000000000000000000000000000000',
    42161: '0x0000000000000000000000000000000000000000',
    10: '0x0000000000000000000000000000000000000000',
    8453: '0x0000000000000000000000000000000000000000',
    11155111: '0x0000000000000000000000000000000000000000',
  },
  MATIC: {
    137: '0x0000000000000000000000000000000000000000',
  },
};

// Resolve chain name to chain ID
export function resolveChainId(chain: string): number | null {
  return CHAIN_IDS[chain.toLowerCase()] || null;
}

// Resolve token address on a chain
export function resolveTokenAddress(token: string, chainId: number): string | null {
  const tokenMap = TOKEN_ADDRESSES[token.toUpperCase()];
  if (!tokenMap) return null;
  return tokenMap[chainId] || null;
}

// Token decimals
export function getTokenDecimals(token: string): number {
  const upper = token.toUpperCase();
  if (upper === 'USDC' || upper === 'USDT') return 6;
  if (upper === 'ETH' || upper === 'MATIC' || upper === 'AVAX' || upper === 'BNB') return 18;
  return 18;
}

export const lifiService = new LifiService(process.env.LIFI_API_KEY);
