import { ensureModuleVisible } from '@/lib/auth/portal-visibility';
import { listAccessibleClients } from '@/lib/repositories/clients';
import { listAllUpcomingDueDates } from '@/lib/repositories/compliance';
import ComplianceCalendar from '@/components/operations/compliance-calendar';


export default async function PortalCalendarPage() {
  await ensureModuleVisible('portal.compliance_calendar');
  const clients = await listAccessibleClients();
  const clientIds = clients.map((c) => c.id);
  const agg =
    clientIds.length > 0
      ? await listAllUpcomingDueDates(120, clientIds)
      : { gst: [], tds: [], it: [] };

  const events: any[] = [];
  for (const f of agg.gst as any[])
    events.push({
      date: f.due_date,
      type: 'GST',
      label: `${f.display_name} ${f.period_label}`,
      clientName: f.clients?.business_name ?? '',
      severity: f.status === 'filed' ? 'info' : 'warning',
    });
  for (const f of agg.tds as any[])
    events.push({
      date: f.due_date,
      type: 'TDS',
      label: `${f.display_name} ${f.period_label}`,
      clientName: f.clients?.business_name ?? '',
      severity: f.status === 'filed' ? 'info' : 'warning',
    });
  for (const f of agg.it as any[])
    events.push({
      date: f.due_date,
      type: 'IT',
      label: `${f.display_name} ${f.period_label}`,
      clientName: f.clients?.business_name ?? '',
      severity: f.status === 'filed' ? 'info' : 'warning',
    });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="tff-page-title">Compliance calendar</h1>
        <p className="tff-page-subtitle">All filings due across your engagements.</p>
      </div>
      <ComplianceCalendar events={events} />
    </div>
  );
}
