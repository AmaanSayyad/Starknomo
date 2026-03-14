'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStarknomoStore } from '@/lib/store';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletConnectModal } from '@/components/wallet/WalletConnectModal';
import { ReferralSync } from './ReferralSync';
import { getStarknetProvider } from '@/lib/ctc/wallet';

function WalletSync() {
  const {
    address,
    accountType,
    isSocialWallet,
    setAddress,
    setIsConnected,
    setNetwork,
    refreshWalletBalance,
    fetchProfile,
    fetchBalance
  } = useStarknomoStore();

  useEffect(() => {
    if (accountType === 'demo') {
      if (address !== '0xDEMO_1234567890') {
        setAddress('0xDEMO_1234567890');
        setIsConnected(true);
        setNetwork('STRK');
      }
      return;
    }

    const provider = getStarknetProvider();
    const connectedAddress = provider?.selectedAddress || provider?.account?.address || null;

    if (isSocialWallet) {
      if (address) {
        setIsConnected(true);
        setNetwork('STRK');
        refreshWalletBalance();
        fetchProfile(address);
        fetchBalance(address);
      }
      return;
    }

    if (connectedAddress) {
      if (address !== connectedAddress) {
        setAddress(connectedAddress);
        setIsConnected(true);
        setNetwork('STRK');
        refreshWalletBalance();
        fetchProfile(connectedAddress);
        fetchBalance(connectedAddress);
      }
    } else if (address !== null && address !== '0xDEMO_1234567890') {
      setAddress(null);
      setIsConnected(false);
      setNetwork(null);
    }
  }, [
    address,
    accountType,
    isSocialWallet,
    setAddress,
    setIsConnected,
    setNetwork,
    refreshWalletBalance,
    fetchProfile,
    fetchBalance,
  ]);

  useEffect(() => {
    if (!address || address === '0xDEMO_1234567890' || accountType === 'demo') return;
    const interval = setInterval(() => {
      fetchBalance(address);
    }, 10000);
    return () => clearInterval(interval);
  }, [address, accountType, fetchBalance]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initializeApp = async () => {
      try {
        const { updateAllPrices, loadTargetCells, startGlobalPriceFeed } = useStarknomoStore.getState();
        await loadTargetCells().catch(console.error);
        const stopPriceFeed = startGlobalPriceFeed(updateAllPrices);
        setIsReady(true);
        return () => { if (stopPriceFeed) stopPriceFeed(); };
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WalletSync />
      <ReferralSync />
      {children}
      <WalletConnectModal />
      <ToastProvider />
    </QueryClientProvider>
  );
}

