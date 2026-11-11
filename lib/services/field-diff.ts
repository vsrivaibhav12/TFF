// Pure helper: no server-only imports so both the server audit and client forms can use it.

function normalise(v: unknown): unknown {
  return v === undefined || v === '' ? null : v;
}

/** Return `{ key: { from, to } }` for each listed key whose value differs. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: readonly string[],
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    const from = normalise(before[key]);
    const to = normalise(after[key]);
    if (from !== to) out[key] = { from, to };
  }
  return out;
}
