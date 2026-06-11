/**
 * Pure-function payroll calculator + orchestration.
 *
 * Inputs are strictly facts (settings + counted days + adjustments) so the same
 * inputs always yield the same output — making this trivially testable and
 * round-trippable into payroll_runs without surprise.
 */

import {
  getPayrollSettings,
  getPayrollRun,
  listAttendanceLogsForMonth,
  upsertPayrollRun,
} from '@/lib/repositories/payroll';
import {
  computePayroll,
  type PayrollSettings,
  type PayrollFacts,
  type PayrollAdjustment,
  type PayrollResult,
} from './payroll-compute';

export { computePayroll, type PayrollSettings, type PayrollFacts, type PayrollAdjustment, type PayrollResult };

export interface RunPayrollInput {
  user_id: string;
  year: number;
  month: number;
  total_working_days?: number;
  adjustments?: PayrollAdjustment[];
  created_by: string;
}

export async function runPayroll(input: RunPayrollInput): Promise<{ id: string; result: PayrollResult }> {
  const settings = await getPayrollSettings(input.user_id);
  if (!settings) throw new Error('NO_SETTINGS');

  const existingRun = await getPayrollRun(input.user_id, input.year, input.month);
  if (existingRun && existingRun.status === 'finalized') {
    throw new Error('FINALIZED');
  }

  const monthStart = new Date(input.year, input.month - 1, 1);
  const monthEnd = new Date(input.year, input.month, 0);
  let totalWorkingDays = input.total_working_days ?? 0;
  if (!input.total_working_days) {
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) totalWorkingDays++;
    }
  }

  const logs = await listAttendanceLogsForMonth(
    input.user_id,
    monthStart.toISOString().slice(0, 10),
    monthEnd.toISOString().slice(0, 10)
  );

  let present = 0, leave = 0;
  for (const l of logs) {
    if (l.status === 'present') present++;
    else if (l.status === 'leave') leave++;
  }

  const facts: PayrollFacts = {
    total_working_days: totalWorkingDays,
    actual_present_days: present,
    actual_leave_days: leave,
  };

  const result = computePayroll(settings, facts, input.adjustments ?? []);

  const row = await upsertPayrollRun({
    user_id: input.user_id,
    month: input.month,
    year: input.year,
    total_working_days: facts.total_working_days,
    actual_present_days: facts.actual_present_days,
    actual_leave_days: facts.actual_leave_days,
    paid_leave_days: result.paid_leave_days,
    unpaid_leave_days: result.unpaid_leave_days,
    daily_rate: result.daily_rate,
    base_salary: result.base_salary,
    salary_for_present_days: result.salary_for_present_days,
    deduction_for_excess_leaves: result.deduction_for_excess_leaves,
    total_deductions: result.total_deductions,
    gross_salary: result.gross_salary,
    final_salary: result.final_salary,
    status: 'draft',
    created_by: input.created_by,
  });

  return { id: row.id, result };
}
