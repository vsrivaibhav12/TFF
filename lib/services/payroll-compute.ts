/**
 * Pure-function payroll calculator — no server-only imports.
 * Extracted so test scripts and client code can import safely.
 */

export interface PayrollSettings {
  monthly_salary: number;
  paid_leaves_per_month: number;
  deduction_applicable: boolean;
  salary_adjustment_for_leaves: boolean;
}

export interface PayrollFacts {
  total_working_days: number;
  actual_present_days: number;
  actual_leave_days: number;
}

export interface PayrollAdjustment {
  type: 'bonus' | 'deduction' | 'overtime' | 'other';
  amount: number;
  reason: string;
}

export interface PayrollResult {
  daily_rate: number;
  base_salary: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  salary_for_present_days: number;
  deduction_for_excess_leaves: number;
  bonuses: number;
  other_deductions: number;
  gross_salary: number;
  total_deductions: number;
  final_salary: number;
  tds_estimate: number;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function estimateTdsForMonth(monthlyGross: number): number {
  const annual = monthlyGross * 12;
  let tax = 0;
  if (annual > 1500000) tax += (annual - 1500000) * 0.30;
  if (annual > 1200000) tax += Math.min(annual, 1500000 - 1) - 1200000 < 0 ? 0 : (Math.min(annual, 1500000) - 1200000) * 0.20;
  if (annual > 900000) tax += (Math.min(annual, 1200000) - 900000) * 0.15;
  if (annual > 600000) tax += (Math.min(annual, 900000) - 600000) * 0.10;
  if (annual > 300000) tax += (Math.min(annual, 600000) - 300000) * 0.05;
  return round2(tax / 12);
}

export function computePayroll(
  settings: PayrollSettings,
  facts: PayrollFacts,
  adjustments: PayrollAdjustment[] = [],
): PayrollResult {
  const dailyRate = facts.total_working_days > 0 ? settings.monthly_salary / facts.total_working_days : 0;
  const base = settings.monthly_salary;

  const paidLeave = Math.min(facts.actual_leave_days, settings.paid_leaves_per_month);
  const unpaidLeave = Math.max(0, facts.actual_leave_days - settings.paid_leaves_per_month);

  const salaryForPresent = round2(dailyRate * (facts.actual_present_days + paidLeave));
  const deductionForExcess = settings.deduction_applicable && settings.salary_adjustment_for_leaves
    ? round2(dailyRate * unpaidLeave) : 0;

  const bonuses = round2(adjustments.filter((a) => a.type === 'bonus' || a.type === 'overtime').reduce((s, a) => s + a.amount, 0));
  const otherDeductions = round2(adjustments.filter((a) => a.type === 'deduction' || a.type === 'other').reduce((s, a) => s + a.amount, 0));

  const gross = round2(salaryForPresent + bonuses);
  const totalDeductions = round2(deductionForExcess + otherDeductions);
  const tdsEstimate = estimateTdsForMonth(gross);
  const final = round2(gross - totalDeductions - tdsEstimate);

  return {
    daily_rate: round2(dailyRate),
    base_salary: base,
    paid_leave_days: paidLeave,
    unpaid_leave_days: unpaidLeave,
    salary_for_present_days: salaryForPresent,
    deduction_for_excess_leaves: deductionForExcess,
    bonuses,
    other_deductions: otherDeductions,
    gross_salary: gross,
    total_deductions: totalDeductions,
    final_salary: final,
    tds_estimate: tdsEstimate,
  };
}
