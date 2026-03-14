import React, { useCallback, useEffect, useState } from 'react';
import { useStarknomoStore } from '@/lib/store';
import { getSTRKBalance } from '@/lib/ctc/client';

export const WalletConnect: React.FC = () => {
  const {
    address,
    setConnectModalOpen,
    disconnect: disconnectStore,
    setAddress,
    setIsConnected
  } = useStarknomoStore();

  const [strkBalance, setStrkBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  }, [address]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!address) {
        setStrkBalance('0');
        return;
      }
      setIsLoadingBalance(true);
      try {
        const balance = await getSTRKBalance(address);
        setStrkBalance(balance);
        const balNum = parseFloat(balance);
        useStarknomoStore.setState({ walletBalance: isNaN(balNum) ? 0 : balNum });
      } catch (error) {
        console.error('Failed to fetch STRK balance:', error);
        setStrkBalance('0');
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [address]);

  const handleDisconnect = () => {
    disconnectStore();
    setAddress(null);
    setIsConnected(false);
  };

  const isConnected = !!address;

  return (
    <div className="flex items-center gap-3">
      {!isConnected ? (
        <button
          onClick={() => setConnectModalOpen(true)}
          data-tour="connect-button"
          className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all active:scale-95"
        >
          Connect
        </button>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="bg-white/5 border border-white/10 rounded-xl px-2 sm:px-3 py-1.5 flex items-center gap-2">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">
                STRK Balance
              </span>
              <span className="text-white text-[10px] sm:text-[11px] font-mono leading-none">
                {isLoadingBalance ? '...' : parseFloat(strkBalance).toFixed(4)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={copyAddress}
            title={copied ? 'Copied!' : 'Copy full wallet address'}
            className="bg-white/5 border border-white/10 rounded-xl px-2 sm:px-3 py-1.5 flex items-center gap-2 sm:gap-2.5 hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <div className="w-4 h-4 shrink-0">
              <img
                src="/logos/starknet-token-strk-logo.svg"
                alt="STRK"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col items-center sm:items-end">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">
                Starknet
              </span>
              <span className="text-white text-[10px] sm:text-[11px] font-mono leading-none">
                {copied ? 'Copied!' : (address ? `${address.slice(0, 4)}...${address.slice(-3)}` : '...')}
              </span>
            </div>
          </button>

          <button
            onClick={handleDisconnect}
            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};


