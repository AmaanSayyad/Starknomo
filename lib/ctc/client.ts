/**
 * Starknet Sepolia Client Module
 *
 * Provides a client wrapper for interacting with Starknet Sepolia using starknet.js.
 * Includes STRK balance operations, transaction handling, and formatting utilities.
 */

import { Account, CallData, RpcProvider, hash } from 'starknet';
import { getRpcUrl, starknetSepolia } from './config';
import { formatUnits, fromUint256, isStarknetAddress, normalizeStarknetAddress, parseUnits, toUint256 } from './starknet-utils';

/**
 * Transaction receipt interface (normalized subset)
 */
export interface TransactionReceipt {
  transactionHash: string;
  from: string;
  to?: string;
  status: 'success' | 'failed';
}

/**
 * Starknet Client for blockchain interactions
 */
export class StarknetClient {
  private provider: RpcProvider;
  private account?: Account;
  private rpcUrl: string;

  /**
   * Create a new StarknetClient instance
   * @param rpcUrl - RPC endpoint URL (defaults to config)
   * @param privateKey - Optional private key for signing transactions
   * @param accountAddress - Optional account contract address (required if privateKey is provided)
   */
  constructor(rpcUrl?: string, privateKey?: string, accountAddress?: string) {
    this.rpcUrl = rpcUrl || getRpcUrl();
    // Let RPC provide chainId - explicit chainId can cause signature mismatch
    this.provider = new RpcProvider({ nodeUrl: this.rpcUrl });

    if (privateKey || accountAddress) {
      const addr = accountAddress || process.env.STARKNET_TREASURY_ADDRESS;
      if (!privateKey || !addr) {
        throw new Error('Both private key and account address are required for signing transactions.');
      }
      // cairoVersion: "1" for OpenZeppelin Cairo 1 (default), "0" for legacy Cairo 0
      const cairoVersion = (process.env.STARKNET_TREASURY_CAIRO_VERSION as '0' | '1') || '1';
      this.account = new Account(this.provider, addr, privateKey, cairoVersion);
    }
  }

  /**
   * Get STRK balance for an address
   * @param address - Starknet wallet address
   * @returns Balance in wei (bigint)
   */
  async getBalance(address: string): Promise<bigint> {
    if (!isStarknetAddress(address)) {
      throw new Error(`Invalid Starknet address: ${address}`);
    }

    const tokenAddress = starknetSepolia.strkTokenAddress;
    const normalized = normalizeStarknetAddress(address);

    // Try Cairo 1 entrypoint first (balance_of)
    try {
      const result = await this.provider.callContract({
        contractAddress: tokenAddress,
        entrypoint: 'balance_of',
        calldata: [normalized],
      });
      // starknet.js v6: callContract returns string[] directly
      const arr = Array.isArray(result) ? result : (result as any)?.result ?? [];
      if (arr.length >= 2 && arr[0] !== undefined && arr[1] !== undefined) {
        return fromUint256({ low: String(arr[0]), high: String(arr[1]) });
      }
    } catch (err: any) {
      console.error('Cairo 1 balance fetch failed:', err);
      // fall through to try balanceOf
    }

    const legacyResult = await this.provider.callContract({
      contractAddress: tokenAddress,
      entrypoint: 'balanceOf',
      calldata: [normalized],
    });
    const legacyArr = Array.isArray(legacyResult) ? legacyResult : (legacyResult as any)?.result ?? [];
    if (legacyArr.length >= 2 && legacyArr[0] !== undefined && legacyArr[1] !== undefined) {
      return fromUint256({ low: String(legacyArr[0]), high: String(legacyArr[1]) });
    }

    throw new Error('Unexpected balance response from STRK token contract.');
  }

