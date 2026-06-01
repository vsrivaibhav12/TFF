'use client';

import useSWR from 'swr';

interface CmdkResult {
  clients: any[];
  tasks: any[];
  notices: any[];
  team: any[];
  credentials: any[];
}

async function fetchCmdk(url: string): Promise<CmdkResult> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export function useCmdkSearch(query: string) {
  const { data, error, isLoading } = useSWR(
    query.length >= 2 ? `/api/cmdk/search?q=${encodeURIComponent(query)}` : null,
    fetchCmdk,
    { keepPreviousData: true, dedupingInterval: 300 }
  );

  return { results: data ?? { clients: [], tasks: [], notices: [], team: [], credentials: [] }, isLoading, error };
}
