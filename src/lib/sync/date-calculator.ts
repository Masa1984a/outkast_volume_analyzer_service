import { format, subDays, addDays } from 'date-fns';

/**
 * Calculate the date range for synchronization
 * Returns dates from lastSyncedDate + 1 to yesterday (UTC)
 */
export function calculateSyncDateRange(lastSyncedDate: Date): {
  startDate: string;
  endDate: string;
  dates: string[];
} {
  // Calculate yesterday in UTC
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // Start from the day after lastSyncedDate
  const startDate = new Date(lastSyncedDate);
  startDate.setUTCDate(startDate.getUTCDate() + 1);

  const dates: string[] = [];

  // Generate date range
  const current = new Date(startDate);
  while (current <= yesterday) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(yesterday, 'yyyy-MM-dd'),
    dates,
  };
}

/**
 * Get yesterday's date in YYYY-MM-DD format (UTC)
 */
export function getYesterdayUTC(): string {
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return format(yesterday, 'yyyy-MM-dd');
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayUTC(): string {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return format(today, 'yyyy-MM-dd');
}

/**
 * Generate date range between two dates
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
