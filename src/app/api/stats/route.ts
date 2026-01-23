import { NextRequest, NextResponse } from 'next/server';
import { calculateRankings } from '@/lib/analytics/ranking';

// Force dynamic rendering - disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/stats
 * Returns statistics and rankings
 *
 * Query params:
 * - from: Start date (YYYY-MM-DD)
 * - to: End date (YYYY-MM-DD)
 * - wallet: Optional custom wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const customWallet = searchParams.get('wallet');

    // Validate required params
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Missing required params: from, to' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    console.log(`Fetching stats from ${fromDate} to ${toDate}`);
    if (customWallet) {
      console.log(`Custom wallet: ${customWallet}`);
    }

    // Calculate rankings and stats
    const stats = await calculateRankings(
      fromDate,
      toDate,
      customWallet || undefined
    );

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
