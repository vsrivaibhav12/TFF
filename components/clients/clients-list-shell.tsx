'use client';

import { useState } from 'react';
import ClientsTable from './clients-table';
import BulkAssignSubService from './bulk-assign-subservice';

interface Props {
  clients: any[];
  basePath: string;
  showBulkAssign?: boolean;
}

export default function ClientsListShell({ clients, basePath, showBulkAssign = false }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === clients.length) return new Set();
      return new Set(clients.map((c) => c.id));
    });
  }

  return (
    <ClientsTable
      clients={clients}
      basePath={basePath}
      selectable={showBulkAssign}
      selected={selected}
      onToggle={toggle}
      onToggleAll={toggleAll}
      bulkActions={
        showBulkAssign && selected.size > 0 ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-teal-50 border border-teal-100">
            <span className="text-sm font-medium text-teal-800">{selected.size} selected</span>
            <BulkAssignSubService
              selectedClientIds={Array.from(selected)}
              onDone={() => setSelected(new Set())}
            />
          </div>
        ) : undefined
      }
    />
  );
}
