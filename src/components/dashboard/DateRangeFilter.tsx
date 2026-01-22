'use client';

import { Input } from '@/components/ui/input';

interface DateRangeFilterProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  error?: string | null;
}

export function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  error
}: DateRangeFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 items-end">
        <div className="flex flex-col gap-2 flex-1 sm:flex-initial">
          <label htmlFor="from-date" className="text-sm font-medium">
            From
          </label>
          <Input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>

        <div className="flex flex-col gap-2 flex-1 sm:flex-initial">
          <label htmlFor="to-date" className="text-sm font-medium">
            To
          </label>
          <Input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
