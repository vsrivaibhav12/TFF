// Pure: on which days does a deadline deserve a reminder to create its tasks?

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 'opened' the day after the period ends (the work can start), 'week_left' seven days before
 * the due date. Any other day is quiet, so a daily job reminds once per moment, not every day.
 */
export function nudgeReason(args: {
  periodEnd: string;
  dueDate: string | null;
  today: string;
}): 'opened' | 'week_left' | null {
  if (args.today === addDays(args.periodEnd, 1)) return 'opened';
  if (args.dueDate && args.today === addDays(args.dueDate, -7)) return 'week_left';
  return null;
}
