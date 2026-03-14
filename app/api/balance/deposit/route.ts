/**
 * POST /api/balance/deposit endpoint
 * 
 * Task: 7.2 Update deposit endpoint for Starknet
 * Requirements: 2.4
 * 
 * Called by blockchain event listener after deposit transaction.
 * Updates Supabase balance by adding deposit amount.
 * Inserts audit log entry with operation_type='deposit'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

interface DepositRequest {
  userAddress: string;
  amount: number;
  txHash: string;
  currency: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: DepositRequest = await request.json();
    const { userAddress, amount, txHash, currency = 'STRK' } = body;

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount, txHash' },
        { status: 400 }
      );
    }

    // Validate Starknet address only
    const { isValidAddress } = await import('@/lib/utils/address');
    if (!(await isValidAddress(userAddress))) {
      return NextResponse.json(
        { error: 'Invalid Starknet wallet address' },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Deposit amount must be greater than zero' },
        { status: 400 }
      );
    }

    const rpcArgsV2 = {
      p_user_address: userAddress.toLowerCase(),
      p_deposit_amount: amount,
      p_currency: currency,
      p_transaction_hash: txHash,
    };

    let { data, error } = await supabaseServer.rpc('update_balance_for_deposit', rpcArgsV2);

    const isMissingRpcSignature =
      !!error &&
      (error.code === 'PGRST202' || error.message.includes('Could not find the function public.update_balance_for_deposit'));

    if (isMissingRpcSignature) {
      const rpcArgsLegacy = {
        p_user_address: userAddress.toLowerCase(),
        p_deposit_amount: amount,
        p_transaction_hash: txHash,
      };

      const retry = await supabaseServer.rpc('update_balance_for_deposit', rpcArgsLegacy);
      data = retry.data;
      error = retry.error;
    }

    // Handle database errors
    if (error) {
      console.error('Database error in deposit RPC:', {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        userAddress,
        amount,
        txHash
      });
      return NextResponse.json(
        { error: `Database error: ${error.message}. Please ensure the stored procedure is correctly installed.` },
        { status: 503 }
      );
    }

    // Parse the JSON result from the stored procedure
    const result = data as { success: boolean; error: string | null; new_balance: number };

    // Check if the procedure reported an error
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Deposit failed' },
        { status: 400 }
      );
    }

    // Return success with new balance
    return NextResponse.json({
      success: true,
      newBalance: parseFloat(result.new_balance.toString()),
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in POST /api/balance/deposit:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
