'use client';

interface ClientHealthRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function ClientHealthRing({ score, size = 28, strokeWidth = 3 }: ClientHealthRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  let color = '#10B981'; // teal-500
  if (score < 60) color = '#EF4444'; // red-500
  else if (score < 80) color = '#F59E0B'; // amber-500

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E4E4E7"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
      />
    </svg>
  );
}
