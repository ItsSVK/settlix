'use client'

import { Calendar } from 'lucide-react'

interface DatePickerInputProps {
  label: string
  value: string
  min?: string
  onChange: (value: string) => void
  type?: 'date' | 'datetime-local'
}

export function DatePickerInput({ label, value, min, onChange, type = 'date' }: DatePickerInputProps) {
  return (
    <div>
      <label className='mb-1.5 block text-xs font-medium text-muted-foreground'>{label}</label>
      <div className='relative'>
        <input
          type={type}
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className='peer relative w-full appearance-none rounded-xl border-none bg-muted/90 pl-3.5 pr-10 py-3 text-sm font-medium text-foreground outline-none transition-all focus:ring-1 focus:ring-primary/30 dark:scheme-dark [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0'
        />
        <Calendar className='pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-primary' />
      </div>
    </div>
  )
}
