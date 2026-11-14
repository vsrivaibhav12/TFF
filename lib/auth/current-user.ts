import 'server-only';
import { cache } from 'react';
import { loadSessionUser } from '@/lib/repositories/session-user';

/** The signed-in user, looked up once per request however many layouts, pages and helpers ask. */
export const getCurrentUser = cache(loadSessionUser);
