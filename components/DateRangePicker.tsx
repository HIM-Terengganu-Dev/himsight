'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateChange: (startDate: string, endDate: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    if (newStartDate <= endDate) {
      onDateChange(newStartDate, endDate);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (newEndDate >= startDate) {
      onDateChange(startDate, newEndDate);
    }
  };

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">From</label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            max={endDate}
            className="px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-700 bg-slate-50 hover:bg-white transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">To</label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            min={startDate}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-slate-700 bg-slate-50 hover:bg-white transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
