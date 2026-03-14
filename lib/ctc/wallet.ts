import { CallData } from 'starknet';
import { getStarknetConfig, starknetSepolia } from './config';
import { isStarknetAddress, normalizeStarknetAddress, parseUnits, toUint256 } from './starknet-utils';

declare global {
  interface Window {
    starknet?: any;
  }
}

export function getStarknetProvider(): any | null {
  if (typeof window === 'undefined') return null;
  return window.starknet || null;
}

export async function connectStarknetWallet(): Promise<string> {
  const provider = getStarknetProvider();
  if (!provider) {
    throw new Error('No Starknet wallet found. Install Argent X or Braavos.');
  }

  if (typeof provider.enable === 'function') {
    const res = await provider.enable({ starknetVersion: 'v5' }).catch(() => provider.enable());
    const addr = res?.[0] || provider.selectedAddress || provider.account?.address;
    if (addr) return addr;
  }

  if (typeof provider.request === 'function') {
    const res =
      (await provider.request({ type: 'wallet_requestAccounts' }).catch(() =>
        provider.request({ method: 'wallet_requestAccounts' })
      )) || [];
    const addr = res?.[0] || provider.selectedAddress || provider.account?.address;
    if (addr) return addr;
  }

  const selected = provider.selectedAddress || provider.account?.address;
  if (selected) return selected;

  throw new Error('Failed to connect to Starknet wallet.');
}

export async function sendSTRKTransfer(to: string, amount: string): Promise<string> {
  const provider = getStarknetProvider();
  if (!provider) throw new Error('Starknet wallet not found.');
  if (!provider.account) throw new Error('Starknet wallet not connected.');

  if (!isStarknetAddress(to)) {
    throw new Error(`Invalid recipient address: ${to}`);
  }

  const wei = parseUnits(amount, 18);
  const call = {
    contractAddress: starknetSepolia.strkTokenAddress,
    entrypoint: 'transfer',
    calldata: CallData.compile({
      recipient: normalizeStarknetAddress(to),
      amount: toUint256(wei),
    }),
  };

  try {
    const response = await provider.account.execute(call);
    return response.transaction_hash;
  } catch (error: any) {
    const message = String(error?.message || error || '');
    const isUnsupportedVersion =
      message.includes('transaction version is not supported') ||
      message.includes('The transaction version is not supported');

    if (!isUnsupportedVersion) {
      throw error;
    }

    try {
      const response = await (provider.account as any).execute(call, undefined, { version: '0x3' });
      return response.transaction_hash;
    } catch (v3Error: any) {
      const v3Message = String(v3Error?.message || v3Error || '');
      const needsL1DataGas =
        v3Message.includes("missing field 'L1_DATA_GAS'") ||
        v3Message.includes('missing field \"L1_DATA_GAS\"');
      const unexpectedL1DataGas =
        v3Message.includes('unexpected field: "l1_data_gas"') ||
        v3Message.includes('unexpected field: \"l1_data_gas\"') ||
        v3Message.includes('unexpected field: "L1_DATA_GAS"') ||
        v3Message.includes('unexpected field: \"L1_DATA_GAS\"');

      if (!needsL1DataGas && !unexpectedL1DataGas) {
        throw v3Error;
      }

      if (needsL1DataGas) {
        try {
          const response = await (provider.account as any).execute(call, undefined, {
            version: '0x3',
            resourceBounds: {
              l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x2540be400' },
              l2_gas: { max_amount: '0x186a0', max_price_per_unit: '0x2540be400' },
              l1_data_gas: { max_amount: '0x186a0', max_price_per_unit: '0x2540be400' },
            },
          });
          return response.transaction_hash;
        } catch (v3Error2: any) {
          const v3Message2 = String(v3Error2?.message || v3Error2 || '');
          const stillUnexpectedL1DataGas =
            v3Message2.includes('unexpected field: "l1_data_gas"') ||
            v3Message2.includes('unexpected field: \"l1_data_gas\"') ||
            v3Message2.includes('unexpected field: "L1_DATA_GAS"') ||
            v3Message2.includes('unexpected field: \"L1_DATA_GAS\"');
          if (!stillUnexpectedL1DataGas) {
            throw v3Error2;
          }
        }
      }

      const response = await (provider.account as any).execute(call, undefined, {
        version: '0x3',
        resourceBounds: {
          l1_gas: { max_amount: '0x186a0', max_price_per_unit: '0x2540be400' },
          l2_gas: { max_amount: '0x186a0', max_price_per_unit: '0x2540be400' },
        },
      });
      return response.transaction_hash;
    }
  }
}

export function getNetworkName(): string {
  const cfg = getStarknetConfig();
  return cfg.chainName;
}
