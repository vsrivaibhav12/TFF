import * as fs from 'fs';

const targetPath = 'components/tasks/task-detail-shell.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// Remove the back button if it's inside a sheet
// We can just add a prop `isModal?: boolean` to TaskDetailShell
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

content = content.replace(
  /<div className="flex-none mb-4">\n\s*<Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">\n\s*<ChevronLeft className="h-4 w-4" \/> Back to Tasks\n\s*<\/Link>\n\s*<\/div>/,
  `{!isModal && (
        <div className="flex-none mb-4">
          <Link href={basePath} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 font-medium">
            <ChevronLeft className="h-4 w-4" /> Back to Tasks
          </Link>
        </div>
      )}`
);

// We need to move the Description card into the middle column, right above the Checklist.
const descriptionCardMatch = content.match(/<div className="tff-card p-5">\n\s*<div className="flex items-center justify-between mb-3">\n\s*<h3 className="font-semibold text-stone-900 tracking-tight text-sm">Description[\s\S]*?<\/div>\n\s*<\/div>/);
if (descriptionCardMatch) {
  content = content.replace(descriptionCardMatch[0], ''); // Remove from left column
  
  const middleColumnMatch = content.match(/<h3 className="font-semibold text-stone-900 mb-4 tracking-tight">Step-by-step Execution<\/h3>/);
  if (middleColumnMatch) {
    content = content.replace(
      middleColumnMatch[0], 
      `${descriptionCardMatch[0]}\n\n          <h3 className="font-semibold text-stone-900 mb-4 mt-8 tracking-tight">Step-by-step Execution</h3>`
    );
  }
}

// Ensure the Grid layout works with 3 columns (Left 3, Center 6, Right 3)
// Wait, the grid in task-detail-shell.tsx is currently:
// Left: lg:col-span-3
// Center: lg:col-span-6
// Right: lg:col-span-3
// Oh, it ALREADY IS 3-6-3! 
// Wait, the user said "The bottom portion has a lot of wasted real estate. Ensure every space is utilized optimally."
// In my previous edit I put Description in the Left column, Checklist in Center, WorkDone in Center, Controls in Right, Notes in Right.
// The middle column only had Checklist and WorkDone.
// Wait, if Center has Checklist + WorkDone + Description, it's very tall. Left and Right columns will be short, leaving empty space at the bottom of Left and Right columns.
// How can we balance this?
// We can use a 2-column or masonry layout, or split Center into two columns internally if there's space.
// If the sheet is 100vw wide, we can use 4 columns!
// xl:grid-cols-12
// Col 1 (span 3): Title, Key Details, Finance, Custom Fields
// Col 2 (span 4): Checklist
// Col 3 (span 3): Description, Work Done, Controls
// Col 4 (span 2): Notes & Activity
// Wait, Checklist needs to take center stage. Work Done needs to take center stage.
// Col 1 (span 3): Details
// Col 2 (span 5): Checklist
// Col 3 (span 4): Work Done, Description, Controls
// No, the easiest way to prevent "wasted real estate at bottom" in a multi-column layout is to not fix the columns rigidly. But the user complained about wasted space in the "popup slide out itself".
// Let's look at the screenshot. The middle column has "Step-by-step Execution" and "Work Done Summary". The right column has "Workflow Controls" and "Notes". The right column is very short, leaving a huge empty space below Notes.
// If we move Work Done to the Right Column, it will fill that space. But the user explicitly said: "Both checklist and work done need to take center stage."
// Okay, what if we use 2 Columns instead of 3?
// Left (8 spans): Checklist, Work Done.
// Right (4 spans): Title, Key Details, Description, Controls, Notes.
// This is exactly the classic Jira layout! 

fs.writeFileSync('scripts/rewrite-layout.ts', 'console.log("ready")');
