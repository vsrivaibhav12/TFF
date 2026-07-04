'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseNaturalLanguage, examplePrompts, type SmartSuggestion } from '@/lib/cmdk/natural-language';
import { cn } from '@/lib/utils';

interface CommandCenterProps {
  userRole: 'admin' | 'team' | 'client';
}

export default function CommandCenter({ userRole }: CommandCenterProps) {
  const router = useRouter();
  const basePath = userRole === 'admin' ? '/admin' : userRole === 'client' ? '/portal' : '/team';
  const [q, setQ] = useState('');

  const suggestion = useMemo(
    () => (q.trim().length >= 3 ? parseNaturalLanguage(q, basePath, userRole) : null),
    [q, basePath, userRole],
  );

  function execute(s: SmartSuggestion) {
    router.push(s.href);
  }

  const Icon = suggestion?.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Command center</h1>
        <p className="text-zinc-500">Type what you want to do in plain language.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestion) {
              e.preventDefault();
              execute(suggestion);
            }
          }}
          placeholder="e.g. tasks due this week, go to clients, create task for Acme"
          className="pl-10 h-12 text-base"
          data-testid="command-center-input"
        />
      </div>

      {suggestion && (
        <Card className="border-teal-100 bg-teal-50/40">
          <CardContent className="p-4">
            <button
              onClick={() => execute(suggestion)}
              className="w-full flex items-center gap-4 text-left"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 shrink-0">
                {Icon ? <Icon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-900">{suggestion.label}</div>
                <div className="text-sm text-zinc-500">{suggestion.description}</div>
              </div>
              <ArrowRight className="h-5 w-5 text-teal-600 shrink-0" />
            </button>
          </CardContent>
        </Card>
      )}

      {!suggestion && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Lightbulb className="h-4 w-4" /> Try these
          </div>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setQ(prompt)}
                className="px-3 py-1.5 text-sm border border-zinc-200 rounded-full text-zinc-600 hover:border-teal-300 hover:text-teal-700 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}>
          Open quick command palette <span className="ml-2 text-xs text-zinc-400">Ctrl K</span>
        </Button>
      </div>
    </div>
  );
}
