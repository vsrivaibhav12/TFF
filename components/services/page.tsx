import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listServiceCategories, listServices, listSubServices } from '@/lib/repositories/services';
import { listTaskTemplates, listTaskTemplateSteps } from '@/lib/repositories/task-templates';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import ServiceDialog from './service-dialog';
import SubServiceDialog from './sub-service-dialog';
import TaskTemplatePanel from './task-template-panel';
import { CategoryManager } from './category-dialog';
import EmptyState from '@/components/sophistication/empty-state';
import { Layers } from 'lucide-react';
import ServiceSearchWrapper from './service-search-wrapper';
import ServiceCard from './service-card';

interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  display_order?: number | null;
}

interface Service {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
}

interface SubService {
  id: string;
  code: string;
  name: string;
  service_id: string;
  frequency?: string | null;
  is_billable?: boolean;
  is_recurring?: boolean;
  requires_client_input?: boolean;
  is_active?: boolean;
  services?: { code?: string | null; name?: string | null } | null;
}

interface TaskTemplate {
  id: string;
  sub_service_id: string;
  title: string;
}

interface TaskTemplateStep {
  id: string;
  task_template_id: string;
  title: string;
}

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'services.manage');
  const [categories, services, subServices] = await Promise.all([
    listServiceCategories(),
    listServices(),
    listSubServices(),
  ]);

  // Fetch task templates for all sub-services
  const templatesBySub: Record<string, TaskTemplate[]> = {};
  const stepsByTemplate: Record<string, TaskTemplateStep[]> = {};
  for (const ss of subServices as SubService[]) {
    const templates = await listTaskTemplates(ss.id);
    templatesBySub[ss.id] = templates;
    for (const t of templates) {
      stepsByTemplate[t.id] = await listTaskTemplateSteps(t.id);
    }
  }

  const exportData = (services as Service[]).map((s) => ({
    name: s.name,
    code: s.code,
    description: s.description ?? '',
    category: (categories as ServiceCategory[]).find((c) => c.id === s.category_id)?.name ?? 'Uncategorized',
    sub_services: (subServices as SubService[]).filter((ss) => ss.service_id === s.id).map((ss) => ss.name).join(', '),
  }));

  // Group services
  const servicesWithCategory = (services as Service[]).filter((s) => s.category_id);
  const servicesWithoutCategory = (services as Service[]).filter((s) => !s.category_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services catalogue"
        subtitle="Define what your firm offers. Each sub-service can have task templates — reusable work packages with ordered steps."
        actions={
          <>
            <ExportButton data={exportData} filename="services-export" format="csv" />
            <CategoryManager categories={categories as ServiceCategory[]} />
            <ServiceDialog categories={categories as ServiceCategory[]}>
              <Button data-testid="new-service">New service</Button>
            </ServiceDialog>
          </>
        }
      />

      {/* Search wrapper with all data for client-side filtering */}
      <ServiceSearchWrapper
        categories={categories as ServiceCategory[]}
        services={services as Service[]}
        subServices={subServices as SubService[]}
        templatesBySub={templatesBySub}
        stepsByTemplate={stepsByTemplate}
      />

      {/* Static fallback for SSR / no-JS */}
      <noscript>
        {services.length === 0 ? (
          <EmptyState
            title="No services defined yet"
            body="Start by creating a service (e.g. 'GST Compliance'). Then add sub-services like 'GSTR-3B' inside it."
            icon={<Layers className="h-6 w-6 text-zinc-400" />}
          />
        ) : (
          <div className="space-y-8">
            {(categories as ServiceCategory[]).map((cat) => {
              const catServices = (services as Service[]).filter((s) => s.category_id === cat.id);
              if (catServices.length === 0) return null;
              return (
                <section key={cat.id} className="space-y-3">
                  <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{cat.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {catServices.map((s) => (
                      <ServiceCard
                        key={s.id}
                        s={s}
                        categories={categories as ServiceCategory[]}
                        subServices={subServices as SubService[]}
                        templatesBySub={templatesBySub}
                        stepsByTemplate={stepsByTemplate}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            {servicesWithoutCategory.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Uncategorized</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {servicesWithoutCategory.map((s) => (
                    <ServiceCard
                      key={s.id}
                      s={s}
                      categories={categories as ServiceCategory[]}
                      subServices={subServices as SubService[]}
                      templatesBySub={templatesBySub}
                      stepsByTemplate={stepsByTemplate}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </noscript>
    </div>
  );
}


