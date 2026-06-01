import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listGrantedCapabilities } from "@/lib/repositories/staff-capabilities";
import { listRoleTemplates } from "@/lib/repositories/role-templates";
import { getCurrentUser } from "@/lib/auth/require-role";
import TeamDetailShell from "@/components/team/team-detail-shell";
import ModalWrapper from "@/components/shell/modal-wrapper";

export const dynamic = "force-dynamic";

export default async function AdminTeamModalIntercept({ params }: { params: { id: string } }) {
  const sb = createClient();
  const currentUser = await getCurrentUser();
  const { data: user } = await sb
    .from("users_profile")
    .select("id, full_name, email, role, is_active, phone_number, job_title, department, active_role_template_id, is_prime_admin, reports_to")
    .eq("id", params.id)
    .maybeSingle();
  if (!user) notFound();

  const [caps, templates, teamList, payroll] = await Promise.all([
    listGrantedCapabilities(params.id),
    listRoleTemplates(),
    sb.from("users_profile").select("id, full_name, email").in("role", ["team", "admin"]).eq("is_active", true).order("full_name"),
    sb.from("staff_payroll_settings").select("monthly_salary, paid_leaves_per_month, deduction_applicable, salary_adjustment_for_leaves").eq("user_id", params.id).maybeSingle(),
  ]);

  const activeTemplate = templates.find((t) => t.id === (user as any).active_role_template_id);

  const isDiverged = activeTemplate
    ? (() => {
        const current = new Set<string>(caps);
        const templ = new Set<string>(activeTemplate.capabilities);
        const missing = activeTemplate.capabilities.filter((c) => !current.has(c));
        const extra = caps.filter((c) => !templ.has(c));
        return missing.length > 0 || extra.length > 0;
      })()
    : false;

  const canPromote = currentUser?.is_prime_admin ?? false;
  const canDemote = (currentUser?.is_prime_admin ?? false) && user.role === "admin" && !user.is_prime_admin;

  return (
    <ModalWrapper>
      <div className="pt-8 px-2 md:px-4 h-full">
        <TeamDetailShell
          user={user}
          caps={caps}
          templates={templates}
          teamList={teamList.data ?? []}
          payroll={payroll.data}
          activeTemplate={activeTemplate}
          isDiverged={isDiverged}
          canPromote={canPromote}
          canDemote={canDemote}
          basePath="/admin/team"
          isModal={true}
        />
      </div>
    </ModalWrapper>
  );
}
