import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import { getClientById } from '@/lib/repositories/clients';
import { listClientVisibility } from '@/lib/repositories/portal-visibility';
import { listTasks } from '@/lib/repositories/tasks';
import { listQueries } from '@/lib/repositories/queries';
import { listAllNotices } from '@/lib/repositories/notices';
import * as bizlensRepo from '@/lib/repositories/bizlens';
import * as bizlensService from '@/lib/services/bizlens-service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase, MessageSquare, AlertTriangle, BarChart3, Calendar, FileCheck } from 'lucide-react';
import { formatDateIST, displayTaskName } from '@/lib/utils';
import type { PortalModule } from '@/lib/auth/portal-visibility';

interface Props {
  clientId: string;
  rolePrefix: string;
}

const MODULE_LABELS: Record<PortalModule, { label: string; icon: React.ElementType }> = {
  'portal.dashboard': { label: 'Dashboard', icon: FileCheck },
  'portal.tasks': { label: 'Tasks', icon: Briefcase },
  'portal.queries': { label: 'Queries', icon: MessageSquare },
  'portal.bizlens': { label: 'BizLens', icon: BarChart3 },
  'portal.vcfo': { label: 'vCFO', icon: BarChart3 },
  'portal.compliance_calendar': { label: 'Calendar', icon: Calendar },
  'portal.insights': { label: 'Insights', icon: BarChart3 },
  'portal.tax_projection': { label: 'Projections', icon: BarChart3 },
  'portal.notices': { label: 'Notices', icon: AlertTriangle },
  'portal.vendors': { label: 'Vendors', icon: FileCheck },
};

export default async function ClientPreview({ clientId, rolePrefix }: Props) {
  const me = await requireRole(['admin', 'team']);
  const canRead = await hasCapability(me, 'clients.read.all');
  if (!canRead) {
    return (
      <div className="p-10 text-center text-zinc-500">
        You do not have permission to preview this client portal.
      </div>
    );
  }

  const client = await getClientById(clientId);
  if (!client) notFound();

  const [visibility, tasks, queries, notices, bizlensReports] = await Promise.all([
    listClientVisibility(clientId),
    listTasks({ clientId, limit: 5 }),
    listQueries({ clientId, limit: 5 }),
    listAllNotices({ clientId, limit: 5 }),
    bizlensRepo.listReportsByClient(clientId),
  ]);

  const latestReport = bizlensReports.find((r: any) => r.status === 'published');
  let score = null;
  if (latestReport) {
    const report = bizlensService.computeReport(latestReport);
    score = bizlensService.computeBizLensScore(report);
  }

  const visibleModules = (Object.keys(visibility) as PortalModule[]).filter((m) => visibility[m]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`${rolePrefix}/clients?dock=client:${clientId}`}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to client
          </Link>
        </Button>
        <Badge variant="outline">Viewing as client</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{(client as { business_name: string }).business_name}</CardTitle>
          <p className="text-sm text-zinc-500">Portal preview</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Visible modules</h3>
            <div className="flex flex-wrap gap-2">
              {visibleModules.length === 0 ? (
                <span className="text-sm text-zinc-500">Only dashboard is visible.</span>
              ) : (
                visibleModules.map((m) => {
                  const mod = MODULE_LABELS[m] ?? { label: m, icon: FileCheck };
                  const Icon = mod.icon;
                  return (
                    <Badge key={m} variant="outline" className="gap-1">
                      <Icon className="h-3 w-3" /> {mod.label}
                    </Badge>
                  );
                })
              )}
            </div>
          </div>

          {visibility['portal.bizlens'] && latestReport && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100">
              <div className="text-sm font-medium text-teal-900">Latest BizLens score</div>
              <div className="text-2xl font-semibold text-teal-700">
                {score ? `${score.total}/${score.max}` : '—'}
              </div>
              <div className="text-xs text-teal-600">{score?.band}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Open tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{tasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Queries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{queries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Notices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{notices.length}</div>
              </CardContent>
            </Card>
          </div>

          {tasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">Recent tasks</h3>
              <div className="space-y-2">
                {tasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{displayTaskName(t)}</div>
                      <div className="text-xs text-zinc-500">Due {t.due_date ? formatDateIST(t.due_date) : '—'}</div>
                    </div>
                    <Badge variant="outline">{t.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
