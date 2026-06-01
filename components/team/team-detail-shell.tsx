import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ShieldCheck, AlertTriangle, IndianRupee } from 'lucide-react';
import ApplyRoleControl from '@/app/admin/team/[id]/apply-role-control';
import PromoteDemoteButtons from '@/app/admin/team/[id]/promote-demote-buttons';
import ManagerControl from '@/app/admin/team/[id]/manager-control';
import CredentialsControl from '@/app/admin/team/[id]/credentials-control';

interface Props {
  user: any;
  caps: string[];
  templates: any[];
  teamList: any[];
  payroll: any;
  activeTemplate: any;
  isDiverged: boolean;
  canPromote: boolean;
  canDemote: boolean;
  basePath: string;
  isModal?: boolean;
}

export default function TeamDetailShell({
  user,
  caps,
  templates,
  teamList,
  payroll,
  activeTemplate,
  isDiverged,
  canPromote,
  canDemote,
  basePath,
  isModal,
}: Props) {
  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      {!isModal && (
        <div className="flex-none mb-4">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to team
          </Link>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
        
        {/* LEFT/CENTER COLUMN: Main Identity & Credentials */}
        <div className="lg:col-span-7 flex flex-col gap-6 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="tff-page-title">{user.full_name}</h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <Badge variant={user.role === "admin" ? "teal" : "outline"}>
                  {user.role}
                </Badge>
                <span className="text-sm text-zinc-500">{user.email}</span>
                {activeTemplate && (
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> {activeTemplate.name}
                  </Badge>
                )}
                {isDiverged && (
                  <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> Diverged
                  </Badge>
                )}
                {user.is_prime_admin && (
                  <Badge variant="destructive" className="gap-1">
                    Prime Admin
                  </Badge>
                )}
              </div>
            </div>
            <PromoteDemoteButtons
              userId={user.id}
              currentRole={user.role}
              isPrimeAdmin={user.is_prime_admin ?? false}
              canPromote={canPromote}
              canDemote={canDemote}
            />
          </div>

          <div className="tff-card p-6 space-y-5">
            <h3 className="text-[13px] font-semibold text-zinc-700">Employment details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Job title</div>
                <div className="mt-1 text-sm text-zinc-900">{user.job_title || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Department</div>
                <div className="mt-1 text-sm text-zinc-900">{user.department || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Phone</div>
                <div className="mt-1 text-sm text-zinc-900">{user.phone_number || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">Reports to</div>
                <ManagerControl
                  userId={user.id}
                  currentManagerId={user.reports_to}
                  team={teamList ?? []}
                />
              </div>
            </div>
          </div>

          <div className="tff-card p-6 space-y-5">
            <h3 className="text-[13px] font-semibold text-zinc-700">Login credentials</h3>
            <CredentialsControl userId={user.id} currentEmail={user.email} />
          </div>

        </div>

        {/* RIGHT COLUMN: Payroll & Roles */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          {user.role !== "admin" && (
            <div className="tff-card p-6 space-y-4">
              <div>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 text-zinc-700">
                  <ShieldCheck className="h-4 w-4 text-teal-600" /> Apply a role
                </h3>
                <p className="text-[12px] text-zinc-500 mt-1">
                  Pick a role template to bulk-grant capabilities. Manage
                  templates from{" "}
                  <Link href="/admin/team/roles" className="text-teal-700 hover:underline">
                    Team &rarr; Roles
                  </Link>.
                </p>
              </div>
              <ApplyRoleControl
                userId={user.id}
                templates={templates}
                activeTemplateId={user.active_role_template_id}
              />
            </div>
          )}

          <div className="tff-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 text-zinc-700">
                  <ShieldCheck className="h-4 w-4 text-teal-600" /> Capabilities
                </h3>
                <p className="text-[12px] text-zinc-500 mt-1">
                  {user.role === "admin"
                    ? "Admins implicitly hold every capability."
                    : `${caps.length} of 25 granted.`}
                </p>
              </div>
              {user.role !== "admin" && (
                <Link href={`/admin/team/${user.id}/capabilities`}>
                  <Button variant="outline" size="sm" data-testid="manage-capabilities">
                    Override
                  </Button>
                </Link>
              )}
            </div>
            {user.role !== "admin" && caps.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {caps.map((c) => (
                  <Badge key={c} variant="outline" className="text-[11px] font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="tff-card p-6 space-y-5">
            <div className="flex items-start justify-between">
              <h3 className="text-[13px] font-semibold text-zinc-700 flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-teal-600" /> Payroll settings
              </h3>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/payroll">Manage in payroll</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Monthly salary</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{payroll?.monthly_salary != null ? `₹${Number(payroll.monthly_salary).toLocaleString('en-IN')}` : '—'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Paid leaves / month</div>
                <div className="mt-1 text-sm font-semibold text-zinc-900">{payroll?.paid_leaves_per_month ?? '—'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Deductions</div>
                <div className="mt-1 text-[12px] text-zinc-900">{payroll?.deduction_applicable ? 'Applicable' : 'Not applicable'}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Leave adj.</div>
                <div className="mt-1 text-[12px] text-zinc-900">{payroll?.salary_adjustment_for_leaves ? 'Enabled' : 'Disabled'}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
