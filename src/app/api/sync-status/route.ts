import { NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/db/queries';

/**
 * GET /api/sync-status
 * Returns the last synchronization status
 */
export async function GET() {
  try {
    const syncStatus = await getSyncStatus();

    if (!syncStatus) {
      return NextResponse.json(
        { error: 'No sync status found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      lastSyncCompletedAt: syncStatus.lastSyncCompletedAt,
      lastSyncedDate: syncStatus.lastSyncedDate,
      lastSyncStatus: syncStatus.lastSyncStatus,
    });
  } catch (error) {
    console.error('Sync status API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
