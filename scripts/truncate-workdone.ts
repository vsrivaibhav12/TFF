import * as fs from 'fs';

const targetPath = 'components/tasks/workdone-panel.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

if (!content.includes('import { Dialog, DialogContent, DialogHeader, DialogTitle } from')) {
    content = content.replace(
        /import { Label } from '@\/components\/ui\/label';/,
        "import { Label } from '@/components/ui/label';\nimport { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';"
    );
}

if (!content.includes('const [showAll, setShowAll] = useState(false);')) {
    content = content.replace(
        /const \[showManual, setShowManual\] = useState\(false\);/,
        "const [showManual, setShowManual] = useState(false);\n  const [showAll, setShowAll] = useState(false);"
    );
}

const renderEntry = `
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium tabular-nums">{fmtHM(e.duration_minutes)}</span>
                  <span className="text-zinc-400 mx-2">·</span>
                  <span className="text-zinc-600">{e.users_profile?.full_name ?? 'You'}</span>
                  <span className="text-zinc-400 mx-2">·</span>
                  <span className="text-zinc-500 text-xs">{formatDateIST(e.work_date)}</span>
                  {e.entry_method === 'timer' && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide text-teal-600 font-semibold">
                      <Clock className="h-2.5 w-2.5" /> timer
                    </span>
                  )}
                  {e.note && <div className="text-xs text-zinc-500 truncate">{e.note}</div>}
                </div>
                {(e.user_id === currentUserId) && (
                  <button onClick={() => remove(e.id)} disabled={pending} className="text-zinc-400 hover:text-red-600 p-1" aria-label="Delete entry">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>`;

const historyReplacement = `{/* History */}
      {initial.length > 0 && (
        <div className="border-t border-zinc-100 pt-3">
          <ul className="space-y-2 pr-2">
            {initial.slice(0, 3).map((e) => (${renderEntry}
            ))}
          </ul>
          {initial.length > 3 && (
            <>
              <Button variant="ghost" size="sm" className="w-full mt-2 text-zinc-500 text-xs" onClick={() => setShowAll(true)}>
                View all {initial.length} entries
              </Button>
              <Dialog open={showAll} onOpenChange={setShowAll}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>All Work Done</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {initial.map((e) => (${renderEntry}
                      ))}
                    </ul>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}`;

content = content.replace(/{ \/\* History \*\/\}[\s\S]*?{initial\.length > 10 && <p className="text-xs text-zinc-400 mt-2">… and {initial\.length - 10} more<\/p>}\n\s*<\/div>\n\s*\)}/, historyReplacement);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Workdone panel refactored to truncate list and use Dialog');
