import { NextRequest, NextResponse } from 'next/server';
import { aggregateVolumeData } from '@/lib/analytics/aggregator';

/**
 * GET /api/data
 * Returns aggregated volume data for charts
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

    console.log(`Fetching data from ${fromDate} to ${toDate}`);
    if (customWallet) {
      console.log(`Custom wallet: ${customWallet}`);
    }

    // Aggregate data
    const data = await aggregateVolumeData(
      fromDate,
      toDate,
      customWallet || undefined
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Data API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
