/**
 * Broken-link guard. Reads every page route under app/ and every internal link written in
 * the source, and fails when a link points at a page that does not exist.
 *
 * It understands links written as:
 *   href="/x"  href={'/x'}  href={`/x/${id}`}  href: '/x'  router.push('/x')  redirect('/x')
 *   and the path props used by the detail panel (clientPath, basePath, backHref, redirectTo, actionHref).
 * A `${...}` inside a link matches one path segment. A link that begins with `${...}` (for example
 * `${rolePrefix}/reports`) is tried under /admin, /team and on its own.
 *
 * Run: npm run verify:links   (also runs as part of npm test)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, relative, sep } from 'path';

export interface BrokenLink {
  file: string;
  line: number;
  link: string;
}

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'db', 'scripts', '__tests__', 'memory']);
const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Turn an app-router folder path into a regular expression for the URLs it serves. */
function routeToRegex(routeDir: string): RegExp {
  const segs = routeDir
    .split('/')
    .filter(Boolean)
    .filter((s) => !(s.startsWith('(') && s.endsWith(')'))) // route groups do not appear in URLs
    .filter((s) => !s.startsWith('@')); // parallel route slots
  const parts = segs.map((s) => {
    if (/^\[\[\.\.\..+\]\]$/.test(s)) return '(?:/.*)?';
    if (/^\[\.\.\..+\]$/.test(s)) return '/.+';
    if (/^\[.+\]$/.test(s)) return '/[^/]+';
    return '/' + escape(s);
  });
  return new RegExp('^' + (parts.join('') || '/') + '/?$');
}

/** One example URL per route, dynamic segments replaced by "x". */
function routeToExample(routeDir: string): string {
  const segs = routeDir.split('/').filter(Boolean).filter((s) => !(s.startsWith('(') && s.endsWith(')'))).filter((s) => !s.startsWith('@'));
  return '/' + segs.map((s) => (/^\[.+\]$/.test(s) ? 'x' : s)).join('/');
}

export function collectRoutes(root: string): { routes: RegExp[]; examples: string[] } {
  const appDir = join(root, 'app');
  const routes: RegExp[] = [];
  const examples: string[] = [];
  for (const file of walk(appDir)) {
    const rel = relative(appDir, file).split(sep).join('/');
    const m = rel.match(/^(.*?)(?:^|\/)?(page|route)\.(tsx|ts|js|jsx)$/);
    if (!m) continue;
    const dir = rel.replace(/(^|\/)(page|route)\.(tsx|ts|js|jsx)$/, '');
    routes.push(routeToRegex(dir));
    examples.push(routeToExample(dir).replace(/^\/$/, '/'));
  }
  return { routes, examples };
}

// A link literal in one of the supported positions. Group 1 is the literal including its quotes.
const POSITIONS = [
  /\b(?:href|clientPath|basePath|backHref|redirectTo|actionHref)\s*=\s*\{?\s*((?:'[^'\n]*')|(?:"[^"\n]*")|(?:`[^`\n]*`))/g,
  /\b(?:href|clientPath|basePath|backHref|redirectTo|actionHref)\s*:\s*((?:'[^'\n]*')|(?:"[^"\n]*")|(?:`[^`\n]*`))/g,
  // router.push / router.replace / router.prefetch. String.replace() is deliberately not matched.
  /\b[rR]outer\s*\.\s*(?:push|replace|prefetch)\s*\(\s*((?:'[^'\n]*')|(?:"[^"\n]*")|(?:`[^`\n]*`))/g,
  /\b(?:redirect|permanentRedirect)\s*\(\s*((?:'[^'\n]*')|(?:"[^"\n]*")|(?:`[^`\n]*`))/g,
];

const PLACEHOLDER = '\u0001';

function toCheckable(literal: string): string | null {
  let body = literal.slice(1, -1);
  if (literal.startsWith('`')) body = body.replace(/\$\{[^}]*\}/g, PLACEHOLDER);
  if (!body.startsWith('/') && !body.startsWith(PLACEHOLDER)) return null;
  if (body.startsWith('//')) return null;
  body = body.split(/[?#]/)[0];
  return body;
}

function isPublicFile(root: string, path: string): boolean {
  return existsSync(join(root, 'public', path.replace(/^\//, '')));
}

function matches(path: string, routes: RegExp[], examples: string[]): boolean {
  // A link without variables must match a route exactly (a literal id matches a [id] route).
  if (!path.includes(PLACEHOLDER)) return routes.some((r) => r.test(path)) || isPublicFileCached(path);

  // A link with variables: each variable stands for text within one segment, and a leading
  // variable may be a whole base path such as /admin/team. Compare against one example URL
  // per route, with dynamic segments replaced by "x".
  const parts = path.split(PLACEHOLDER).map(escape);
  const lead = path.startsWith(PLACEHOLDER);
  const body = parts.join('[^/]*');
  const re = new RegExp('^' + (lead ? '(?:/[^?]*?)?' + parts.slice(1).join('[^/]*') : body) + '/?$');
  return examples.some((u) => re.test(u));
}

let publicRoot = '';
function isPublicFileCached(p: string) {
  return !!publicRoot && isPublicFile(publicRoot, p);
}

export function findBrokenLinks(root: string = process.cwd()): BrokenLink[] {
  publicRoot = root;
  const { routes, examples } = collectRoutes(root);
  const broken: BrokenLink[] = [];
  for (const dir of ['app', 'components', 'lib']) {
    const base = join(root, dir);
    if (!existsSync(base)) continue;
    for (const file of walk(base)) {
      if (!SOURCE_EXT.test(file) || file.endsWith('.d.ts')) continue;
      const text = readFileSync(file, 'utf-8');
      const lineStarts: number[] = [0];
      for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
      const lineOf = (idx: number) => {
        let lo = 0, hi = lineStarts.length - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (lineStarts[mid] <= idx) lo = mid; else hi = mid - 1;
        }
        return lo + 1;
      };
      const seen = new Set<string>();
      for (const re of POSITIONS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
          const path = toCheckable(m[1]);
          if (!path) continue;
          const key = `${m.index}:${path}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (!matches(path, routes, examples)) {
            broken.push({ file: relative(root, file).split(sep).join('/'), line: lineOf(m.index), link: path.split(PLACEHOLDER).join('${…}') });
          }
        }
      }
    }
  }
  return broken;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/verify-links.ts')) {
  const broken = findBrokenLinks();
  if (broken.length === 0) {
    console.log('Links OK: every internal link points at a page that exists.');
  } else {
    console.error(`Broken links found (${broken.length}):`);
    for (const b of broken) console.error(`  ${b.file}:${b.line}  ${b.link}`);
    process.exit(1);
  }
}
