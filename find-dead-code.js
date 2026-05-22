const fs = require('fs');
const path = require('path');

// Recursively find files
function findFiles(dir, extensions, excludeDirs) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        results.push(...findFiles(fullPath, extensions, excludeDirs));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Extract exports from a file
function extractExports(filePath, content) {
  const exports = [];
  const lines = content.split('\n');
  
  const isApiRoute = filePath.endsWith('/route.ts');
  const basename = path.basename(filePath);
  const isNextConvention = ['page.tsx','page.ts','layout.tsx','layout.ts','loading.tsx','loading.ts','error.tsx','error.ts','not-found.tsx','not-found.ts','template.tsx','template.ts'].includes(basename);
  
  for (const line of lines) {
    let match;
    
    // export default function Name
    match = line.match(/^\s*export\s+default\s+function\s+(\w+)/);
    if (match) {
      exports.push({ type: 'DEFAULT', name: match[1], isNextConvention, isApiRoute });
      continue;
    }
    
    // export function Name
    match = line.match(/^\s*export\s+function\s+(\w+)/);
    if (match) {
      exports.push({ type: 'NAMED', name: match[1], isNextConvention, isApiRoute });
      continue;
    }
    
    // export const Name
    match = line.match(/^\s*export\s+const\s+(\w+)/);
    if (match) {
      exports.push({ type: 'NAMED', name: match[1], isNextConvention, isApiRoute });
      continue;
    }
    
    // export class Name
    match = line.match(/^\s*export\s+class\s+(\w+)/);
    if (match) {
      exports.push({ type: 'NAMED', name: match[1], isNextConvention, isApiRoute });
      continue;
    }
    
    // export { Name1, Name2 }
    match = line.match(/^\s*export\s*\{([^}]+)\}/);
    if (match) {
      const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(s => s);
      for (const name of names) {
        if (/^\w+$/.test(name)) {
          exports.push({ type: 'NAMED', name, isNextConvention, isApiRoute });
        }
      }
      continue;
    }
    
    // export default Name;
    match = line.match(/^\s*export\s+default\s+(\w+)\s*;?\s*$/);
    if (match) {
      exports.push({ type: 'DEFAULT', name: match[1], isNextConvention, isApiRoute });
      continue;
    }
  }
  
  return exports;
}

// Extract all imports from content
function extractImports(content) {
  const imports = new Set();
  const lines = content.split('\n');
  
  for (const line of lines) {
    let match;
    
    // import { Name1, Name2 } from '...'
    match = line.match(/import\s*\{([^}]+)\}\s*from/);
    if (match) {
      const names = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(s => s);
      for (const name of names) {
        imports.add(name);
      }
      continue;
    }
    
    // import Name from '...'
    match = line.match(/import\s+(\w+)\s+from/);
    if (match) {
      imports.add(match[1]);
      continue;
    }
    
    // import * as Name from '...'
    match = line.match(/import\s+\*\s+as\s+(\w+)\s+from/);
    if (match) {
      imports.add(match[1]);
      continue;
    }
  }
  
  return imports;
}

// Extract all import paths from content
function extractImportPaths(content) {
  const paths = new Set();
  const lines = content.split('\n');
  
  for (const line of lines) {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (match) {
      paths.add(match[1]);
    }
  }
  
  return paths;
}

// Main
const allTsFiles = findFiles('.', ['.ts', '.tsx'], ['node_modules', '.next']);

// Build export map
const exportMap = new Map();
const allExportNames = new Set();

for (const file of allTsFiles) {
  const relativeFile = './' + file.replace(/^\.\\?/, '').replace(/\\/g, '/');
  if (!relativeFile.startsWith('./components/') && !relativeFile.startsWith('./app/')) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  const exports = extractExports(relativeFile, content);
  if (exports.length > 0) {
    exportMap.set(relativeFile, exports);
    for (const exp of exports) {
      allExportNames.add(exp.name);
    }
  }
}

// Build import index
const allImports = new Set();
const allImportPaths = new Set();

for (const file of allTsFiles) {
  const relativeFile = './' + file.replace(/^\.\\?/, '').replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const imports = extractImports(content);
  const importPaths = extractImportPaths(content);
  
  for (const imp of imports) {
    allImports.add({ name: imp, importer: relativeFile });
  }
  for (const impPath of importPaths) {
    allImportPaths.add({ path: impPath, importer: relativeFile });
  }
}

// Check each export
const unused = [];

for (const [filePath, exports] of exportMap) {
  for (const exp of exports) {
    // Skip Next.js convention-based default exports
    if (exp.type === 'DEFAULT' && exp.isNextConvention) continue;
    
    // Skip API route config exports
    if (exp.isApiRoute) {
      const apiConfigExports = ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS','dynamic','maxDuration','runtime','preferredRegion','revalidate'];
      if (apiConfigExports.includes(exp.name)) continue;
    }
    
    let isImported = false;
    
    // Check if name is imported somewhere else
    for (const imp of allImports) {
      if (imp.name === exp.name && imp.importer !== filePath) {
        isImported = true;
        break;
      }
    }
    
    // For default exports, also check if the file is imported by path
    if (!isImported && exp.type === 'DEFAULT') {
      const filePathWithoutExt = filePath.replace(/\.tsx?$/, '');
      const possiblePaths = [
        filePathWithoutExt,
        filePathWithoutExt.replace(/^\.\/components\//, '@/components/'),
        filePathWithoutExt.replace(/^\.\/app\//, '@/app/'),
      ];
      
      for (const impPath of allImportPaths) {
        if (impPath.importer === filePath) continue;
        if (possiblePaths.includes(impPath.path)) {
          isImported = true;
          break;
        }
      }
    }
    
    if (!isImported) {
      unused.push({ filePath, type: exp.type, name: exp.name });
    }
  }
}

// Output results
for (const item of unused) {
  console.log(`${item.filePath}|${item.type}|${item.name}`);
}

console.log(`\n=== TOTAL UNUSED: ${unused.length} ===`);
