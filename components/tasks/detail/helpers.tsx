export function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-100 last:border-0">
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="font-semibold text-zinc-900 text-right">{value}</dd>
    </div>
  );
}

export function turnaroundDays(created: string, completed: string): number {
  const c = new Date(created);
  const d = new Date(completed);
  const diff = d.getTime() - c.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
