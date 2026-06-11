'use client';

interface SparklineProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  className?: string;
}

export function Sparkline({ data, color = '#0D9488', height = 40, className }: SparklineProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = data.length * 12;
  const points = data.map((d, i) => {
    const x = i * 12 + 6;
    const y = height - (d.value / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={className}>
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {data.map((d, i) => {
          const x = i * 12 + 6;
          const y = height - (d.value / max) * (height - 4) - 2;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2}
              fill={color}
              className="opacity-0 hover:opacity-100 transition-opacity"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
