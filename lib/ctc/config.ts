/**
 * Starknet Sepolia Configuration
 * 
 * This module provides the network configuration for Starknet Sepolia,
 * including chain parameters, RPC endpoints, STRK token address, and treasury wallet address.
 * 
 * Environment variables are used with fallback values for development.
 */

// Import environment validation (runs on server-side only)
import './env-validation';

export interface StarknetConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  treasuryAddress: string;
  strkTokenAddress: string;
}

/**
 * Starknet Sepolia Configuration
 * 
 * Chain ID: SN_SEPOLIA (0x534e5f5345504f4c4941)
 * Native Token: STRK (18 decimals)
 * Explorer: https://sepolia.voyager.online
 * STRK Token: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
 */
export const starknetSepolia: StarknetConfig = {
  chainId: process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_CHAIN_ID || "0x534e5f5345504f4c4941",
  chainName: "Starknet Sepolia",
  nativeCurrency: {
    name: "Starknet",
    symbol: process.env.NEXT_PUBLIC_STARKNET_CURRENCY_SYMBOL || "STRK",
    decimals: Number(process.env.NEXT_PUBLIC_STARKNET_CURRENCY_DECIMALS) || 18,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC || ""
  ],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_EXPLORER || "https://sepolia.voyager.online"
  ],
  treasuryAddress: process.env.NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS || process.env.STARKNET_TREASURY_ADDRESS || "",
  strkTokenAddress: process.env.NEXT_PUBLIC_STRK_TOKEN_ADDRESS || "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
};

/**
 * Get the full Starknet Sepolia Configuration
 */
export function getStarknetConfig(): StarknetConfig {
  return starknetSepolia;
}

/**
 * Get the primary RPC URL for Starknet Sepolia
 */
export function getRpcUrl(): string {
  const url = starknetSepolia.rpcUrls[0];
  if (!url) {
    throw new Error('Missing Starknet Sepolia RPC URL. Set NEXT_PUBLIC_STARKNET_SEPOLIA_RPC.');
  }
  return url;
}

/**
 * Get the block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${starknetSepolia.blockExplorerUrls[0]}/tx/${txHash}`;
}

/**
 * Get the block explorer URL for an address
 */
export function getExplorerAddressUrl(address: string): string {
  return `${starknetSepolia.blockExplorerUrls[0]}/contract/${address}`;
}
