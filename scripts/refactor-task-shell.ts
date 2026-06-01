import * as fs from 'fs';

const targetPath = 'components/tasks/task-detail-shell.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add isModal prop
content = content.replace(
  /export default function TaskDetailShell\({[\s\S]*?clientPath,\n}: Props\) {/,
  `export default function TaskDetailShell({
  task,
  activity,
  notes,
  team,
  steps,
  cfDefs,
  cfValues,
  allLabels,
  assignedLabels,
  workdone,
  currentUserId,
  canEditSteps,
  basePath,
  clientPath,
  isModal,
}: Props & { isModal?: boolean }) {`
);

// 2. Wrap Back button in !isModal
content = content.replace(
  /<div className="flex-none mb-4">\n\s*<Link href={basePath}[\s\S]*?<\/Link>\n\s*<\/div>/,
  `{!isModal && (
        <div className="flex-none mb-4">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Tasks
          </Link>
        </div>
      )}`
);

// 3. Extract components
const titleSectionMatch = content.match(/<div className="space-y-4">[\s\S]*?{task\.labels && task\.labels\.length > 0 && \([\s\S]*?<\/div>\n\s*\)}[\s\S]*?<\/div>/);
const titleSection = titleSectionMatch ? titleSectionMatch[0] : '';

const detailsSectionMatch = content.match(/<div className="tff-card p-5">\n\s*<h3 className="font-semibold mb-3 text-stone-900 tracking-tight text-sm">Key Details<\/h3>[\s\S]*?<\/dl>\n\s*<\/div>/);
const detailsSection = detailsSectionMatch ? detailsSectionMatch[0] : '';

const descSectionMatch = content.match(/<div className="tff-card p-5">\n\s*<div className="flex items-center justify-between mb-3">\n\s*<h3 className="font-semibold text-stone-900 tracking-tight text-sm">Description[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/); // wait, need to be careful with nested divs
// Actually, it's safer to rebuild the layout structure by replacing the grid completely.

const gridStart = content.indexOf('<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">');
const gridEnd = content.lastIndexOf('</div>\n    </div>\n  );\n}');

const customFieldsPanelMatch = content.match(/<CustomFieldsPanel [\s\S]*?\/>/);
const customFieldsPanel = customFieldsPanelMatch ? customFieldsPanelMatch[0] : '';

const checklistMatch = content.match(/<div className="w-full">\n\s*<h3 className="font-semibold text-stone-900 mb-4 tracking-tight">Step-by-step Execution<\/h3>[\s\S]*?<\/div>/);
const checklistSection = checklistMatch ? checklistMatch[0] : '';

const workdoneMatch = content.match(/<div className="w-full">\n\s*<h3 className="font-semibold text-stone-900 mb-4 tracking-tight">Work Done Summary<\/h3>[\s\S]*?<\/div>/);
const workdoneSection = workdoneMatch ? workdoneMatch[0] : '';

const workflowControlsMatch = content.match(/<div className="space-y-3 tff-card p-5">\n\s*<h3 className="font-semibold mb-1 text-stone-900 tracking-tight text-sm">Workflow Controls<\/h3>[\s\S]*?<\/div>\n\s*<\/div>/);
const workflowControlsSection = workflowControlsMatch ? workflowControlsMatch[0] : '';

const financeMatch = content.match(/<div className="tff-card p-5 relative group">\n\s*<h3 className="font-semibold mb-3 text-stone-900 tracking-tight text-sm">Finance & Ref<\/h3>[\s\S]*?<\/div>\n\s*<\/div>/);
const financeSection = financeMatch ? financeMatch[0] : '';

const tabsMatch = content.match(/<div className="flex-1 flex flex-col min-h-\[400px\] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">[\s\S]*?<\/Tabs>\n\s*<\/div>/);
const tabsSection = tabsMatch ? tabsMatch[0] : '';

const descMatch = content.match(/<div className="tff-card p-5">\n\s*<div className="flex items-center justify-between mb-3">\n\s*<h3 className="font-semibold text-stone-900 tracking-tight text-sm">Description<\/h3>[\s\S]*?<\/p>\n\s*\)}[\s\S]*?<\/div>/);
const descSection = descMatch ? descMatch[0] : '';

const newGrid = `<div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-6">
        
        {/* LEFT COLUMN: Main Workspace (Center Stage) */}
        <div className="lg:col-span-8 flex flex-col gap-8 overflow-y-auto pr-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          ${titleSection}
          ${descSection}
          ${checklistSection}
          ${workdoneSection}
        </div>

        {/* RIGHT COLUMN: Sidebar (Metadata & Controls) */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-2 pb-12" style={{ scrollbarWidth: 'thin' }}>
          ${workflowControlsSection}
          ${detailsSection}
          ${financeSection}
          ${customFieldsPanel}
          ${tabsSection}
        </div>
      </div>`;

content = content.slice(0, gridStart) + newGrid + content.slice(gridEnd);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Layout restructured to 2-columns successfully.');
