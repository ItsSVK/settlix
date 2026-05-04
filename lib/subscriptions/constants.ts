export const SUBSCRIPTION_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500',
  past_due: 'bg-amber-500/10 text-amber-500',
  cancelled: 'bg-muted text-muted-foreground',
}

export const SUBSCRIPTION_STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  past_due: 'bg-amber-500',
  cancelled: 'bg-muted-foreground',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
}

/** Short word form — for use in "X per day/week" phrasing. */
export const INTERVAL_UNIT: Record<string, string> = {
  daily: 'day',
  weekly: 'week',
}

/** Title-case labels — for badges and headings. */
export const INTERVAL_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
}
