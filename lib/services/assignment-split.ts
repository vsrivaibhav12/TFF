// Pure: spread clients over team members so nobody ends up with far more than the rest.

/** One client at a time goes to whoever currently has the fewest open tasks; ties go to the earlier person. */
export function splitByWorkload(
  clientIds: string[],
  team: Array<{ id: string; load: number }>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (team.length === 0) return out;
  const loads = team.map((m) => ({ id: m.id, load: m.load }));
  for (const clientId of clientIds) {
    let best = loads[0];
    for (const m of loads) if (m.load < best.load) best = m;
    out[clientId] = best.id;
    best.load += 1;
  }
  return out;
}
