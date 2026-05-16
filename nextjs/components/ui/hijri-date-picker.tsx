'use client';

import * as React from 'react';
import DatePicker from 'react-multi-date-picker';
import arabic from 'react-multi-date-picker/locales/arabic';
import arabic_umalqura from 'react-multi-date-picker/calendars/arabic_umalqura';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface HijriDatePickerProps {
  value?: string; // YYYY/MM/DD
  onChange: (value: string) => void;
  className?: string;
  name?: string;
  required?: boolean;
}

export function HijriDatePicker({ value, onChange, className, name, required }: HijriDatePickerProps) {
  const handleDateChange = (date: any) => {
    if (!date) {
      onChange('');
      return;
    }
    const formatted = date.format('YYYY/MM/DD');
    onChange(formatted);
  };

  return (
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={value ?? ''} required={required} />}
      <div className="relative group w-full">
        <DatePicker
          value={value}
          onChange={handleDateChange}
          calendar={arabic_umalqura}
          locale={arabic}
          calendarPosition="bottom-right"
          inputClass="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10 cursor-pointer text-right"
          containerClassName="w-full"
          placeholder="YYYY/MM/DD"
          animations={[]}
          format="YYYY/MM/DD"
          showOtherDays
        />
        <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50 group-hover:text-primary transition-colors pointer-events-none z-10" />
      </div>
    </div>
  );
}
