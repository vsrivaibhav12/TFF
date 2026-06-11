import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Users,
  Receipt,
  BarChart3,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  rolePrefix: string;
}

export default async function ReportsPage({ rolePrefix }: Props) {
  await requireRole(['admin', 'team']);

  const REPORTS = [
    {
      href: `${rolePrefix}/reports/workdone`,
      title: 'Work done',
      description: 'Time logged by team members across clients and tasks.',
      icon: Clock,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      href: `${rolePrefix}/reports/client-services`,
      title: 'Client services',
      description: 'Service mapping and engagement coverage per client.',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      href: `${rolePrefix}/reports/pending-billing`,
      title: 'Pending billing',
      description: 'Billable tasks and work items awaiting invoicing.',
      icon: Receipt,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      href: `${rolePrefix}/reports/service-wise`,
      title: 'Service-wise',
      description: 'Revenue and workload breakdown by service line.',
      icon: Layers,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      href: `${rolePrefix}/reports/group-wise`,
      title: 'Group-wise',
      description: 'Client group performance and aggregated metrics.',
      icon: BarChart3,
      color: 'bg-teal-50 text-teal-600',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500 mt-1">Insights and analytics across the firm.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <Link
              key={report.href}
              href={report.href}
              className="group rounded-2xl border border-zinc-200 bg-white p-6 transition-all duration-200 hover:border-zinc-300 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', report.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors">
                  <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-teal-600 transition-colors" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-zinc-900 mt-4 group-hover:text-teal-700 transition-colors">
                {report.title}
              </h3>
              <p className="text-sm text-zinc-500 mt-1">{report.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
