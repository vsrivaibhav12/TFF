import { listEntityAuditLogs } from '@/lib/repositories/audit';
import AuditTimeline from '@/components/sophistication/audit-timeline';

export default async function ClientActivityStream({ clientId }: { clientId: string }) {
  const auditLogs = await listEntityAuditLogs('client', clientId);
  return <AuditTimeline entries={auditLogs as any} />;
}
