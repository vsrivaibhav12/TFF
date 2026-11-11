import { createClient } from '@/lib/supabase/server';
import type { PeriodContext } from '@/lib/services/task-period';

/** What is needed to check a task's period: its sub-service, the client's name and GST filing frequency. */
export async function getTaskPeriodContext(
  subServiceId: string | null | undefined,
  clientId: string,
): Promise<PeriodContext> {
  const sb = createClient();
  const [sub, client, profile] = await Promise.all([
    subServiceId
      ? sb.from('sub_services').select('name, frequency, period_type').eq('id', subServiceId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from('clients').select('business_name').eq('id', clientId).maybeSingle(),
    sb.from('client_compliance_profiles').select('gst_filing_frequency').eq('client_id', clientId).maybeSingle(),
  ]);
  if (sub.error) throw sub.error;
  if (client.error) throw client.error;
  if (profile.error) throw profile.error;
  return {
    subService: sub.data ?? null,
    clientName: client.data?.business_name ?? null,
    gstFrequency: profile.data?.gst_filing_frequency ?? null,
  };
}

export async function getClientGstFrequency(clientId: string): Promise<string | null> {
  const sb = createClient();
  const { data, error } = await sb
    .from('client_compliance_profiles')
    .select('gst_filing_frequency')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data?.gst_filing_frequency ?? null;
}
