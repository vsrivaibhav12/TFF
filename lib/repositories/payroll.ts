import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface PayrollSettingsRow {
  monthly_salary: number;
  paid_leaves_per_month: number;
  deduction_applicable: boolean;
  salary_adjustment_for_leaves: boolean;
}

export async function getPayrollSettings(userId: string): Promise<PayrollSettingsRow | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('staff_payroll_settings')
    .select('monthly_salary, paid_leaves_per_month, deduction_applicable, salary_adjustment_for_leaves')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as PayrollSettingsRow | null;
}

export async function getPayrollRun(userId: string, year: number, month: number): Promise<{ id: string; status: string } | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('payroll_runs')
    .select('id, status')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; status: string } | null;
}

export async function getPayrollRunById(id: string): Promise<any | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('payroll_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAttendanceLogsForMonth(
  userId: string,
  from: string,
  to: string
): Promise<Array<{ status: string }>> {
  const sb = createClient();
  const { data, error } = await sb
    .from('attendance_logs')
    .select('status')
    .eq('user_id', userId)
    .gte('attendance_date', from)
    .lte('attendance_date', to);
  if (error) throw error;
  return (data ?? []) as Array<{ status: string }>;
}

export async function upsertPayrollRun(payload: Record<string, any>): Promise<{ id: string }> {
  const sb = createClient();
  const { data, error } = await sb
    .from('payroll_runs')
    .upsert(payload, { onConflict: 'user_id,month,year' })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function listPayrollRuns(): Promise<any[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('payroll_runs')
    .select('id, user_id, month, year, final_salary, status, created_at')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function upsertPayrollSettings(payload: {
  user_id: string;
  monthly_salary: number;
  paid_leaves_per_month: number;
  deduction_applicable: boolean;
  salary_adjustment_for_leaves: boolean;
  effective_from: string;
}): Promise<void> {
  const sb = createClient();
  const { error } = await sb
    .from('staff_payroll_settings')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
