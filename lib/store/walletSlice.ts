/**
 * Wallet state slice for Zustand store
 * Manages wallet connection status and address (Starknet Sepolia).
 */

import { StateCreator } from "zustand";
import { CallData } from 'starknet';
import type { WalletInterface } from 'starkzap';
import { isStarknetAddress, normalizeStarknetAddress, parseUnits, toUint256 } from '@/lib/ctc/starknet-utils';
import { starknetSepolia } from '@/lib/ctc/config';

/** Starknet-only: network is always Starknet Sepolia when connected */
export type CtcNetwork = 'STRK' | null;

export interface WalletState {
  address: string | null;
  walletBalance: number;
  isConnected: boolean;
  isConnecting: boolean;
  network: CtcNetwork;
  error: string | null;
  isConnectModalOpen: boolean;
  cartridgeWallet: WalletInterface | null;
  isSocialWallet: boolean;

  connect: () => Promise<void>;
  connectSocial: () => Promise<void>;
  sendTransfer: (to: string, amount: string) => Promise<string>;
  disconnect: () => void;
  refreshWalletBalance: () => Promise<void>;
  clearError: () => void;
  setConnectModalOpen: (open: boolean) => void;

  setAddress: (address: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setNetwork: (network: CtcNetwork) => void;
}

export const createWalletSlice: StateCreator<WalletState> = (set, get) => ({
  address: null,
  walletBalance: 0,
  isConnected: false,
  isConnecting: false,
  network: null,
  error: null,
  isConnectModalOpen: false,
  cartridgeWallet: null,
  isSocialWallet: false,

  connect: async () => {
    set({ isConnecting: true, error: null });
    try {
      const { connectStarknetWallet } = await import('@/lib/ctc/wallet');
      const address = await connectStarknetWallet();
      set({ address, isConnected: true, network: 'STRK', isConnecting: false, isConnectModalOpen: false, cartridgeWallet: null, isSocialWallet: false });
    } catch (error) {
      set({ isConnecting: false, error: error instanceof Error ? error.message : String(error) });
      set({ isConnectModalOpen: true });
    }
  },

  connectSocial: async () => {
    set({ isConnecting: true, error: null });
    console.log('Starting Starkzap connection via Cartridge...');
    try {
      const { starkzap, starkzapConfig } = await import('@/lib/starkzap');
      
      // Use connectCartridge directly
      const wallet = await starkzap.connectCartridge({
        policies: starkzapConfig.policies,
      });
      console.log('Cartridge connection successful:', wallet);
      
      // Ensure the wallet is ready (deployed if needed)
      if (typeof wallet.ensureReady === 'function') {
        await wallet.ensureReady({ deploy: "if_needed" });
      }
      
      const address = wallet.address;
      set({ address, isConnected: true, network: 'STRK', isConnecting: false, isConnectModalOpen: false, cartridgeWallet: wallet, isSocialWallet: true });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const friendlyMessage = rawMessage.includes('Cartridge Controller failed to initialize')
        ? 'Social wallet could not start. Check popup/ad-blocker settings and ensure RPC is public HTTPS (not localhost/private URL).'
        : rawMessage;
      set({ isConnecting: false, error: friendlyMessage });
      set({ isConnectModalOpen: true });
      console.error('Starkzap connection failed details:', error);
    }
  },

  sendTransfer: async (to: string, amount: string) => {
    const { cartridgeWallet } = get();

    if (!isStarknetAddress(to)) {
      throw new Error(`Invalid recipient address: ${to}`);
    }

    const wei = parseUnits(amount, 18);
    if (wei <= 0n) {
      throw new Error('Transfer amount must be greater than zero');
    }

    if (cartridgeWallet) {
      const call = {
        contractAddress: starknetSepolia.strkTokenAddress,
        entrypoint: 'transfer',
        calldata: CallData.compile({
          recipient: normalizeStarknetAddress(to),
          amount: toUint256(wei),
        }),
      };

      // Try sponsored (gasless) first; fall back to user_pays if account doesn't support SNIP-9
      const runTransfer = (feeMode: 'sponsored' | 'user_pays') =>
        cartridgeWallet.execute([call], { feeMode }).then((tx) => tx.wait().then(() => tx.hash));

      const toErrorMessage = (err: unknown): string => {
        if (err instanceof Error) return err.message;
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string')
          return (err as { message: string }).message;
        if (err && typeof err === 'object' && 'data' in err) return String((err as { data: unknown }).data);
        return String(err);
      };

      try {
        return await runTransfer('sponsored');
      } catch (sponsoredError) {
        const rawMessage = toErrorMessage(sponsoredError);
        const isSnip9Incompatible = /SNIP-9|not compatible with SNIP|sponsored.*failed/i.test(rawMessage);
        if (isSnip9Incompatible) {
          try {
            return await runTransfer('user_pays');
          } catch (gasError) {
            const gasMsg = toErrorMessage(gasError);
            const isPreConfirmedRpc = /pre_confirmed|unknown block tag/i.test(gasMsg);
            if (isPreConfirmedRpc) {
              throw new Error(
                'Your RPC does not support this transaction. Use an Alchemy RPC for Cartridge/Social wallet: set NEXT_PUBLIC_STARKNET_SEPOLIA_RPC to https://starknet-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY in .env'
              );
            }
            throw new Error(`Transfer failed (this account doesn’t support gasless transfers; paying with STRK also failed): ${gasMsg}`);
          }
        }
        throw new Error(`Sponsored transfer failed: ${rawMessage}`);
      }
    }

    const { sendSTRKTransfer } = await import('@/lib/ctc/wallet');
    return sendSTRKTransfer(to, amount);
  },

  disconnect: () => {
    const state = get() as WalletState & { accountType?: 'real' | 'demo'; accessCode?: string | null };
    const accountType = state.accountType;
    void state.cartridgeWallet?.disconnect().catch((error) => {
      console.warn('Failed to disconnect social wallet cleanly:', error);
    });

    set({
      address: null,
      walletBalance: 0,
      isConnected: false,
      isConnecting: false,
      network: null,
      error: null,
      cartridgeWallet: null,
      isSocialWallet: false
    } as Partial<WalletState> as WalletState);
    const currentAccessCode = state.accessCode;
    if (accountType !== 'demo' && !currentAccessCode) {
      set({
        username: null,
        accessCode: null
      } as unknown as WalletState);
    }
  },

  refreshWalletBalance: async () => {
    const { address, isConnected } = get();
    if (!isConnected || !address) return;
    try {
      const { getSTRKBalance } = await import('@/lib/ctc/client');
      const balStr = await getSTRKBalance(address);
      const balNum = parseFloat(balStr);
      set({ walletBalance: isNaN(balNum) ? 0 : balNum });
    } catch (error) {
      console.error("Error refreshing wallet balance:", error);
    }
  },

  clearError: () => set({ error: null }),
  setConnectModalOpen: (open: boolean) => set({ isConnectModalOpen: open }),
  setAddress: (address: string | null) => set({ address }),
  setIsConnected: (connected: boolean) => set({ isConnected: connected }),

  setNetwork: (network: CtcNetwork) => set({ network }),
});
