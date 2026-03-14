import { uint256 } from 'starknet';

export const STRK_DECIMALS = 18;

export function isStarknetAddress(address: string): boolean {
  if (!address) return false;
  if (!address.startsWith('0x')) return false;
  return /^0x[0-9a-fA-F]{1,64}$/.test(address);
}

export function normalizeStarknetAddress(address: string): string {
  if (!address) return address;
  const lower = address.toLowerCase();
  if (!lower.startsWith('0x')) return lower;
  const stripped = lower.slice(2).replace(/^0+/, '');
  return `0x${stripped === '' ? '0' : stripped}`;
}

export function parseUnits(amount: string, decimals: number = STRK_DECIMALS): bigint {
  if (amount == null || amount === undefined) {
    throw new Error('Invalid STRK amount: amount is required');
  }
  const normalized = String(amount).trim();
  // Avoid scientific notation: parse and re-format (e.g. "1e-8" -> "0.00000001")
  const asNum = parseFloat(normalized);
  const fixed = !isNaN(asNum) ? asNum.toFixed(decimals) : normalized;

  console.log('[parseUnits] Called with:', { amount, normalized, fixed, decimals });

  if (!normalized || normalized === '') {
    throw new Error('Invalid STRK amount: amount is empty');
  }
  if (!/^\d+(\.\d+)?$/.test(fixed)) {
    throw new Error(`Invalid STRK amount format: ${amount}`);
  }

  const [whole, fraction = ''] = fixed.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Too many decimal places (max ${decimals})`);
  }
  if (whole === '' || whole === undefined) {
    throw new Error(`Invalid STRK amount: invalid whole part`);
  }

  const wholeBig = BigInt(whole);
  const fractionPadded = fraction.padEnd(decimals, '0');
  const fractionBig = fractionPadded ? BigInt(fractionPadded) : 0n;
  const base = 10n ** BigInt(decimals);
  const result = wholeBig * base + fractionBig;
  
  console.log('[parseUnits] Result:', { amount, result: result.toString() });
  return result;
}

export function formatUnits(amount: bigint, decimals: number = STRK_DECIMALS): string {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const fraction = amount % base;
  if (fraction === 0n) {
    return `${whole}.0`;
  }
  let fractionStr = fraction.toString().padStart(decimals, '0');
  fractionStr = fractionStr.replace(/0+$/, '');
  return `${whole}.${fractionStr}`;
}

export function toUint256(amount: bigint): { low: string; high: string } {
  if (!amount && amount !== 0n) {
    throw new Error(`Invalid amount for toUint256: ${amount}`);
  }
  if (typeof amount !== 'bigint') {
    throw new Error(`toUint256 requires a bigint, got: ${typeof amount}`);
  }
  const value = uint256.bnToUint256(amount);
  return {
    low: value.low.toString(),
    high: value.high.toString(),
  };
}

export function fromUint256(value: { low: string | undefined; high: string | undefined }): bigint {
  const low = value.low != null && value.low !== 'undefined' ? String(value.low) : '0';
  const high = value.high != null && value.high !== 'undefined' ? String(value.high) : '0';
  const bn = uint256.uint256ToBN({ low, high });
  const str = bn?.toString?.();
  if (str == null || str === 'undefined') return 0n;
  return BigInt(str);
}
