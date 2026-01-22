'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DateRangeFilterProps {
  onDateChange: (from: string, to: string) => void;
}

function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function DateRangeFilter({ onDateChange }: DateRangeFilterProps) {
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState(getTodayString());
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    setError(null);

    // Validate date range
    if (new Date(fromDate) > new Date(toDate)) {
      setError('From date must be before or equal to To date');
      return;
    }

    onDateChange(fromDate, toDate);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Date inputs container */}
        <div className="flex gap-4 items-end flex-1">
          <div className="flex flex-col gap-2 flex-1 sm:flex-initial">
            <label htmlFor="from-date" className="text-sm font-medium">
              From
            </label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
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
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>

        {/* Apply button - full width on mobile, auto on desktop */}
        <Button
          onClick={handleApply}
          className="w-full sm:w-auto sm:self-end"
        >
          Apply
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
