'use client';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import ServiceCard from './service-card';

interface Props {
  categories: any[];
  services: any[];
  subServices: any[];
  templatesBySub: Record<string, any[]>;
  stepsByTemplate: Record<string, any[]>;
}

export default function ServiceSearchWrapper({ categories, services, subServices, templatesBySub, stepsByTemplate }: Props) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<string | null>(null);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => { if (s.service_kind) set.add(s.service_kind); });
    return Array.from(set).sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const matchesQuery = !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q));
      const matchesKind = !kindFilter || s.service_kind === kindFilter;
      return matchesQuery && matchesKind;
    });
  }, [services, query, kindFilter]);

  const servicesWithCategory = filteredServices.filter((s) => s.category_id);
  const servicesWithoutCategory = filteredServices.filter((s) => !s.category_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, codes, descriptions..."
            className="pl-9"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
            </button>
          )}
        </div>
        {kinds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {kinds.map((k) => (
              <button
                key={k}
                onClick={() => setKindFilter(kindFilter === k ? null : k)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  kindFilter === k
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {k.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredServices.length === 0 ? (
        <div className="tff-card p-8 text-center">
          <div className="text-sm font-medium text-zinc-900">No services match your search</div>
          <p className="text-xs text-zinc-500 mt-1">Try a different keyword or clear the filter.</p>
          {(query || kindFilter) && (
            <button onClick={() => { setQuery(''); setKindFilter(null); }} className="text-xs text-teal-700 hover:underline mt-3">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {(categories as any[]).map((cat) => {
            const catServices = servicesWithCategory.filter((s) => s.category_id === cat.id);
            if (catServices.length === 0) return null;
            return (
              <section key={cat.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">{cat.name}</h2>
                  <Badge variant="outline" className="text-[10px] font-normal">{catServices.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {catServices.map((s: any) => (
                    <ServiceCard
                      key={s.id}
                      s={s}
                      categories={categories}
                      subServices={subServices}
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
              <div className="flex items-center gap-2">
                <h2 className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Uncategorized</h2>
                <Badge variant="outline" className="text-[10px] font-normal">{servicesWithoutCategory.length}</Badge>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {servicesWithoutCategory.map((s: any) => (
                  <ServiceCard
                    key={s.id}
                    s={s}
                    categories={categories}
                    subServices={subServices}
                    templatesBySub={templatesBySub}
                    stepsByTemplate={stepsByTemplate}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}


