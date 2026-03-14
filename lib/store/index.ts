/**
 * Main Zustand store for STARKNOMO dApp
 * Combines wallet, game, and history slices
 * 
 * Note: After Starknet migration, blockchain events are handled
 * by the STRK backend client for deposit/withdrawal confirmation.
 * Game logic remains off-chain.
 */

import { create } from "zustand";
import { WalletState, createWalletSlice } from "./walletSlice";
import { GameState, createGameSlice, startPriceFeed, startGlobalPriceFeed } from "./gameSlice";
import { HistoryState, createHistorySlice, restoreBetHistory } from "./historySlice";
import { BalanceState, createBalanceSlice } from "./balanceSlice";
import { ReferralState, createReferralSlice } from "./referralSlice";
import { ProfileState, createProfileSlice } from "./profileSlice";

/**
 * Combined store type
 */
export type StarknomoStore = WalletState & GameState & HistoryState & BalanceState & ReferralState & ProfileState;

/**
 * Create the main Zustand store
 * Combines all slices into a single store
 */
export const useStarknomoStore = create<StarknomoStore>()((...args) => ({
  ...createWalletSlice(...args),
  ...createGameSlice(...args),
  ...createHistorySlice(...args),
  ...createBalanceSlice(...args),
  ...createReferralSlice(...args),
  ...createProfileSlice(...args)
}));

/**
 * Initialize the store
 * Restores sessions, loads data
 * Should be called once on app initialization
 */
export const initializeStore = async (): Promise<void> => {
  const store = useStarknomoStore.getState();

  try {
    // Restore bet history from localStorage
    restoreBetHistory((bets) => {
      useStarknomoStore.setState({ bets });
    });

    // Load target cells
    await store.loadTargetCells();

    // Fetch house balance if wallet is connected
    if (store.address) {
      await store.fetchBalance(store.address);
    }

    // Start price feed polling
    const stopPriceFeed = store.startGlobalPriceFeed(store.updateAllPrices);

    // Store cleanup function for later use
    (window as any).__starknomoCleanup = () => {
      stopPriceFeed();
    };


    console.log("STARKNOMO store initialized successfully");
  } catch (error) {
    console.error("Error initializing store:", error);
  }
};

/**
 * Cleanup function
 * Stops price feed
 * Should be called when app is unmounted
 */
export const cleanupStore = (): void => {
  if ((window as any).__starknomoCleanup) {
    (window as any).__starknomoCleanup();
    delete (window as any).__starknomoCleanup;
  }
};

/**
 * Export individual selectors for optimized re-renders
 */
export const useWalletAddress = () => useStarknomoStore(state => state.address);
export const useWalletBalance = () => useStarknomoStore(state => state.walletBalance);
export const useIsConnected = () => useStarknomoStore(state => state.isConnected);
export const useCurrentPrice = () => useStarknomoStore(state => state.currentPrice);
export const usePriceHistory = () => useStarknomoStore(state => state.priceHistory);
export const useActiveRound = () => useStarknomoStore(state => state.activeRound);
export const useTargetCells = () => useStarknomoStore(state => state.targetCells);
export const useBetHistory = () => useStarknomoStore(state => state.bets);
export const useIsPlacingBet = () => useStarknomoStore(state => state.isPlacingBet);
export const useIsSettling = () => useStarknomoStore(state => state.isSettling);
export const useHouseBalance = () => useStarknomoStore(state => state.houseBalance);
export const useIsLoadingBalance = () => useStarknomoStore(state => state.isLoading);
export const useUserTier = () => useStarknomoStore(state => state.userTier);

/**
 * Export main store hook (alias for convenience)
 */
export const useStore = useStarknomoStore;

/**
 * Export actions
 * Note: These selectors return new objects on each call, which can cause infinite loops.
 * Use direct store access (useStarknomoStore(state => state.actionName)) instead.
 */
export const useWalletActions = () => {
  const connect = useStarknomoStore(state => state.connect);
  const disconnect = useStarknomoStore(state => state.disconnect);
  const refreshWalletBalance = useStarknomoStore(state => state.refreshWalletBalance);
  return { connect, disconnect, refreshWalletBalance };
};

export const useGameActions = () => {
  const placeBet = useStarknomoStore(state => state.placeBet);
  const placeBetFromHouseBalance = useStarknomoStore(state => state.placeBetFromHouseBalance);
  const settleRound = useStarknomoStore(state => state.settleRound);
  const updatePrice = useStarknomoStore(state => state.updatePrice);
  return { placeBet, placeBetFromHouseBalance, settleRound, updatePrice };
};

export const useHistoryActions = () => {
  const fetchHistory = useStarknomoStore(state => state.fetchHistory);
  const addBet = useStarknomoStore(state => state.addBet);
  const clearHistory = useStarknomoStore(state => state.clearHistory);
  return { fetchHistory, addBet, clearHistory };
};

export const useBalanceActions = () => {
  const fetchBalance = useStarknomoStore(state => state.fetchBalance);
  const setBalance = useStarknomoStore(state => state.setBalance);
  const updateBalance = useStarknomoStore(state => state.updateBalance);
  const depositFunds = useStarknomoStore(state => state.depositFunds);
  const withdrawFunds = useStarknomoStore(state => state.withdrawFunds);
  const clearError = useStarknomoStore(state => state.clearError);
  return { fetchBalance, setBalance, updateBalance, depositFunds, withdrawFunds, clearError };
};
