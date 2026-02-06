/**
 * Alchemy Webhook Manager
 * Manages dynamic wallet address monitoring via Alchemy API
 */

import axios from 'axios';

interface AlchemyWebhookConfig {
  network: string;
  webhook_type: string;
  webhook_url: string;
  addresses?: string[];
}

export class AlchemyWebhookManager {
  private alchemyApiKey: string;
  private webhookId: string | null = null;

  constructor() {
    this.alchemyApiKey = process.env.ALCHEMY_API_KEY || '';
    this.webhookId = process.env.ALCHEMY_WEBHOOK_ID || null;
  }

  /**
   * Add a wallet address to the existing webhook
   */
  async addAddress(walletAddress: string): Promise<boolean> {
    if (!this.webhookId) {
      console.warn('⚠️  No webhook ID configured. Skipping address registration.');
      return false;
    }

    if (!this.alchemyApiKey) {
      console.warn('⚠️  No Alchemy API key configured. Skipping address registration.');
      return false;
    }

    try {
      console.log(`📝 Adding address to Alchemy webhook: ${walletAddress}`);

      // Use Alchemy Notify API v2
      const response = await axios.put(
        `https://dashboard.alchemy.com/api/update-webhook-addresses`,
        {
          webhook_id: this.webhookId,
          addresses_to_add: [walletAddress.toLowerCase()],
          addresses_to_remove: [],
        },
        {
          headers: {
            'X-Alchemy-Token': this.alchemyApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Address added to monitoring: ${walletAddress}`);
        return true;
      }

      console.warn(`⚠️  Unexpected response status: ${response.status}`);
      return false;
    } catch (error: any) {
      console.error('❌ Error adding address to Alchemy webhook:', error.response?.data || error.message);
      console.log('💡 You may need to add addresses manually in Alchemy dashboard for now');
      return false;
    }
  }

  /**
   * Add multiple wallet addresses at once
   */
  async addAddresses(walletAddresses: string[]): Promise<boolean> {
    if (!this.webhookId) {
      console.warn('⚠️  No webhook ID configured. Skipping address registration.');
      return false;
    }

    try {
      console.log(`📝 Adding ${walletAddresses.length} addresses to Alchemy webhook`);

      const response = await axios.put(
        `https://dashboard.alchemy.com/api/update-webhook-addresses`,
        {
          webhook_id: this.webhookId,
          addresses_to_add: walletAddresses.map(addr => addr.toLowerCase()),
          addresses_to_remove: [],
        },
        {
          headers: {
            'X-Alchemy-Token': this.alchemyApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        console.log(`✅ ${walletAddresses.length} addresses added to monitoring`);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error adding addresses to Alchemy webhook:', error.message);
      return false;
    }
  }

  /**
   * Remove a wallet address from monitoring
   */
  async removeAddress(walletAddress: string): Promise<boolean> {
    if (!this.webhookId) {
      console.warn('⚠️  No webhook ID configured.');
      return false;
    }

    try {
      console.log(`🗑️  Removing address from Alchemy webhook: ${walletAddress}`);

      const response = await axios.put(
        `https://dashboard.alchemy.com/api/update-webhook-addresses`,
        {
          webhook_id: this.webhookId,
          addresses_to_add: [],
          addresses_to_remove: [walletAddress.toLowerCase()],
        },
        {
          headers: {
            'X-Alchemy-Token': this.alchemyApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        console.log(`✅ Address removed from monitoring: ${walletAddress}`);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Error removing address from Alchemy webhook:', error.message);
      return false;
    }
  }

  /**
   * Get all addresses currently being monitored
   */
  async getMonitoredAddresses(): Promise<string[]> {
    if (!this.webhookId) {
      return [];
    }

    try {
      const response = await axios.get(
        `https://dashboard.alchemy.com/api/webhook-addresses`,
        {
          params: { webhook_id: this.webhookId },
          headers: {
            'X-Alchemy-Token': this.alchemyApiKey,
          },
        }
      );

      return response.data.addresses || [];
    } catch (error: any) {
      console.error('❌ Error fetching monitored addresses:', error.message);
      return [];
    }
  }

  /**
   * Create a new webhook (one-time setup)
   */
  async createWebhook(webhookUrl: string): Promise<string | null> {
    try {
      console.log('📝 Creating new Alchemy webhook...');

      const response = await axios.post(
        `https://dashboard.alchemy.com/api/create-webhook`,
        {
          network: 'ETH_SEPOLIA',
          webhook_type: 'ADDRESS_ACTIVITY',
          webhook_url: webhookUrl,
          addresses: [], // Start with empty, will add dynamically
        },
        {
          headers: {
            'X-Alchemy-Token': this.alchemyApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      const webhookId = response.data.data.id;
      console.log(`✅ Webhook created with ID: ${webhookId}`);
      console.log(`📝 Add this to your .env: ALCHEMY_WEBHOOK_ID=${webhookId}`);

      return webhookId;
    } catch (error: any) {
      console.error('❌ Error creating webhook:', error.message);
      return null;
    }
  }
}

// Export singleton instance
export const alchemyWebhookManager = new AlchemyWebhookManager();
