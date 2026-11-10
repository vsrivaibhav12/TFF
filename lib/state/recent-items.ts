const STORAGE_KEY = 'tff:recent';
const MAX_RECENT = 5;
export const RECENT_UPDATED_EVENT = 'tff:recent-updated';

export interface RecentItem {
  type: string;
  id: string;
  label: string;
  timestamp: number;
}

export function trackRecentItem(item: RecentItem) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, RecentItem[]> = raw ? JSON.parse(raw) : {};
    const list = all[item.type] ?? [];
    // Remove duplicate
    const filtered = list.filter((i) => i.id !== item.id);
    filtered.unshift({ ...item, timestamp: Date.now() });
    all[item.type] = filtered.slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    // Lets the breadcrumb pick up the new label without a reload.
    window.dispatchEvent(new Event(RECENT_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

export function getRecentItems(type: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, RecentItem[]> = raw ? JSON.parse(raw) : {};
    return (all[type] ?? []).sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}
