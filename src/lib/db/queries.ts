import { sql } from './client';
import { Fill, DailyVolume, UserDailyVolume } from '@/types/fill';
import { WalletVolume } from '@/types/wallet';
import { SyncStatus } from '@/types/api';

/**
 * Insert or update fills (batch upsert)
 */
export async function upsertFills(fills: Fill[]): Promise<void> {
  if (fills.length === 0) return;

  const values = fills.map(fill => {
    const {
      transactionTime,
      dateStr,
      userAddress,
      coin,
      side,
      px,
      sz,
      crossed,
      specialTradeType,
      tif,
      isTrigger,
      counterparty,
      closedPnl,
      twapId,
      builderFee,
      rawDataJson,
    } = fill;

    return `(
      '${transactionTime.toISOString()}',
      '${dateStr}',
      '${userAddress}',
      '${coin}',
      '${side}',
      ${px},
      ${sz},
      ${crossed},
      ${specialTradeType ? `'${specialTradeType}'` : 'NULL'},
      ${tif ? `'${tif}'` : 'NULL'},
      ${isTrigger},
      ${counterparty ? `'${counterparty}'` : 'NULL'},
      ${closedPnl ?? 'NULL'},
      ${twapId ?? 'NULL'},
      ${builderFee ?? 'NULL'},
      ${rawDataJson ? `'${JSON.stringify(rawDataJson)}'::jsonb` : 'NULL'}
    )`;
  }).join(',\n');

  const query = `
    INSERT INTO fills (
      transaction_time, date_str, user_address, coin, side, px, sz,
      crossed, special_trade_type, tif, is_trigger, counterparty,
      closed_pnl, twap_id, builder_fee, raw_data_json
    ) VALUES ${values}
    ON CONFLICT (transaction_time, user_address, coin, side, px, sz) DO NOTHING
  `;

  await sql.query(query);
}

/**
 * Get fills for a date range
 */
export async function getFillsByDateRange(
  fromDate: string,
  toDate: string
): Promise<Fill[]> {
  const result = await sql`
    SELECT
      id,
      transaction_time as "transactionTime",
      date_str as "dateStr",
      user_address as "userAddress",
      coin,
      side,
      px,
      sz,
      volume_usd as "volumeUsd",
      crossed,
      special_trade_type as "specialTradeType",
      tif,
      is_trigger as "isTrigger",
      counterparty,
      closed_pnl as "closedPnl",
      twap_id as "twapId",
      builder_fee as "builderFee",
      raw_data_json as "rawDataJson",
      created_at as "createdAt"
    FROM fills
    WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
    ORDER BY transaction_time DESC
  `;

  return result.rows as Fill[];
}

/**
 * Get daily volume aggregated by date
 */
export async function getDailyVolume(
  fromDate: string,
  toDate: string
): Promise<DailyVolume[]> {
  const result = await sql`
    SELECT
      TO_CHAR(date_str, 'YYYY-MM-DD') as "dateStr",
      SUM(volume_usd) as "volumeUsd"
    FROM fills
    WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
    GROUP BY date_str
    ORDER BY date_str ASC
  `;

  return result.rows as DailyVolume[];
}

/**
 * Get daily volume by user
 */
export async function getUserDailyVolume(
  fromDate: string,
  toDate: string
): Promise<UserDailyVolume[]> {
  const result = await sql`
    SELECT
      user_address as "userAddress",
      TO_CHAR(date_str, 'YYYY-MM-DD') as "dateStr",
      SUM(volume_usd) as "volumeUsd"
    FROM fills
    WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
    GROUP BY user_address, date_str
    ORDER BY date_str ASC, "volumeUsd" DESC
  `;

  return result.rows as UserDailyVolume[];
}

/**
 * Get top wallets by total volume
 */
export async function getTopWallets(
  fromDate: string,
  toDate: string,
  limit: number = 5
): Promise<WalletVolume[]> {
  const result = await sql`
    SELECT
      user_address as "userAddress",
      SUM(volume_usd) as "totalVolume",
      ROW_NUMBER() OVER (ORDER BY SUM(volume_usd) DESC) as rank
    FROM fills
    WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
    GROUP BY user_address
    ORDER BY "totalVolume" DESC
    LIMIT ${limit}
  `;

  return result.rows as WalletVolume[];
}

/**
 * Get wallet rank and volume
 */
export async function getWalletStats(
  walletAddress: string,
  fromDate: string,
  toDate: string
): Promise<WalletVolume | null> {
  const result = await sql`
    WITH wallet_volumes AS (
      SELECT
        user_address as "userAddress",
        SUM(volume_usd) as "totalVolume",
        ROW_NUMBER() OVER (ORDER BY SUM(volume_usd) DESC) as rank
      FROM fills
      WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
      GROUP BY user_address
    )
    SELECT * FROM wallet_volumes
    WHERE "userAddress" = ${walletAddress}
  `;

  return result.rows[0] as WalletVolume || null;
}

/**
 * Get total statistics
 */
export async function getTotalStats(fromDate: string, toDate: string) {
  const result = await sql`
    SELECT
      SUM(volume_usd) as "totalVolume",
      COUNT(*) as "totalTrades",
      COUNT(DISTINCT user_address) as "uniqueWallets",
      COUNT(DISTINCT date_str) as "tradingDays"
    FROM fills
    WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
  `;

  return result.rows[0];
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<SyncStatus | null> {
  const result = await sql`
    SELECT
      id,
      last_synced_date as "lastSyncedDate",
      last_sync_started_at as "lastSyncStartedAt",
      last_sync_completed_at as "lastSyncCompletedAt",
      last_sync_status as "lastSyncStatus",
      error_message as "errorMessage",
      updated_at as "updatedAt"
    FROM sync_status
    ORDER BY id DESC
    LIMIT 1
  `;

  return result.rows[0] as SyncStatus || null;
}

/**
 * Update sync status
 */
export async function updateSyncStatus(
  status: Partial<SyncStatus>
): Promise<void> {
  const {
    lastSyncedDate,
    lastSyncStartedAt,
    lastSyncCompletedAt,
    lastSyncStatus,
    errorMessage,
  } = status;

  await sql`
    UPDATE sync_status
    SET
      last_synced_date = COALESCE(${lastSyncedDate || null}, last_synced_date),
      last_sync_started_at = COALESCE(${lastSyncStartedAt || null}, last_sync_started_at),
      last_sync_completed_at = COALESCE(${lastSyncCompletedAt || null}, last_sync_completed_at),
      last_sync_status = COALESCE(${lastSyncStatus || null}, last_sync_status),
      error_message = ${errorMessage || null},
      updated_at = NOW()
    WHERE id = (SELECT id FROM sync_status ORDER BY id DESC LIMIT 1)
  `;
}
