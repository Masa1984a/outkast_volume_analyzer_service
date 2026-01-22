import { NextRequest, NextResponse } from 'next/server';
import { syncBuilderFills } from '@/lib/sync/batch-processor';
import { CONFIG } from '@/lib/constants/config';

/**
 * Cron endpoint for syncing builder fills
 * Called by Vercel Cron every 4 hours
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${CONFIG.CRON_SECRET}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Cron job triggered');

    // Run sync
    const result = await syncBuilderFills();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          result,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Cron job error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
