import { ViewTabs } from '@/components/ui/view-tabs';
import { addDaysIso } from '@/lib/services/home-metrics';
import { todayIST } from '@/lib/utils';

type Params = Record<string, string | undefined>;

/** Quick date ranges for the work done list: a tab sets from and to and keeps the other filters. */
export default function WorkDoneRanges({ basePath, params }: { basePath: string; params: Params }) {
  const today = todayIST();
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday is 0
  const ranges = [
    { key: 'today', label: 'Today', from: today, to: today },
    { key: 'yesterday', label: 'Yesterday', from: addDaysIso(today, -1), to: addDaysIso(today, -1) },
    { key: 'week', label: 'This week', from: addDaysIso(today, -weekday), to: today },
    { key: 'month', label: 'This month', from: `${today.slice(0, 7)}-01`, to: today },
  ];
  const hrefFor = (from: string, to: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== 'from' && k !== 'to') qs.set(k, v);
    qs.set('from', from);
    qs.set('to', to);
    return `${basePath}?${qs.toString()}`;
  };
  return (
    <ViewTabs
      label="Date range"
      tabs={ranges.map((r) => ({ key: r.key, label: r.label, href: hrefFor(r.from, r.to), active: params.from === r.from && params.to === r.to }))}
    />
  );
}
