/**
 * Treasury Backend Client Module
 *
 * Server-side treasury wallet operations for processing withdrawals
 * from the Starknet treasury account. Never use in client-side code.
 *
 * Uses starknet.js v7 which natively supports RPC v0.8 and V3 transactions.
 */

import { StarknetClient } from './client';
import { starknetSepolia } from './config';
import { isStarknetAddress } from './starknet-utils';

export interface WithdrawalResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class TreasuryClient {
  private client: StarknetClient;
  private treasuryAddress: string;

  constructor(privateKey?: string) {
    const key = privateKey || process.env.STARKNET_TREASURY_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
    const treasuryAddress = process.env.STARKNET_TREASURY_ADDRESS || process.env.DEPLOYER_WALLET_ADDRESS || starknetSepolia.treasuryAddress;
    // starknet.js v7 natively supports RPC v0.8 - no need to downgrade
    const serverRpc = process.env.STARKNET_SEPOLIA_RPC_SERVER || process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC || '';

    if (!key) {
      throw new Error('Treasury private key not found. Set STARKNET_TREASURY_PRIVATE_KEY.');
    }
    if (!treasuryAddress) {
      throw new Error('Treasury address not found. Set STARKNET_TREASURY_ADDRESS.');
    }
    if (!isStarknetAddress(treasuryAddress)) {
      throw new Error(`Invalid treasury address format: ${treasuryAddress}`);
    }

    this.client = new StarknetClient(serverRpc, key, treasuryAddress);
    this.treasuryAddress = treasuryAddress;
  }

  async processWithdrawal(userAddress: string, amount: bigint): Promise<WithdrawalResult> {
    const timestamp = new Date().toISOString();

    try {
      console.log(`[${timestamp}] [TreasuryClient] processWithdrawal called:`, { 
        userAddress, 
        amount,
        amountType: typeof amount,
        amountIsNull: amount === null,
        amountIsUndefined: amount === undefined
      });

      if (!isStarknetAddress(userAddress)) {
        const error = `Invalid user address: ${userAddress}`;
        console.error(`[${timestamp}] [TreasuryClient] Validation error:`, { error, userAddress });
        return { success: false, error };
      }

      // Validate amount is a valid bigint
      if (amount === undefined || amount === null) {
        const error = `Invalid withdrawal amount: amount is ${amount}`;
        console.error(`[${timestamp}] [TreasuryClient] Validation error:`, { error });
        return { success: false, error };
      }

      if (typeof amount !== 'bigint') {
        const error = `Invalid withdrawal amount type: expected bigint, got ${typeof amount}`;
        console.error(`[${timestamp}] [TreasuryClient] Validation error:`, { error });
        return { success: false, error };
      }

      if (amount <= 0n) {
        const error = 'Withdrawal amount must be greater than 0';
        console.error(`[${timestamp}] [TreasuryClient] Validation error:`, { error });
        return { success: false, error };
      }

      const treasuryBalance = await this.getTreasuryBalance();
      if (!this.validateWithdrawal(amount, treasuryBalance)) {
        const error = `Insufficient treasury balance. Have: ${this.client.formatSTRK(treasuryBalance)} STRK, Need: ${this.client.formatSTRK(amount)} STRK`;
        console.error(`[${timestamp}] [TreasuryClient] Insufficient balance:`, {
          requestedAmount: this.client.formatSTRK(amount),
          treasuryBalance: this.client.formatSTRK(treasuryBalance),
        });
        return { success: false, error };
      }

      const txHash = await this.client.sendTransaction(userAddress, amount);

      const receipt = await this.client.waitForTransaction(txHash);

      if (receipt.status === 'failed') {
        return { success: false, txHash, error: 'Transaction failed on Starknet' };
      }

      return { success: true, txHash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${timestamp}] [TreasuryClient] Withdrawal processing error:`, { errorMessage, error });
      return { success: false, error: `Withdrawal failed: ${errorMessage}` };
    }
  }

  async getTreasuryBalance(): Promise<bigint> {
    const balance = await this.client.getBalance(this.treasuryAddress);
    return balance;
  }

  validateWithdrawal(amount: bigint, treasuryBalance: bigint): boolean {
    return treasuryBalance >= amount;
  }

  getTreasuryAddress(): string {
    return this.treasuryAddress;
  }
}

let treasuryClientInstance: TreasuryClient | null = null;

export function getTreasuryClient(): TreasuryClient {
  if (!treasuryClientInstance) {
    treasuryClientInstance = new TreasuryClient();
  }
  return treasuryClientInstance;
}

