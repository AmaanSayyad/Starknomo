#!/usr/bin/env tsx
/**
 * Verify Treasury Key Script
 *
 * Derives public key from STARKNET_TREASURY_PRIVATE_KEY and helps diagnose
 * "Account: invalid signature" errors. The account contract stores a public key
 * - it must match the key derived from your private key.
 *
 * Usage: npx tsx scripts/verify-treasury-key.ts
 */

import { ec } from 'starknet';

const privateKey = process.env.STARKNET_TREASURY_PRIVATE_KEY;
const address = process.env.STARKNET_TREASURY_ADDRESS;

if (!privateKey || !address) {
  console.error('Set STARKNET_TREASURY_PRIVATE_KEY and STARKNET_TREASURY_ADDRESS in .env');
  process.exit(1);
}

try {
  const pubKey = ec.starkCurve.getStarkKey(privateKey);
  console.log('Derived from your private key:');
  console.log('  Public Key:', pubKey);
  console.log('  Address (from .env):', address);
  console.log('');
  console.log('If you get "invalid signature":');
  console.log('  1. The account was deployed with a DIFFERENT private key');
  console.log('  2. Use the private key that was used when deploying the account');
  console.log('  3. If using Argent/Braavos: export the key from wallet settings');
  console.log('  4. Try STARKNET_TREASURY_CAIRO_VERSION=0 in .env (for Cairo 0 accounts)');
} catch (e) {
  console.error('Invalid private key format:', e);
  process.exit(1);
}
