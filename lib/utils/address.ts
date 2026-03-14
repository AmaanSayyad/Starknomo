import { isStarknetAddress } from '@/lib/ctc/starknet-utils';

/**
 * Validates Starknet wallet addresses only.
 */
export async function isValidAddress(address: string): Promise<boolean> {
  if (!address) return false;
  return isStarknetAddress(address);
}
