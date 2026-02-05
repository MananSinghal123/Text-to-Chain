import { TelcoOperator } from './interfaces/TelcoOperator';
import { MTNOperator } from './operators/MTNOperator';
import { AfricasTalkingOperator } from './operators/AfricasTalkingOperator';

export class TelcoFactory {
  private static operators: Map<string, TelcoOperator> = new Map();
  
  static initialize(): void {
    if (process.env.MTN_API_KEY && process.env.MTN_API_SECRET) {
      this.operators.set('MTN', new MTNOperator({
        apiKey: process.env.MTN_API_KEY,
        apiSecret: process.env.MTN_API_SECRET,
        baseURL: process.env.MTN_BASE_URL,
        environment: process.env.MTN_ENVIRONMENT,
      }));
      console.log('✅ MTN operator initialized');
    }
    
    if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
      this.operators.set('AfricasTalking', new AfricasTalkingOperator({
        apiKey: process.env.AT_API_KEY,
        username: process.env.AT_USERNAME,
      }));
      console.log('✅ Africa\'s Talking operator initialized');
    }
    
    if (this.operators.size === 0) {
      console.warn('⚠️  No telco operators configured!');
    }
  }
  
  static getOperator(phoneNumber: string): TelcoOperator {
    const operatorCode = this.detectOperator(phoneNumber);
    
    const operator = this.operators.get(operatorCode);
    if (!operator) {
      const fallback = this.operators.get('AfricasTalking');
      if (!fallback) {
        throw new Error(`No operator configured for ${phoneNumber}`);
      }
      console.log(`Using fallback operator for ${phoneNumber}`);
      return fallback;
    }
    
    return operator;
  }
  
  private static detectOperator(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('25677') || cleaned.startsWith('25678') || cleaned.startsWith('25676')) {
      return 'MTN';
    }
    
    if (cleaned.startsWith('25670') || cleaned.startsWith('25675')) {
      return 'Airtel';
    }
    
    if (cleaned.startsWith('2547')) {
      return 'Safaricom';
    }
    
    if (cleaned.startsWith('2541')) {
      return 'Airtel';
    }
    
    return 'AfricasTalking';
  }
  
  static getAllOperators(): TelcoOperator[] {
    return Array.from(this.operators.values());
  }
  
  static isSupported(phoneNumber: string): boolean {
    try {
      this.getOperator(phoneNumber);
      return true;
    } catch {
      return false;
    }
  }
}
