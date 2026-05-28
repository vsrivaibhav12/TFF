/**
 * Commit all local changes and push to origin/main.
 *
 * Usage:
 *   npm run git:commit-and-push
 */
import { execSync } from 'child_process';

const message = process.argv[2] || 'fix: resolve merge conflicts, unique constraints, capability nav, action roles';

try {
  console.log('[git] adding all changes...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('[git] committing...');
  execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

  console.log('[git] pushing to origin/main...');
  execSync('git push origin main --force-with-lease', { stdio: 'inherit' });

  console.log('[git] done');
} catch (e) {
  console.error('[git] failed:', e);
  process.exit(1);
}
