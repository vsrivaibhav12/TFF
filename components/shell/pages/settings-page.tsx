export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { hasCapability } from '@/lib/auth/require-capability';
import type { Capability } from '@/lib/auth/capabilities';
import { PageHeader } from '@/components/ui/page-header';
import {
  ShieldCheck, Wallet, FolderTree, Calendar, Settings as SettingsIcon, Lock, FileText,
} from 'lucide-react';

interface SettingCard {
  href: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  testid: string;
}

interface Props {
  rolePrefix: string;
}

export default async function SettingsPage({ rolePrefix }: Props) {
  const me = await requireRole(['admin', 'team']);

  const ALL_CARDS: (SettingCard & { cap: Capability | Capability[] })[] = [
    { href: `${rolePrefix}/team/roles`, title: 'Staff role templates', body: 'Group capabilities into roles like Senior Tax Associate. Apply to team members in one click.', icon: ShieldCheck, testid: 'set-roles', cap: 'staff.grant_capabilities' },
    { href: `${rolePrefix}/settings/billing-entities`, title: 'Billing entities', body: 'TFF LLP, your existing CA practice — manage GSTIN, invoice prefix, signing authority, bank details.', icon: Wallet, testid: 'set-billing-entities', cap: 'manage_billing_entities' },
    { href: `${rolePrefix}/settings/profit-cost-centres`, title: 'Profit & cost centres', body: 'Two-character codes used to slice tasks, work-done, and reports by pillar (CaaS / BizLens / vCFO).', icon: FolderTree, testid: 'set-pc-cc', cap: 'services.manage' },
    { href: `${rolePrefix}/settings/compliance-rules`, title: 'Compliance calendar rules', body: 'Edit the statutory due-date master. Add, disable, or change reminder windows.', icon: Calendar, testid: 'set-rules', cap: 'manage_compliance_rules' },
    { href: `${rolePrefix}/settings/labels`, title: 'Labels', body: 'Categorise tasks and clients with custom colour-coded labels.', icon: Lock, testid: 'set-labels', cap: 'manage_labels' },
    { href: `${rolePrefix}/services`, title: 'Service catalogue', body: 'Define services, sub-services, and reusable task templates.', icon: SettingsIcon, testid: 'set-catalogue', cap: 'services.manage' },
    { href: `${rolePrefix}/settings/tax-rates`, title: 'Income tax rates', body: 'Set slab rates, surcharge, and cess for each assessee category.', icon: FileText, testid: 'set-tax-rates', cap: 'manage_compliance_rules' },
  ];

  const CARDS: SettingCard[] = [];
  for (const c of ALL_CARDS) {
    if (me.role === 'admin' || await hasCapability(me, c.cap)) {
      CARDS.push(c);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Settings"
        subtitle="Firm-wide configuration. Most things you change here apply to every staff member and every client."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              data-testid={c.testid}
              className="tff-card p-5 hover:border-teal-200 hover:bg-teal-50/20 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-zinc-100 p-2.5 group-hover:bg-white group-hover:border group-hover:border-zinc-200 transition-all">
                  <Icon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-900">{c.title}</div>
                  <p className="text-sm text-zinc-500 mt-1">{c.body}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
