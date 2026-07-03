// Feature flags for phased rollouts. All flags default to the new/fast path.
// Set to false to instantly restore previous behavior.

/** Stream detail dock data with Suspense + SWR instead of blocking useEffect fetch. */
export const ENABLE_STREAMED_DOCK = true;
