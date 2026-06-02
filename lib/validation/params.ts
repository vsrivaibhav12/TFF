import { z } from 'zod';

export const IdParamSchema = z.object({ id: z.string().uuid() });
export const ReportIdParamSchema = z.object({ reportId: z.string().uuid() });
export const ClientIdParamSchema = z.object({ clientId: z.string().uuid() });

export function parseParams<T extends z.ZodTypeAny>(
  params: unknown,
  schema: T
): z.infer<T> {
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new Error(`Invalid route parameter: ${result.error.errors[0]?.message}`);
  }
  return result.data;
}
