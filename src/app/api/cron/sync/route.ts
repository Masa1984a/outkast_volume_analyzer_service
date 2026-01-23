import { NextRequest, NextResponse } from 'next/server';
import { syncBuilderFills } from '@/lib/sync/batch-processor';
import { CONFIG } from '@/lib/constants/config';

// Force dynamic rendering - disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Cron endpoint for syncing builder fills
 * Called by Vercel Cron every 4 hours
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  const cronStartTime = Date.now();
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${CONFIG.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Cron job triggered - Starting sync process');

    // Run sync
    const result = await syncBuilderFills();

    const elapsed = Date.now() - cronStartTime;

    if (result.success) {
      console.log(`\n✅ Cron job completed successfully in ${elapsed}ms`);
      console.log(`   Total fills inserted: ${result.totalFills}`);
      console.log(`   Dates processed: ${result.processedDates}/${result.totalDates}`);
      if (result.errors.length > 0) {
        console.log(`   ⚠️  Partial errors: ${result.errors.length}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Sync completed successfully',
        result,
        elapsed,
      });
    } else {
      console.error(`\n❌ Cron job completed with errors in ${elapsed}ms`);
      console.error(`   Errors: ${result.errors.length}`);
      result.errors.forEach((err, i) => {
        console.error(`   ${i + 1}. ${err}`);
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Sync completed with errors',
          result,
          elapsed,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const elapsed = Date.now() - cronStartTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Cron job failed in ${elapsed}ms: ${errorMsg}`);

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        elapsed,
      },
      { status: 500 }
    );
  }
}

// Allow POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
