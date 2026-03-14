/**
 * GET /api/balance/[address] endpoint
 * 
 * Task: 4.1 Create GET /api/balance/[address] endpoint
 * Requirements: 2.3
 * 
 * Returns the current house balance for a user address.
 * Handles user not found by returning 0 balance.
 * Includes error handling for database errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { address } = await params;

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'STRK';

    // Validate Starknet address only
    const { isValidAddress } = await import('@/lib/utils/address');
    if (!(await isValidAddress(address))) {
      return NextResponse.json(
        { error: 'Invalid Starknet wallet address' },
        { status: 400 }
      );
    }

    // Query user_balances table with lowercase address for consistency
    const { data, error } = await supabaseServer
      .from('user_balances')
      .select('balance, updated_at')
      .eq('user_address', address.toLowerCase())
      .eq('currency', currency)
      .single();

    // Handle database errors
    if (error) {
      // PGRST116 means "no rows found", which for a balance means 0
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          balance: 0,
          updatedAt: null,
          tier: 'free'
        });
      }

      console.error('Supabase fetch error:', error);
      return NextResponse.json(
        { error: `Supabase error: ${error.message} (Code: ${error.code})` },
        { status: 500 }
      );
    }

    // Try to fetch user_tier separately to avoid crashing if column doesn't exist
    let userTier = 'free';
    try {
      const { data: tierData } = await supabaseServer
        .from('user_balances')
        .select('user_tier')
        .eq('user_address', address.toLowerCase())
        .eq('currency', currency)
        .single();

      if (tierData && tierData.user_tier) {
        userTier = tierData.user_tier;
      }
    } catch (e) {
      // Ignore error if column doesn't exist
      console.warn('Could not fetch user_tier, defaulting to free:', e);
    }

    // Return balance and updated_at timestamp
    return NextResponse.json({
      balance: parseFloat(data.balance),
      updatedAt: data.updated_at,
      tier: userTier
    });
  } catch (error: any) {
    // Handle unexpected errors
    console.error('Unexpected error in GET /api/balance/[address]:', error);
    if (error.cause) console.error('Fetch error cause:', error.cause);
    
    return NextResponse.json(
      { error: `An error occurred: ${error.message}${error.cause ? ` (Cause: ${error.cause.message || error.cause})` : ''}` },
      { status: 500 }
    );
  }
}
