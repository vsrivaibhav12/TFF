import * as fs from 'fs';

const targetPath = 'components/shell/app-shell.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Remove state
content = content.replace(/  const \[sidebarCollapsed, setSidebarCollapsed\] = useState[\s\S]*?}, \[sidebarCollapsed\]\);\n/, '');

// 2. Replace aside
content = content.replace(
  /<aside className={cn\([\s\S]*?sidebarCollapsed \? "w-\[64px\]" : "w-\[240px\]"\n\s*\)} aria-label="Main navigation">/,
  '<aside className="hidden md:flex fixed left-3 top-3 bottom-3 flex-col rounded-[20px] shadow-sidebar border border-stone-200/50 bg-white z-30 transition-all duration-300 w-[64px] hover:w-[240px] group/aside overflow-hidden" aria-label="Main navigation">'
);

// 3. Logo container
content = content.replace(
  /<div className={cn\("flex items-center justify-between", sidebarCollapsed \? "px-2 py-4" : "px-5 py-5"\)}>/,
  '<div className="flex items-center justify-between px-2 py-4 group-hover/aside:px-5 group-hover/aside:py-5 transition-all">'
);

// 4. Logo text
content = content.replace(
  /{!sidebarCollapsed && \(\n\s*<div>/,
  '<div className="opacity-0 group-hover/aside:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">'
);
content = content.replace(
  /Fulcrum\n\s*<\/div>\n\s*<\/div>\n\s*\)}/,
  'Fulcrum\n                  </div>\n                </div>'
);

// 5. Logo image width fix
content = content.replace(
  /className="h-8 w-auto object-contain"/,
  'className="h-8 w-auto object-contain shrink-0"'
);

// 6. Remove collapse toggle
content = content.replace(/{!sidebarCollapsed && \([\s\S]*?<\/button>\n\s*\)}/, '');
content = content.replace(/{sidebarCollapsed && \([\s\S]*?<\/button>\n\s*<\/div>\n\s*\)}/, '');

// 7. Nav container
content = content.replace(
  /<nav className={cn\("flex-1 py-2 space-y-0.5 overflow-y-auto", sidebarCollapsed \? "px-1.5" : "px-3"\)} aria-label="Sidebar">/,
  '<nav className="flex-1 py-2 space-y-0.5 overflow-y-auto px-1.5 group-hover/aside:px-3 transition-all" aria-label="Sidebar">'
);

// 8. Nav labels
content = content.replace(
  /{!sidebarCollapsed && <span className="truncate">{n.label}<\/span>}/g,
  '<span className="opacity-0 group-hover/aside:opacity-100 whitespace-nowrap transition-opacity truncate">{n.label}</span>'
);

content = content.replace(
  /{!sidebarCollapsed && active && \([\s\S]*?<\/ChevronRight>|{\!sidebarCollapsed && active && \(\s*<ChevronRight className="ml-auto h-3\.5 w-3\.5 text-teal-600\/60" \/>\s*\)}/g,
  '<ChevronRight className="ml-auto h-3.5 w-3.5 text-teal-600/60 opacity-0 group-hover/aside:opacity-100 transition-opacity" />'
);

// 9. Flush sections
content = content.replace(
  /if \(sidebarCollapsed\) {[\s\S]*?} else {[\s\S]*?elements\.push\([\s\S]*?<CollapsibleSection key={currentSection} label={currentSection}>[\s\S]*?{sectionItems}[\s\S]*?<\/CollapsibleSection>[\s\S]*?\);[\s\S]*?}/,
  'elements.push(<div key={currentSection} className="px-2.5 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 opacity-0 group-hover/aside:opacity-100 transition-opacity whitespace-nowrap overflow-hidden">{currentSection}</div>);\n                    elements.push(...sectionItems);'
);

// 10. User profile box
content = content.replace(
  /<div className={cn\("mb-3 rounded-xl border border-stone-100 bg-stone-50", sidebarCollapsed \? "mx-1.5 p-2 flex justify-center" : "mx-3 p-3"\)}>/,
  '<div className="mb-3 rounded-xl border border-stone-100 bg-stone-50 mx-1.5 p-2 group-hover/aside:mx-3 group-hover/aside:p-3 flex items-center transition-all overflow-hidden">'
);

content = content.replace(
  /{!sidebarCollapsed && \(\n\s*<div className="min-w-0 flex-1">/,
  '<div className="min-w-0 flex-1 opacity-0 group-hover/aside:opacity-100 transition-opacity whitespace-nowrap overflow-hidden ml-3">'
);

content = content.replace(
  /<\/span>\n\s*<\/div>\n\s*<\/div>\n\s*\)}/,
  '</span>\n                  </div>\n                </div>'
);

// 11. Main content margin
content = content.replace(
  /<main className={cn\("flex-1 min-w-0 transition-all duration-300", sidebarCollapsed \? "md:ml-\[88px\]" : "md:ml-\[264px\]"\)}>/,
  '<main className="flex-1 min-w-0 transition-all duration-300 md:ml-[88px]">'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Successfully refactored app-shell.tsx");
