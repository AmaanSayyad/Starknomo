import { StarkZap } from 'starkzap';
import { starknetSepolia } from './ctc/config';

/**
 * Starkzap SDK Instance (Cartridge / Social Login)
 *
 * Use Cartridge's Sepolia RPC for Starkzap. The Cartridge stack sends block ids
 * (e.g. pre_confirmed, pending) that many RPCs (dRPC, Alchemy) reject with
 * "Invalid block id" or "unknown block tag". Cartridge's RPC supports these,
 * so Social Login deposits work reliably.
 *
 * The rest of the app (balance, API) still uses NEXT_PUBLIC_STARKNET_SEPOLIA_RPC.
 */
const CARTRIDGE_SEPOLIA_RPC = 'https://api.cartridge.gg/x/starknet/sepolia/rpc/v0_9';

export const starkzap = new StarkZap({
  network: "sepolia",
  rpcUrl: CARTRIDGE_SEPOLIA_RPC,
});
/**
 * Configuration for the Cartridge Controller (Embedded Wallet)
 * Defines the allowed methods for gasless (sponsored) transactions
 */
export const starkzapConfig = {
  // Rely on default Cartridge URL for the network
  policies: [
    {
      target: starknetSepolia.strkTokenAddress,
      method: "transfer",
      description: "Allow transferring STRK for deposits"
    }
  ]
};
