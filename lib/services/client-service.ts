import 'server-only';
import * as clientRepo from '@/lib/repositories/clients';

export async function createClientRecord(data: any) {
  // Business logic here (e.g. formatting, defaults)
  const {
    portal_email: _portalEmail,
    portal_password: _portalPassword,
    created_by,
    ...clientPayload
  } = data;

  // Format PAN and GSTIN to uppercase
  if (clientPayload.pan) clientPayload.pan = clientPayload.pan.toUpperCase();
  if (clientPayload.gstin) clientPayload.gstin = clientPayload.gstin.toUpperCase();

  // Handle empty strings as nulls for DB
  if (clientPayload.pan === '') clientPayload.pan = null;
  if (clientPayload.gstin === '') clientPayload.gstin = null;
  if (clientPayload.primary_contact_email === '') clientPayload.primary_contact_email = null;
  if (clientPayload.group_id === '') clientPayload.group_id = null;
  if (clientPayload.primary_owner_id === '') clientPayload.primary_owner_id = null;
  if (clientPayload.category === '') clientPayload.category = null;


  // Map internal_notes → notes (live schema uses 'notes')
  if (clientPayload.internal_notes !== undefined) {
    clientPayload.notes = clientPayload.internal_notes || null;
    delete clientPayload.internal_notes;
  }

  // 1. Create client record
  const newClient = await clientRepo.createClientRecord(clientPayload);

  return newClient;
}

export async function updateClientRecord(id: string, data: any) {
  const payload = { ...data, updated_at: new Date().toISOString() };

  if (payload.pan) payload.pan = payload.pan.toUpperCase();
  if (payload.gstin) payload.gstin = payload.gstin.toUpperCase();

  if (payload.pan === '') payload.pan = null;
  if (payload.gstin === '') payload.gstin = null;
  if (payload.primary_contact_email === '') payload.primary_contact_email = null;
  if (payload.group_id === '') payload.group_id = null;
  if (payload.primary_owner_id === '') payload.primary_owner_id = null;
  if (payload.category === '') payload.category = null;

  return await clientRepo.updateClientRecord(id, payload);
}

export async function assignTeamMember(clientId: string, teamUserId: string, role: string) {
  return await clientRepo.assignTeamMember(clientId, teamUserId, role);
}

export async function unassignTeamMember(assignmentId: string) {
  return await clientRepo.unassignTeamMember(assignmentId);
}

export async function createClientGroupRecord(payload: { name: string; description?: string | null }) {
  return await clientRepo.createClientGroupRecord(payload);
}

export async function updateClientGroupRecord(id: string, payload: { name?: string; description?: string | null }) {
  return await clientRepo.updateClientGroupRecord(id, payload);
}

export async function softDeleteClientGroupRecord(id: string) {
  return await clientRepo.softDeleteClientGroupRecord(id);
}
