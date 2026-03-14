/**
 * POST /api/balance/payout endpoint
 * 
 * Task: 4.5 Create POST /api/balance/payout endpoint
 * Requirements: 4.1, 4.2
 * 
 * Called when a round settles and user wins.
 * Credits payout amount to user's house balance.
 * Inserts audit log entry with operation_type='bet_won'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

interface PayoutRequest {
  userAddress: string;
  payoutAmount: number;
  currency: string;
  betId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: PayoutRequest = await request.json();
    const { userAddress, payoutAmount, currency = 'STRK', betId } = body;

    // Validate required fields
    if (!userAddress || payoutAmount === undefined || payoutAmount === null || !betId) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, payoutAmount, betId' },
        { status: 400 }
      );
    }

    // Validate address using utility
    const { isValidAddress } = await import('@/lib/utils/address');
    if (!(await isValidAddress(userAddress))) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Validate payout amount is positive
    if (payoutAmount <= 0) {
      return NextResponse.json(
        { error: 'Payout amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Call credit_balance_for_payout stored procedure
    // This procedure handles:
    // - Atomic balance update with row-level locking
    // - Creating user record if it doesn't exist
    // - Inserting audit log entry with operation_type='bet_won'
    const rpcArgsV2 = {
      p_user_address: userAddress.toLowerCase(),
      p_payout_amount: payoutAmount,
      p_currency: currency,
      p_bet_id: betId,
    };

    let { data, error } = await supabaseServer.rpc('credit_balance_for_payout', rpcArgsV2);

    const isMissingRpcSignature =
      !!error &&
      (error.code === 'PGRST202' || error.message.includes('Could not find the function public.credit_balance_for_payout'));

    if (isMissingRpcSignature) {
      const rpcArgsLegacy = {
        p_user_address: userAddress.toLowerCase(),
        p_payout_amount: payoutAmount,
        p_bet_id: betId,
      };

      const retry = await supabaseServer.rpc('credit_balance_for_payout', rpcArgsLegacy);
      data = retry.data;
      error = retry.error;
    }

    // Handle database errors
    if (error) {
      console.error('Database error in payout RPC, trying fallback:', error);

      const normalizedAddress = userAddress.toLowerCase();

      const { data: balanceRow, error: balanceError } = await supabaseServer
        .from('user_balances')
        .select('balance')
        .eq('user_address', normalizedAddress)
        .eq('currency', currency)
        .maybeSingle();

      if (balanceError) {
        console.error('Fallback read balance error:', balanceError);
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again.' },
          { status: 503 }
        );
      }

      const currentBalance = Number(balanceRow?.balance || 0);
      const newBalance = Number((currentBalance + Number(payoutAmount)).toFixed(18));

      if (balanceRow) {
        const { error: updateError } = await supabaseServer
          .from('user_balances')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('user_address', normalizedAddress)
          .eq('currency', currency);

        if (updateError) {
          console.error('Fallback update balance error:', updateError);
          return NextResponse.json(
            { error: 'Service temporarily unavailable. Please try again.' },
            { status: 503 }
          );
        }
      } else {
        const { error: insertError } = await supabaseServer
          .from('user_balances')
          .insert({
            user_address: normalizedAddress,
            currency,
            balance: newBalance,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Fallback insert balance error:', insertError);
          return NextResponse.json(
            { error: 'Service temporarily unavailable. Please try again.' },
            { status: 503 }
          );
        }
      }

      const { error: auditErrorNew } = await supabaseServer
        .from('balance_audit_log')
        .insert({
          user_address: normalizedAddress,
          currency,
          operation: 'bet_credit',
          amount: Number(payoutAmount),
          balance_before: currentBalance,
          balance_after: newBalance,
          tx_hash: betId || null,
          created_at: new Date().toISOString(),
        });

      if (auditErrorNew) {
        const { error: auditErrorLegacy } = await supabaseServer
          .from('balance_audit_log')
          .insert({
            user_address: normalizedAddress,
            currency,
            operation_type: 'bet_won',
            amount: Number(payoutAmount),
            balance_before: currentBalance,
            balance_after: newBalance,
            transaction_hash: betId || null,
            created_at: new Date().toISOString(),
          });

        if (auditErrorLegacy) {
          console.error('Fallback audit log error:', auditErrorLegacy);
        }
      }

      return NextResponse.json({
        success: true,
        newBalance,
        fallback: true,
      });
    }

    // Parse the JSON result from the stored procedure
    const result = data as { success: boolean; error: string | null; new_balance: number };

    // Check if the procedure reported an error
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payout failed' },
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
    console.error('Unexpected error in POST /api/balance/payout:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
