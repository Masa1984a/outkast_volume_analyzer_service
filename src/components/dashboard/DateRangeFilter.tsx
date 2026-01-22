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

  const handleApply = () => {
    onDateChange(fromDate, toDate);
  };

  return (
    <div className="flex gap-4 items-end">
      <div className="flex flex-col gap-2">
        <label htmlFor="from-date" className="text-sm font-medium">
          From
        </label>
        <Input
          id="from-date"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="to-date" className="text-sm font-medium">
          To
        </label>
        <Input
          id="to-date"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="w-40"
        />
      </div>

      <Button onClick={handleApply}>Apply</Button>
    </div>
  );
}
