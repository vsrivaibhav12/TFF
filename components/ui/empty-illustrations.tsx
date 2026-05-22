'use client';

/**
 * Bespoke SVG spot illustrations for empty states.
 * Uses the TFF design system palette: teal-500, teal-600, zinc-200, zinc-300.
 * Each illustration is ~80×80 and designed to feel premium and minimal.
 */

const TEAL = '#0D9488';
const TEAL_LIGHT = '#14B8A6';
const TEAL_PALE = '#CCFBF1';
const ZINC_200 = '#E4E4E7';
const ZINC_300 = '#D4D4D8';
const ZINC_400 = '#A1A1AA';

export function ClientsEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Person 1 (center) */}
      <circle cx="40" cy="28" r="10" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <circle cx="40" cy="25" r="4" fill={TEAL} opacity="0.3" />
      <path d="M30 44c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke={TEAL} strokeWidth="1.5" fill={TEAL_PALE} strokeLinecap="round" />
      {/* Person 2 (left, faded) */}
      <circle cx="20" cy="34" r="6" fill={ZINC_200} stroke={ZINC_300} strokeWidth="1.5" opacity="0.5" />
      <path d="M14 46c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={ZINC_300} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      {/* Person 3 (right, faded) */}
      <circle cx="60" cy="34" r="6" fill={ZINC_200} stroke={ZINC_300} strokeWidth="1.5" opacity="0.5" />
      <path d="M54 46c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={ZINC_300} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      {/* Connecting line */}
      <line x1="26" y1="50" x2="54" y2="50" stroke={ZINC_200} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3" />
      {/* Base card */}
      <rect x="22" y="56" width="36" height="14" rx="4" stroke={ZINC_300} strokeWidth="1.5" fill="white" />
      <line x1="30" y1="63" x2="50" y2="63" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function GenericEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Box */}
      <path d="M40 14l22 10v24L40 58 18 48V24L40 14z" stroke={ZINC_300} strokeWidth="1.5" fill="white" />
      <path d="M40 14l22 10-22 10-22-10L40 14z" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <line x1="40" y1="34" x2="40" y2="58" stroke={ZINC_300} strokeWidth="1.5" />
      <line x1="62" y1="24" x2="62" y2="48" stroke={ZINC_300} strokeWidth="1.5" />
      {/* Sparkle */}
      <path d="M64 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
      <path d="M16 52l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill={TEAL_LIGHT} opacity="0.4" />
    </svg>
  );
}
