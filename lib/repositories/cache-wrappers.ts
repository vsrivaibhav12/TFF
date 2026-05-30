import 'server-only';
import { cache } from 'react';
import { getTask, getTaskSteps, listTaskActivity, listTaskNotes } from './tasks';
import { getClientById } from './clients';
import { listTaskSteps as listTaskStepsFromRepo, getTaskStepCompletion } from './task-steps';

/**
 * React cache() wrappers for repository functions.
 * These deduplicate identical DB calls within a single React render pass.
 * Safe for RLS-authenticated pages because cache is per-request (not shared).
 */

export const getTaskCached = cache(getTask);
export const getClientByIdCached = cache(getClientById);
export const getTaskStepsCached = cache(getTaskSteps);
export const listTaskActivityCached = cache(listTaskActivity);
export const listTaskNotesCached = cache(listTaskNotes);
export const listTaskStepsCached = cache(listTaskStepsFromRepo);
export const getTaskStepCompletionCached = cache(getTaskStepCompletion);
