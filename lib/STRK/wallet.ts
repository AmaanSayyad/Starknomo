/**
 * Starknet Wallet Provider
 * 
 * Starknet.js ile cüzdan bağlantısını yönetir
 */

import { RpcProvider, Account } from 'starknet';

let starknetProvider: any = null;
let selectedAccount: Account | null = null;

/**
 * Starknet RPC Provider'ı başlat
 */
export function initializeStarknetProvider() {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC || 
                   'https://free-rpc.nethermind.io/sepolia-juno';
    
    starknetProvider = new RpcProvider({
      nodeUrl: rpcUrl,
    });
    
    return starknetProvider;
  } catch (error) {
    console.error('Failed to initialize Starknet provider:', error);
    return null;
  }
}

/**
 * Starknet Provider'ı al
 */
export function getStarknetProvider() {
  if (!starknetProvider) {
    initializeStarknetProvider();
  }
  
  return starknetProvider;
}

/**
 * Cüzdan adresini al
 */
export function getWalletAddress(): string | null {
  try {
    // Browser'da window.starknet varsa kullan
    if (typeof window !== 'undefined' && (window as any).starknet) {
      return (window as any).starknet.selectedAddress || null;
    }
    return null;
  } catch (error) {
    console.error('Failed to get wallet address:', error);
    return null;
  }
}

/**
 * Cüzdan bağlı mı kontrol et
 */
export function isWalletConnected(): boolean {
  try {
    if (typeof window !== 'undefined' && (window as any).starknet) {
      return !!(window as any).starknet.selectedAddress;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Cüzdan bağla
 */
export async function connectWallet() {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection only works in browser');
    }

    const starknet = (window as any).starknet;
    if (!starknet) {
      throw new Error('Starknet wallet not found. Please install Braavos or Argent X');
    }

    await starknet.enable();
    return starknet.selectedAddress;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    throw error;
  }
}

/**
 * Cüzdan bağlantısını kes
 */
export async function disconnectWallet() {
  try {
    if (typeof window === 'undefined') return;

    const starknet = (window as any).starknet;
    if (starknet && starknet.disable) {
      await starknet.disable();
    }
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
  }
}

/**
 * Account'u al
 */
export function getAccount(): Account | null {
  return selectedAccount;
}

/**
 * Account'u ayarla
 */
export function setAccount(account: Account | null) {
  selectedAccount = account;
}

/**
 * Cüzdan ağını kontrol et
 */
export function getNetworkId(): string {
  return process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID || 'SN_SEPOLIA';
}

/**
 * RPC URL'i al
 */
export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC || 
         'https://free-rpc.nethermind.io/sepolia-juno';
}

/**
 * Explorer URL'i al
 */
export function getExplorerUrl(): string {
  return process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_EXPLORER || 
         'https://sepolia.voyager.online';
}

/**
 * Treasury adresini al
 */
export function getTreasuryAddress(): string {
  return process.env.NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS || '';
}

/**
 * Cüzdan bilgilerini al
 */
export function getWalletInfo() {
  return {
    address: getWalletAddress(),
    isConnected: isWalletConnected(),
    networkId: getNetworkId(),
    rpcUrl: getRpcUrl(),
    explorerUrl: getExplorerUrl(),
    treasuryAddress: getTreasuryAddress(),
  };
}