  /**
   * Send STRK transfer from configured account
   * @param to - Recipient address
   * @param amount - Amount in wei (bigint)
   * @returns Transaction hash
   */
  async sendTransaction(to: string, amount: bigint): Promise<string> {
    if (!this.account) {
      throw new Error('No signer configured. Private key and account address required for sending transactions.');
    }

    if (!isStarknetAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }
    if (amount <= 0n) {
      throw new Error('Transaction amount must be greater than 0');
    }

    console.log('[sendTransaction] Input validation:', { to, amount: amount.toString(), amountType: typeof amount });

    const uint256Amount = toUint256(amount);
    console.log('[sendTransaction] Converted to uint256:', { uint256Amount });

    const calldata = CallData.compile({
      recipient: normalizeStarknetAddress(to),
      amount: uint256Amount,
    });
    console.log('[sendTransaction] Compiled calldata:', { calldata });

    const call = {
      contractAddress: starknetSepolia.strkTokenAddress,
      entrypoint: 'transfer',
      calldata,
    };

    console.log('[sendTransaction] Final call object:', { call });

    // starknet.js v7 defaults to V3 transactions and RPC v0.8
    // Let the library handle fee estimation and resource bounds automatically
    try {
      console.log('[sendTransaction] Executing V3 transaction (starknet.js v7 auto fee estimation)');
      const response = await this.account.execute(call);
      return response.transaction_hash;
    } catch (autoErr: any) {
      const errMsg = String(autoErr?.message || autoErr || '');
      console.error('[sendTransaction] Auto fee estimation failed:', errMsg);

      // Fallback: use manual resource bounds if auto estimation fails
      const l2GasAmount = '0x927c0'; // 600000
      const l1GasPrice = '0x5AF3107A4000'; // 100e12
      console.log('[sendTransaction] Retrying with manual resource bounds');
      const response = await this.account.execute(call, { resourceBounds: {
        l2_gas: { max_amount: l2GasAmount, max_price_per_unit: l1GasPrice },
        l1_gas: { max_amount: l2GasAmount, max_price_per_unit: l1GasPrice },
        l1_data_gas: { max_amount: l2GasAmount, max_price_per_unit: l1GasPrice },
      }});
      return response.transaction_hash;
    }
  }

  /**
   * Wait for a transaction receipt
   * @param txHash - Transaction hash
   * @returns Receipt with status
   */
  async waitForTransaction(txHash: string): Promise<TransactionReceipt> {
    const receipt = await this.provider.waitForTransaction(txHash) as any;
    const status =
      receipt?.execution_status === 'SUCCEEDED' || 
      receipt?.finality_status === 'ACCEPTED_ON_L2' || 
      receipt?.finality_status === 'ACCEPTED_ON_L1'
        ? 'success'
        : 'failed';

    return {
      transactionHash: txHash,
      from: normalizeStarknetAddress(receipt?.sender_address || receipt?.account_address || ''),
      to: undefined,
      status,
    };
  }

  /**
   * Verify a STRK transfer to the treasury from a user
   * @param txHash - Transaction hash
   * @param fromAddress - Expected sender address
   * @param toAddress - Expected recipient address (treasury)
   * @param amount - Expected amount in wei
   */
  async verifySTRKTransfer(txHash: string, fromAddress: string, toAddress: string, amount: bigint): Promise<boolean> {
    const receipt = await this.provider.getTransactionReceipt(txHash) as any;
    const tokenAddress = normalizeStarknetAddress(starknetSepolia.strkTokenAddress);
    const selector = hash.getSelectorFromName('Transfer');

    const expectedFrom = normalizeStarknetAddress(fromAddress);
    const expectedTo = normalizeStarknetAddress(toAddress);

    for (const event of receipt.events || []) {
      const eventFrom = normalizeStarknetAddress(event.from_address || '');
      if (eventFrom !== tokenAddress) continue;
      if (!event.keys || event.keys.length < 3) continue;
      if (normalizeStarknetAddress(event.keys[0]) !== normalizeStarknetAddress(selector)) continue;

      const fromKey = normalizeStarknetAddress(event.keys[1]);
      const toKey = normalizeStarknetAddress(event.keys[2]);
      if (fromKey !== expectedFrom || toKey !== expectedTo) continue;

      if (!event.data || event.data.length < 2) continue;
      const transferred = fromUint256({ low: event.data[0], high: event.data[1] });
      if (transferred === amount) {
        return true;
      }
    }

    return false;
  }

  /**
   * Format STRK amount from wei to human-readable string (18 decimals)
   */
  formatSTRK(amount: bigint): string {
    return formatUnits(amount, 18);
  }

  /**
   * Parse STRK amount from string to wei (18 decimals)
   */
  parseSTRK(amount: string): bigint {
    return parseUnits(amount, 18);
  }
}

let clientInstance: StarknetClient | null = null;

export function getStarknetClient(privateKey?: string, accountAddress?: string): StarknetClient {
  if (!clientInstance || (privateKey && !clientInstance['account'])) {
    clientInstance = new StarknetClient(undefined, privateKey, accountAddress);
  }
  return clientInstance;
}

export async function getSTRKBalance(address: string): Promise<string> {
  const client = getStarknetClient();
  const balance = await client.getBalance(address);
  return client.formatSTRK(balance);
}

export async function getTreasurySTRKBalance(): Promise<string> {
  const treasury = process.env.STARKNET_TREASURY_ADDRESS || starknetSepolia.treasuryAddress;
  if (!treasury) {
    throw new Error('Treasury address not configured.');
  }
  return getSTRKBalance(treasury);
}
