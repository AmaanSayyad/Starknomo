/**
 * Deposit API Endpoint (Starknet Sepolia)
 *
 * 1. Validate deposit request
 * 2. Verify STRK transfer to treasury on Starknet
 * 3. Credit user house balance in Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { StarknetClient } from '@/lib/ctc/client';
import { updateHouseBalance } from '@/lib/ctc/database';
import { starknetSepolia } from '@/lib/ctc/config';
import { isStarknetAddress, parseUnits } from '@/lib/ctc/starknet-utils';

function sanitizeError(error: any): string {
  if (!error) return 'Unknown error';
  const message = error?.message || String(error);
  const lowerMessage = message.toLowerCase();
  const sensitiveKeywords = ['private', 'key', 'secret', 'password', 'mnemonic', 'seed'];
  if (sensitiveKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'An internal error occurred. Please contact support.';
  }
  return message;
}

interface DepositRequest {
  userAddress: string;
  txHash: string;
  amount: string; // STRK amount as string
}

interface DepositSuccessResponse {
  success: true;
  newBalance: string;
}

interface DepositErrorResponse {
  success: false;
  error: string;
}

type DepositResponse = DepositSuccessResponse | DepositErrorResponse;

export async function POST(request: NextRequest): Promise<NextResponse<DepositResponse>> {
  const timestamp = new Date().toISOString();

  try {
    const body: DepositRequest = await request.json();
    const { userAddress, txHash, amount } = body;

    if (!userAddress || !txHash || !amount) {
      console.error(`[${timestamp}] [Deposit API] Missing required fields`, {
        hasUserAddress: !!userAddress,
        hasTxHash: !!txHash,
        hasAmount: !!amount,
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userAddress, txHash, amount' },
        { status: 400 }
      );
    }

    if (!isStarknetAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address format' },
        { status: 400 }
      );
    }

    let amountBigInt: bigint;
    try {
      amountBigInt = parseUnits(amount, 18);
      if (amountBigInt <= 0n) {
        return NextResponse.json(
          { success: false, error: 'Deposit amount must be greater than 0' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount format' },
        { status: 400 }
      );
    }

    if (!/^0x[0-9a-fA-F]{1,64}$/.test(txHash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction hash format' },
        { status: 400 }
      );
    }

    const client = new StarknetClient();
    const treasuryAddress = starknetSepolia.treasuryAddress || process.env.STARKNET_TREASURY_ADDRESS || '';
    if (!treasuryAddress) {
      return NextResponse.json(
        { success: false, error: 'Treasury address not configured' },
        { status: 500 }
      );
    }

    try {
      await client.waitForTransaction(txHash);
    } catch (error) {
      console.error(`[${timestamp}] [Deposit API] Transaction verification failed:`, {
        txHash,
        userAddress,
        amount,
        errorMessage: sanitizeError(error),
      });
      return NextResponse.json(
        { success: false, error: 'Failed to verify transaction on Starknet. Please try again.' },
        { status: 400 }
      );
    }

    const verified = await client.verifySTRKTransfer(txHash, userAddress, treasuryAddress, amountBigInt);
    if (!verified) {
      return NextResponse.json(
        { success: false, error: 'Transaction does not match expected STRK transfer to treasury' },
        { status: 400 }
      );
    }

    const newBalance = await updateHouseBalance(
      userAddress,
      amount,
      'deposit',
      txHash
    );

    return NextResponse.json({ success: true, newBalance });
  } catch (error) {
    console.error(`[${timestamp}] [Deposit API] Unexpected error:`, sanitizeError(error));
    return NextResponse.json(
      { success: false, error: 'Deposit failed. Please try again later.' },
      { status: 500 }
    );
  }
}
