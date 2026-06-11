import { requireRole } from '@/lib/auth/require-role';
import { requireCapabilityOrRedirect } from '@/lib/auth/require-capability';
import { listServiceCategories, listServices, listSubServices } from '@/lib/repositories/services';
import { listTaskTemplates, listTaskTemplateSteps } from '@/lib/repositories/task-templates';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import ExportButton from '@/components/sophistication/export-button';
import ServiceDialog from '@/components/services/service-dialog';
import SubServiceDialog from '@/components/services/sub-service-dialog';
import TaskTemplatePanel from '@/components/services/task-template-panel';
import { CategoryManager } from '@/components/services/category-dialog';
import EmptyState from '@/components/sophistication/empty-state';
import { Layers } from 'lucide-react';
import ServiceSearchWrapper from '@/components/services/service-search-wrapper';
import ServiceCard from '@/components/services/service-card';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const me = await requireRole(['admin', 'team']);
  await requireCapabilityOrRedirect(me, 'services.view');
  const [categories, services, subServices] = await Promise.all([
    listServiceCategories(),
    listServices(),
    listSubServices(),
  ]);

  // Fetch task templates for all sub-services
  const templatesBySub: Record<string, any[]> = {};
  const stepsByTemplate: Record<string, any[]> = {};
  for (const ss of subServices as any[]) {
    const templates = await listTaskTemplates(ss.id);
    templatesBySub[ss.id] = templates;
    for (const t of templates) {
      stepsByTemplate[t.id] = await listTaskTemplateSteps(t.id);
    }
  }

  const exportData = (services as any[]).map((s) => ({
    name: s.name,
    code: s.code,
    description: s.description ?? '',
    category: categories.find((c: any) => c.id === s.category_id)?.name ?? 'Uncategorized',
    sub_services: (subServices as any[]).filter((ss) => ss.service_id === s.id).map((ss) => ss.name).join(', '),
  }));

  // Group services
  const servicesWithCategory = (services as any[]).filter((s) => s.category_id);
  const servicesWithoutCategory = (services as any[]).filter((s) => !s.category_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services catalogue"
        subtitle="Define what your firm offers. Each sub-service can have task templates — reusable work packages with ordered steps."
        actions={
          <>
            <ExportButton data={exportData} filename="services-export" format="csv" />
            <CategoryManager categories={categories as any} />
            <ServiceDialog categories={categories as any}>
              <Button data-testid="new-service">New service</Button>
            </ServiceDialog>
          </>
        }
      />

      {/* Search wrapper with all data for client-side filtering */}
      <ServiceSearchWrapper
        categories={categories as any}
        services={services as any}
        subServices={subServices as any}
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
            {(categories as any[]).map((cat) => {
              const catServices = (services as any[]).filter((s) => s.category_id === cat.id);
              if (catServices.length === 0) return null;
              return (
                <section key={cat.id} className="space-y-3">
                  <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{cat.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {catServices.map((s: any) => (
                      <ServiceCard
                        key={s.id}
                        s={s}
                        categories={categories as any}
                        subServices={subServices as any}
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
                  {servicesWithoutCategory.map((s: any) => (
                    <ServiceCard
                      key={s.id}
                      s={s}
                      categories={categories as any}
                      subServices={subServices as any}
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
