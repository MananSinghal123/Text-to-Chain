import { ethers } from 'ethers';
import { SEPOLIA_CONFIG } from './contracts.config';
import { blockchainMonitor } from './blockchain-monitor';

// ENS Subdomain Registrar ABI (minimal interface)
const ENS_REGISTRAR_ABI = [
  'function isAvailable(string name) view returns (bool)',
  'function registerSubdomain(string name, address owner) external',
  'function resolve(string name) view returns (address)',
];

const ENS_REGISTRAR_ADDRESS = '0xcD057A8AbF3832e65edF5d224313c6b4e6324F76';

/**
 * ENS Service for managing ENS subdomain registration on ttcip.eth
 */
export class EnsService {
  private provider: ethers.JsonRpcProvider;
  private wallet?: ethers.Wallet;
  private contract?: ethers.Contract;
  private parentDomain: string = 'ttcip.eth';
  
  // In-memory store for registered names (fallback for when contract is not available)
  private registeredNames: Map<string, string> = new Map();

  constructor(privateKey?: string) {
    this.provider = new ethers.JsonRpcProvider(SEPOLIA_CONFIG.rpcUrl);
    
    // Only create wallet if valid private key is provided
    if (privateKey && privateKey.length > 10) {
      try {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(
          ENS_REGISTRAR_ADDRESS,
          ENS_REGISTRAR_ABI,
          this.wallet
        );
        console.log('✅ ENS wallet initialized with on-chain contract');
        console.log('📝 ENS Registrar:', ENS_REGISTRAR_ADDRESS);
      } catch (error) {
        console.warn('⚠️  ENS wallet initialization failed, running in memory-only mode');
      }
    } else {
      console.log('ℹ️  ENS service running in memory-only mode (no on-chain minting)');
    }
  }

  /**
   * Check if an ENS name is available
   */
  async checkAvailability(name: string): Promise<{
    available: boolean;
    reason?: string;
  }> {
    // Validate format
    if (name.length < 3 || name.length > 20) {
      return {
        available: false,
        reason: 'Name must be 3-20 characters',
      };
    }

    if (!/^[a-z0-9]+$/.test(name)) {
      return {
        available: false,
        reason: 'Name can only contain letters and numbers',
      };
    }

    const fullName = `${name}.${this.parentDomain}`;

    // Check on-chain if contract is available
    if (this.contract) {
      try {
        const isAvailable = await this.contract.isAvailable(name);
        if (!isAvailable) {
          return {
            available: false,
            reason: 'Name already taken',
          };
        }
      } catch (error) {
        console.error('Error checking on-chain availability:', error);
        // Fall back to in-memory check
      }
    }

    // Check in-memory store as fallback
    if (this.registeredNames.has(fullName)) {
      return {
        available: false,
        reason: 'Name already taken',
      };
    }

    return { available: true };
  }

  /**
   * Register an ENS subdomain
   */
  async registerSubdomain(
    name: string,
    walletAddress: string
  ): Promise<{
    success: boolean;
    ensName?: string;
    txHash?: string;
    error?: string;
  }> {
    try {
      // Check availability first
      const availability = await this.checkAvailability(name);
      if (!availability.available) {
        return {
          success: false,
          error: availability.reason,
        };
      }

      const fullName = `${name}.${this.parentDomain}`;

      // Mint subdomain on-chain if contract is available
      if (this.contract && this.wallet) {
        try {
          console.log(`� Minting ENS subdomain on-chain: ${fullName} → ${walletAddress}`);
          
          const tx = await this.contract.registerSubdomain(name, walletAddress);
          console.log(`⏳ Transaction submitted: ${tx.hash}`);
          // Wait for transaction confirmation
          const receipt = await tx.wait();
          console.log(`✅ ENS subdomain registered: ${name}.${this.parentDomain}`);
          console.log(`   Transaction: ${receipt?.hash}`);
          
          // Register subdomain in ENS registry
          await this.registerInENSRegistry(name, walletAddress);
          
          // Add wallet to blockchain monitoring for deposit detection
          await blockchainMonitor.addWallet(walletAddress);
          
          return {
            success: true,
            ensName: `${name}.${this.parentDomain}`,
            txHash: receipt?.hash || '',
          };
        } catch (error: any) {
          console.error('On-chain minting failed:', error);
          // Fall back to memory-only registration
        }
      }

      // Fallback: Store in memory only
      this.registeredNames.set(fullName, walletAddress);
      console.log(`📝 ENS registered (memory-only): ${fullName} → ${walletAddress}`);

      return {
        success: true,
        ensName: fullName,
        txHash: '0x' + '0'.repeat(64), // Placeholder for memory-only
      };
    } catch (error: any) {
      console.error('ENS registration error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Resolve ENS name to address
   */
  async resolveAddress(ensName: string): Promise<string | null> {
    // Extract subdomain from full name (e.g., "alice.ttcip.eth" -> "alice")
    const subdomain = ensName.replace(`.${this.parentDomain}`, '');
    
    // Check on-chain if contract is available
    if (this.contract) {
      try {
        const address = await this.contract.resolve(subdomain);
        if (address && address !== ethers.ZeroAddress) {
          return address;
        }
      } catch (error) {
        console.error('Error resolving on-chain:', error);
      }
    }
    
    // Fallback to in-memory
    return this.registeredNames.get(ensName) || null;
  }

  /**
   * Get all registered names (for testing)
   */
  getAllRegistered(): Array<{ name: string; address: string }> {
    return Array.from(this.registeredNames.entries()).map(([name, address]) => ({
      name,
      address,
    }));
  }

  /**
   * Register subdomain in ENS registry (for official ENS app visibility)
   */
  private async registerInENSRegistry(
    subdomain: string,
    owner: string
  ): Promise<void> {
    if (!this.wallet) {
      console.warn('⚠️  No wallet configured, skipping ENS registry registration');
      return;
    }

    try {
      console.log(`📝 Registering ${subdomain}.${this.parentDomain} in ENS registry...`);

      const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
      const RESOLVER_ADDRESS = ENS_REGISTRAR_ADDRESS;

      // Calculate ttcip.eth node
      const ttcipNode = ethers.namehash('ttcip.eth');
      const subdomainLabel = ethers.id(subdomain);

      // Create contract interface for ENS registry
      const ensRegistry = new ethers.Contract(
        ENS_REGISTRY,
        [
          'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl) external',
        ],
        this.wallet
      );

      // Register subdomain in ENS registry
      const tx = await ensRegistry.setSubnodeRecord(
        ttcipNode,
        subdomainLabel,
        owner,
        RESOLVER_ADDRESS,
        0
      );

      await tx.wait();
      console.log(`✅ ${subdomain}.${this.parentDomain} registered in ENS registry`);
    } catch (error: any) {
      console.error('❌ Failed to register in ENS registry:', error.message);
      // Don't throw - subdomain is still registered in our resolver
    }
  }
}

// Export singleton instance
export const ensService = new EnsService(process.env.ENS_PRIVATE_KEY);
