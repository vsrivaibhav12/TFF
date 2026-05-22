'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  gradient?: boolean;
  label?: string;
  sublabel?: string;
  hideLabel?: boolean;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  color = '#0D9488',
  bgColor = '#E4E4E7',
  gradient = false,
  label,
  sublabel,
  hideLabel = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const id = useId();
  const gradientId = `progress-gradient-${id}`;

  const stroke = gradient ? `url(#${gradientId})` : color;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            {gradient && (
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#0D9488" />
              </linearGradient>
            )}
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={bgColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {!hideLabel && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
          >
            <span className="text-lg font-bold tabular-nums">{progress}%</span>
          </motion.div>
        )}
      </div>
      {label && <span className="text-xs font-medium text-zinc-700">{label}</span>}
      {sublabel && <span className="text-[10px] text-zinc-400">{sublabel}</span>}
    </div>
  );
}
