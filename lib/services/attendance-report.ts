import { workingDays } from '@/lib/reports/date-range';

export type AttendanceStatus = 'present' | 'absent' | 'leave' | 'work_from_home';

export interface AttendanceLogInput {
  user_id: string;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  leave_type?: string | null;
  override_reason?: string | null;
  is_manually_created?: boolean | null;
}

export interface MemberInput {
  id: string;
  name: string;
}

export interface MemberAttendanceSummary {
  user_id: string;
  name: string;
  /** Working days (Mon to Sat) from the start of the range up to today. */
  working_days: number;
  present: number;
  work_from_home: number;
  leave: number;
  absent: number;
  /** Working days with no attendance record at all. */
  not_marked: number;
  /** Days with both a check-in and a check-out. */
  timed_days: number;
  total_hours: number;
  avg_hours: number;
  /** (present + work from home) as a share of working days that were not leave. Null when there is nothing to measure. */
  rate: number | null;
}

/** Bare Postgres timestamps carry no zone; the app stores them as UTC. */
export function parseTimestamp(v: string | null | undefined): number | null {
  if (!v) return null;
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(v);
  const t = Date.parse(hasZone ? v : `${v}Z`);
  return Number.isNaN(t) ? null : t;
}

/** Hours between check-in and check-out, or null when either is missing or the order is wrong. */
export function hoursWorked(checkIn: string | null | undefined, checkOut: string | null | undefined): number | null {
  const a = parseTimestamp(checkIn);
  const b = parseTimestamp(checkOut);
  if (a === null || b === null || b <= a) return null;
  return (b - a) / 3_600_000;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function summariseAttendance(
  members: MemberInput[],
  logs: AttendanceLogInput[],
  range: { from: string; to: string },
  todayIso: string,
): { members: MemberAttendanceSummary[]; totals: Omit<MemberAttendanceSummary, 'user_id' | 'name'> } {
  const days = workingDays(range.from, range.to, todayIso);
  const daySet = new Set(days);

  const byUser = new Map<string, MemberAttendanceSummary>();
  const seenDays = new Map<string, Set<string>>();
  const blank = (id: string, name: string): MemberAttendanceSummary => ({
    user_id: id, name, working_days: days.length, present: 0, work_from_home: 0, leave: 0, absent: 0,
    not_marked: 0, timed_days: 0, total_hours: 0, avg_hours: 0, rate: null,
  });
  for (const m of members) byUser.set(m.id, blank(m.id, m.name));

  for (const l of logs) {
    let s = byUser.get(l.user_id);
    if (!s) {
      // A person who has since been deactivated still has history in the range.
      s = blank(l.user_id, 'Former member');
      byUser.set(l.user_id, s);
    }
    if (l.status === 'present') s.present++;
    else if (l.status === 'work_from_home') s.work_from_home++;
    else if (l.status === 'leave') s.leave++;
    else if (l.status === 'absent') s.absent++;
    if (daySet.has(l.attendance_date)) {
      if (!seenDays.has(l.user_id)) seenDays.set(l.user_id, new Set());
      seenDays.get(l.user_id)!.add(l.attendance_date);
    }
    const h = hoursWorked(l.check_in_time, l.check_out_time);
    if (h !== null) {
      s.timed_days++;
      s.total_hours += h;
    }
  }

  const list = [...byUser.values()].map((s) => {
    const logged = seenDays.get(s.user_id)?.size ?? 0;
    s.not_marked = Math.max(0, days.length - logged);
    s.total_hours = round1(s.total_hours);
    s.avg_hours = s.timed_days > 0 ? round1(s.total_hours / s.timed_days) : 0;
    const expected = days.length - s.leave;
    s.rate = expected > 0 ? Math.round(((s.present + s.work_from_home) / expected) * 100) : null;
    return s;
  });
  list.sort((a, b) => a.name.localeCompare(b.name));

  const totals = list.reduce(
    (t, s) => ({
      working_days: t.working_days + s.working_days,
      present: t.present + s.present,
      work_from_home: t.work_from_home + s.work_from_home,
      leave: t.leave + s.leave,
      absent: t.absent + s.absent,
      not_marked: t.not_marked + s.not_marked,
      timed_days: t.timed_days + s.timed_days,
      total_hours: t.total_hours + s.total_hours,
      avg_hours: 0,
      rate: null as number | null,
    }),
    { working_days: 0, present: 0, work_from_home: 0, leave: 0, absent: 0, not_marked: 0, timed_days: 0, total_hours: 0, avg_hours: 0, rate: null as number | null },
  );
  totals.total_hours = round1(totals.total_hours);
  totals.avg_hours = totals.timed_days > 0 ? round1(totals.total_hours / totals.timed_days) : 0;
  const expectedAll = totals.working_days - totals.leave;
  totals.rate = expectedAll > 0 ? Math.round(((totals.present + totals.work_from_home) / expectedAll) * 100) : null;

  return { members: list, totals };
}

export const STATUS_LABELS: Record<string, string> = {
  present: 'Present',
  work_from_home: 'Work from home',
  leave: 'Leave',
  absent: 'Absent',
};
