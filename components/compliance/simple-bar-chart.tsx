'use client';

interface Series {
  name: string;
  data: number[];
  color: string;
}

interface Props {
  categories: string[];
  series: Series[];
  height?: number;
}

export default function SimpleBarChart({ categories, series, height = 280 }: Props) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));

  return (
    <div style={{ height }} className="w-full">
      <div className="flex h-full items-end gap-6 px-2 pb-8 border-b border-zinc-200">
        {categories.map((cat, i) => {
          const stack = series.map((s) => ({ name: s.name, value: s.data[i] ?? 0, color: s.color }));
          const total = stack.reduce((sum, s) => sum + s.value, 0);
          return (
            <div key={cat} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="w-full flex items-end justify-center gap-0.5" style={{ height: height - 60 }}>
                {stack.map((s) => (
                  <div
                    key={s.name}
                    className="w-full rounded-t"
                    style={{
                      height: `${(s.value / max) * (height - 60)}px`,
                      backgroundColor: s.color,
                      opacity: s.value === 0 ? 0 : 1,
                      minHeight: s.value > 0 ? 4 : 0,
                    }}
                    title={`${s.name}: ${s.value}`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-zinc-600 truncate w-full text-center">{cat}</span>
              <span className="text-xs tabular-nums text-zinc-400">{total}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
