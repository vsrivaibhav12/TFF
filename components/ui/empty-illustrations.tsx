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

type IllustrationProps = { className?: string };
const SVG_PROPS = { width: 80, height: 80, viewBox: '0 0 80 80', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' } as const;

/** Checklist card with two ticked rows. */
export function TasksEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg {...SVG_PROPS} className={className} aria-hidden="true">
      <rect x="18" y="12" width="44" height="56" rx="6" fill="white" stroke={ZINC_300} strokeWidth="1.5" />
      <rect x="32" y="8" width="16" height="9" rx="3" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <rect x="26" y="26" width="9" height="9" rx="2.5" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <path d="M28.2 30.6l2 2 3-3.6" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="40" y1="30.5" x2="54" y2="30.5" stroke={ZINC_300} strokeWidth="2" strokeLinecap="round" />
      <rect x="26" y="42" width="9" height="9" rx="2.5" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <path d="M28.2 46.6l2 2 3-3.6" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="40" y1="46.5" x2="50" y2="46.5" stroke={ZINC_300} strokeWidth="2" strokeLinecap="round" />
      <rect x="26" y="58" width="9" height="6" rx="2" stroke={ZINC_300} strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M64 16l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
    </svg>
  );
}

/** Open tray with a message arriving. */
export function InboxEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg {...SVG_PROPS} className={className} aria-hidden="true">
      <rect x="26" y="12" width="28" height="22" rx="4" fill="white" stroke={ZINC_300} strokeWidth="1.5" />
      <line x1="32" y1="20" x2="48" y2="20" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="26" x2="43" y2="26" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 44l8-12h40l8 12v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V44z" fill="white" stroke={ZINC_300} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 44h16c1.5 0 2.5 1 3 2.5.8 2.4 2.8 3.5 5 3.5h8c2.2 0 4.2-1.1 5-3.5.5-1.5 1.5-2.5 3-2.5h16" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M64 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
    </svg>
  );
}

/** Key on a card, for DSC and credentials. */
export function KeyEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg {...SVG_PROPS} className={className} aria-hidden="true">
      <rect x="12" y="24" width="56" height="38" rx="6" fill="white" stroke={ZINC_300} strokeWidth="1.5" />
      <line x1="20" y1="54" x2="40" y2="54" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="38" r="8" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <circle cx="30" cy="38" r="2.5" fill="white" stroke={TEAL} strokeWidth="1.5" />
      <path d="M38 38h20M52 38v6M58 38v4" stroke={TEAL} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M62 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
    </svg>
  );
}

/** Bars on an axis, for reports with no data. */
export function ChartEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg {...SVG_PROPS} className={className} aria-hidden="true">
      <path d="M14 14v52h52" stroke={ZINC_300} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="44" width="10" height="22" rx="2" fill={ZINC_200} stroke={ZINC_300} strokeWidth="1.5" />
      <rect x="37" y="32" width="10" height="34" rx="2" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <rect x="52" y="22" width="10" height="44" rx="2" fill="white" stroke={ZINC_300} strokeWidth="1.5" strokeDasharray="3 3" />
      <path d="M64 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
    </svg>
  );
}

/** Page with a folded corner, for requests, logs and imports. */
export function DocumentEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg {...SVG_PROPS} className={className} aria-hidden="true">
      <path d="M20 12h28l12 12v40a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill="white" stroke={ZINC_300} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M48 12v10a2 2 0 0 0 2 2h10" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="24" y1="36" x2="52" y2="36" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="44" x2="52" y2="44" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
      <line x1="24" y1="52" x2="40" y2="52" stroke={ZINC_200} strokeWidth="2" strokeLinecap="round" />
      <path d="M66 52l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
    </svg>
  );
}

/** Check mark in a badge, for "nothing needs attention". */
export function AllClearEmptyIllustration({ className }: IllustrationProps) {
  return (
    <svg {...SVG_PROPS} className={className} aria-hidden="true">
      <circle cx="40" cy="40" r="24" fill={TEAL_PALE} stroke={TEAL} strokeWidth="1.5" />
      <circle cx="40" cy="40" r="31" stroke={ZINC_200} strokeWidth="1.5" strokeDasharray="3 4" />
      <path d="M29 41l8 8 15-17" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={TEAL} opacity="0.5" />
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
