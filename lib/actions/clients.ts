'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { requireCapability } from '@/lib/auth/require-capability';
import * as clientService from '@/lib/services/client-service';
import { ok, fail, type ActionResult } from '@/lib/actions/result';

// Helper: normalises null/undefined/empty-string to '' so Zod unions don't fail with "Invalid input"
function optionalStr<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (val) => (val === undefined || val === null || val === '') ? '' : String(val),
    z.union([z.literal(''), schema])
  ).optional();
}

// Smart defaults: only Business Name is strictly required for creation.
const ClientBaseSchema = z.object({
  business_name: z.string().min(1, "Business name is required"),
  pan: optionalStr(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format (e.g. ABCDE1234F)').transform(v => v.toUpperCase())),
  gstin: optionalStr(z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format').transform(v => v.toUpperCase())),
  category: optionalStr(z.string()),
  industry: optionalStr(z.string()),
  primary_contact_person: optionalStr(z.string()),
  primary_contact_phone: optionalStr(z.string()),
  primary_contact_email: optionalStr(z.string().email('Invalid email')),
  city: optionalStr(z.string()),
  state: optionalStr(z.string()),
  pincode: optionalStr(z.string()),

  group_id: optionalStr(z.string().uuid('Invalid group ID')),
  portal_enabled: z.boolean().default(false),
  portal_email: optionalStr(z.string().email('Invalid portal email')),
  portal_password: optionalStr(z.string().min(6, 'Password must be at least 6 characters')),
  notes: optionalStr(z.string()),
});

const CreateClientSchema = ClientBaseSchema.refine((data) => {
  if (data.portal_enabled) {
    return !!data.portal_email && !!data.portal_password;
  }
  return true;
}, {
  message: "Portal email and password are required when portal access is enabled",
  path: ["portal_email"],
});

const UpdateClientSchema = ClientBaseSchema.partial().extend({
  id: z.string().uuid()
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;

export async function createClient(input: CreateClientInput): Promise<ActionResult<{ id: string }>> {
  try {
    // 1. Authorization & Capability Check
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.create');

    // 2. Validation
    const parsedData = CreateClientSchema.safeParse(input);
    if (!parsedData.success) {
      return fail(parsedData.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR');
    }

    // 3. Execute Business Logic via Service
    const newClient = await clientService.createClientRecord({
      ...parsedData.data,
      created_by: me.id
    });
    
    revalidatePath('/admin/clients');
    revalidatePath('/team/clients');
    return ok({ id: newClient.id });
  } catch (err: any) {
    return fail(err.message || 'Failed to create client', err.code || 'INTERNAL_ERROR');
  }
}

export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;

export async function updateClient(input: UpdateClientInput): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.edit');

    const parsedData = UpdateClientSchema.safeParse(input);
    if (!parsedData.success) {
      return fail(parsedData.error.errors[0]?.message ?? 'Validation failed', 'VALIDATION_ERROR');
    }

    const { id, ...data } = parsedData.data;
    await clientService.updateClientRecord(id, data);
    
    revalidatePath('/admin/clients');
    revalidatePath(`/admin/clients/${id}`);
    revalidatePath('/team/clients');
    revalidatePath(`/team/clients/${id}`);
    return ok(undefined);
  } catch (err: any) {
    return fail(err.message || 'Failed to update client', err.code || 'INTERNAL_ERROR');
  }
}

export async function softDeleteClient(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.delete');
    
    await clientService.updateClientRecord(id, { 
      is_deleted: true, 
      deleted_at: new Date().toISOString(), 
      deleted_by: me.id 
    });
    
    revalidatePath('/admin/clients');
    revalidatePath('/team/clients');
    return ok(undefined);
  } catch (err: any) {
    return fail(err.message || 'Failed to delete client', err.code || 'INTERNAL_ERROR');
  }
}

export async function assignTeamMember(input: { clientId: string; teamUserId: string; role: 'lead' | 'support' | 'reviewer' }): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.assign_team');

    await clientService.assignTeamMember(input.clientId, input.teamUserId, input.role);
    
    revalidatePath(`/admin/clients/${input.clientId}`);
    revalidatePath(`/team/clients/${input.clientId}`);
    return ok(undefined);
  } catch (err: any) {
    return fail(err.message || 'Failed to assign team member', err.code || 'INTERNAL_ERROR');
  }
}

export async function unassignTeamMember(assignmentId: string, clientId: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin', 'team']);
    await requireCapability(me, 'clients.assign_team');

    await clientService.unassignTeamMember(assignmentId);
    
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath(`/team/clients/${clientId}`);
    return ok(undefined);
  } catch (err: any) {
    return fail(err.message || 'Failed to unassign team member', err.code || 'INTERNAL_ERROR');
  }
}

const GroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: optionalStr(z.string().max(500)),
});

export async function createClientGroup(input: z.infer<typeof GroupSchema>): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.edit');
    const parsed = GroupSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    const data = await clientService.createClientGroupRecord({
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/groups');
    return ok({ id: data.id });
  } catch (err: any) {
    return fail(err.message || 'Failed to create group', err.code || 'INTERNAL_ERROR');
  }
}

export async function updateClientGroup(id: string, input: z.infer<typeof GroupSchema>): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.edit');
    const parsed = GroupSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'Invalid input', 'VALIDATION');
    await clientService.updateClientGroupRecord(id, {
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/groups');
    return ok(undefined);
  } catch (err: any) {
    return fail(err.message || 'Failed to update group', err.code || 'INTERNAL_ERROR');
  }
}

export async function deleteClientGroup(id: string): Promise<ActionResult<void>> {
  try {
    const me = await requireRole(['admin']);
    await requireCapability(me, 'clients.delete');
    await clientService.softDeleteClientGroupRecord(id);
    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/groups');
    return ok(undefined);
  } catch (err: any) {
    return fail(err.message || 'Failed to delete group', err.code || 'INTERNAL_ERROR');
  }
}
