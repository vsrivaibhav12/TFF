'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ShieldCheck, AlertTriangle, Pencil, X, Check } from 'lucide-react';
import ApplyRoleControl from '@/app/admin/team/[id]/apply-role-control';
import PromoteDemoteButtons from '@/app/admin/team/[id]/promote-demote-buttons';
import ManagerControl from '@/app/admin/team/[id]/manager-control';
import CredentialsControl from '@/app/admin/team/[id]/credentials-control';
import { updateTeamMemberProfileAction } from '@/lib/actions/team';
import { ALL_CAPABILITIES } from '@/lib/auth/capabilities';
import { toast } from 'sonner';

interface Props {
  user: any;
  caps: string[];
  templates: any[];
  teamList: any[];
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
  activeTemplate,
  isDiverged,
  canPromote,
  canDemote,
  basePath,
  isModal,
}: Props) {
  const [editingEmployment, setEditingEmployment] = useState(false);
  const [pending, startTransition] = useTransition();

  // Employment form state
  const [jobTitle, setJobTitle] = useState(user.job_title ?? '');
  const [department, setDepartment] = useState(user.department ?? '');
  const [phone, setPhone] = useState(user.phone_number ?? '');

  function saveEmployment() {
    startTransition(async () => {
      const r = await updateTeamMemberProfileAction({
        user_id: user.id,
        job_title: jobTitle || null,
        department: department || null,
        phone_number: phone || null,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success('Employment details updated');
      setEditingEmployment(false);
    });
  }

  function cancelEmployment() {
    setJobTitle(user.job_title ?? '');
    setDepartment(user.department ?? '');
    setPhone(user.phone_number ?? '');
    setEditingEmployment(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
      {!isModal && (
        <div className="flex-none mb-4 md:hidden">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 font-medium">
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
                <span className="text-sm text-slate-500">{user.email}</span>
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

          {/* Employment details — now editable */}
          <div className="tff-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-slate-700">Employment details</h3>
              {!editingEmployment ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingEmployment(true)} className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4 text-slate-500" />
                </Button>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={saveEmployment} disabled={pending} className="h-8 w-8 p-0">
                    <Check className="h-4 w-4 text-teal-600" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={cancelEmployment} disabled={pending} className="h-8 w-8 p-0">
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">Job title</div>
                {editingEmployment ? (
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Analyst" />
                ) : (
                  <div className="text-sm text-slate-900">{user.job_title || '—'}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">Department</div>
                {editingEmployment ? (
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Tax" />
                ) : (
                  <div className="text-sm text-slate-900">{user.department || '—'}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">Phone</div>
                {editingEmployment ? (
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
                ) : (
                  <div className="text-sm text-slate-900">{user.phone_number || '—'}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Reports to</div>
                <ManagerControl
                  userId={user.id}
                  currentManagerId={user.reports_to}
                  team={teamList ?? []}
                />
              </div>
            </div>
          </div>

          <div className="tff-card p-6 space-y-5">
            <h3 className="text-[13px] font-semibold text-slate-700">Login credentials</h3>
            <CredentialsControl userId={user.id} currentEmail={user.email} />
          </div>

        </div>

        {/* RIGHT COLUMN: Payroll & Roles */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          
          {user.role !== "admin" && (
            <div className="tff-card p-6 space-y-4">
              <div>
                <h3 className="text-[13px] font-semibold flex items-center gap-2 text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-teal-600" /> Apply a role
                </h3>
                <p className="text-[12px] text-slate-500 mt-1">
                  Pick a role template to bulk-grant capabilities. Manage
                  templates from{" "}
                  <Link href={`${basePath}/roles`} className="text-teal-700 hover:underline">
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
                <h3 className="text-[13px] font-semibold flex items-center gap-2 text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-teal-600" /> Capabilities
                </h3>
                <p className="text-[12px] text-slate-500 mt-1">
                  {user.role === "admin"
                    ? "Admins implicitly hold every capability."
                    : `${caps.length} of ${ALL_CAPABILITIES.length} granted.`}
                </p>
              </div>
              {user.role !== "admin" && (
                <Link href={`${basePath}/${user.id}/capabilities`}>
                  <Button variant="outline" size="sm" data-testid="manage-capabilities">
                    Override
                  </Button>
                </Link>
              )}
            </div>
            {user.role !== "admin" && caps.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {caps.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs font-normal">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
