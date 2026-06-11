/**
 * Semantic colour system for The Fiscal Fulcrum.
 * Every colour means something — no random splatter.
 */

export const SERVICE_COLOURS: Record<string, { bg: string; text: string; border: string; lightBg: string }> = {
  gst: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', lightBg: 'bg-blue-50' },
  tds: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', lightBg: 'bg-indigo-50' },
  income_tax: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-200', lightBg: 'bg-purple-50' },
  compliance: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-200', lightBg: 'bg-indigo-50' },
  bizlens: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', lightBg: 'bg-emerald-50' },
  vcfo: { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-200', lightBg: 'bg-amber-50' },
  advisory: { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-200', lightBg: 'bg-amber-50' },
  default: { bg: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-200', lightBg: 'bg-teal-50' },
};

export const STATUS_COLOURS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  in_progress: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  review: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  completed: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  cancelled: { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200', dot: 'bg-zinc-500' },
  blocked: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  stuck: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  default: { bg: 'bg-zinc-50', text: 'text-zinc-700', border: 'border-zinc-200', dot: 'bg-zinc-500' },
};

export const PRIORITY_COLOURS: Record<string, { bg: string; text: string; dot: string }> = {
  urgent: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  medium: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  low: { bg: 'bg-zinc-50', text: 'text-zinc-600', dot: 'bg-zinc-400' },
};

export function getServiceColour(kind?: string | null) {
  return SERVICE_COLOURS[kind ?? ''] ?? SERVICE_COLOURS.default;
}

export function getStatusColour(status?: string | null) {
  return STATUS_COLOURS[status ?? ''] ?? STATUS_COLOURS.default;
}

export function getPriorityColour(priority?: string | null) {
  return PRIORITY_COLOURS[priority ?? ''] ?? PRIORITY_COLOURS.medium;
}
