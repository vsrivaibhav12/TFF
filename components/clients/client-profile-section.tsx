'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ClientFormWrapper from './client-form-wrapper';

interface Props {
  client: Record<string, any>;
  groups: { id: string; name: string }[];
  owners: { id: string; full_name: string; email: string }[];
  basePath: string;
  canEdit: boolean;
  canDelete?: boolean;
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-sm text-slate-900 truncate ${mono ? 'font-mono' : ''}`}>{value || <span className="text-slate-500">Not set</span>}</dd>
    </div>
  );
}

/**
 * Profile card for the client panel. Opens as a read-only summary; "Edit" swaps in the form.
 * This keeps Save and Delete out of reach until the user chooses to edit.
 */
export default function ClientProfileSection({ client, groups, owners, basePath, canEdit, canDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const group = groups.find((g) => g.id === client.group_id)?.name;
  const owner = owners.find((o) => o.id === client.primary_owner_id)?.full_name;

  return (
    <div className="tff-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="tff-section-title">Profile</h3>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)} data-testid="client-profile-edit-toggle">
            {editing ? <><X className="h-3.5 w-3.5 mr-1" /> Cancel</> : <><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</>}
          </Button>
        )}
      </div>

      {!canEdit && <p className="text-xs text-slate-500 mb-3">You do not have permission to edit this client.</p>}

      {editing ? (
        <ClientFormWrapper
          groups={groups}
          owners={owners}
          initial={client}
          basePath={basePath}
          readOnly={false}
          canDelete={canDelete}
        />
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Business name" value={client.business_name} />
          <Field label="Group" value={group} />
          <Field label="PAN" value={client.pan} mono />
          <Field label="GSTIN" value={client.gstin} mono />
          <Field label="Contact person" value={client.primary_contact_person} />
          <Field label="Contact phone" value={client.primary_contact_phone} />
          <Field label="Contact email" value={client.primary_contact_email} />
          <Field label="Owner" value={owner} />
          <Field label="City" value={client.city} />
          <Field label="State" value={client.state} />
          {client.notes && (
            <div className="col-span-2 min-w-0">
              <dt className="text-xs text-slate-500">Internal notes</dt>
              <dd className="text-sm text-slate-900 whitespace-pre-wrap">{client.notes}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
