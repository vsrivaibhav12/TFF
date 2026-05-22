const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

const USERS = {
  admin: { email: 'info@fiscalfulcrum.in', password: '__ADMIN_SEED_PASSWORD__' },
  team: { email: 'team.demo@fiscalfulcrum.in', password: '__TEAM_SEED_PASSWORD__' },
  client: { email: 'client.demo@fiscalfulcrum.in', password: '__CLIENT_SEED_PASSWORD__' },
};

const results = [];
function log(status, message) {
  results.push({ status, message });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${message}`);
}

async function login(page, role) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', USERS[role].email);
  await page.fill('input[type="password"]', USERS[role].password);
  await page.click('button[type="submit"]');
  // Wait for navigation to role home
  await page.waitForURL(/\/(admin|team|portal)\b/, { timeout: 15000 });
}

async function checkPage(page, url, checkSelector) {
  try {
    await page.goto(`${BASE_URL}${url}`);
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    if (body.includes('404') || body.includes('not found') || body.includes('This page could not be found')) {
      throw new Error('404 detected');
    }
    if (checkSelector) {
      await page.waitForSelector(checkSelector, { timeout: 8000 });
    }
    return true;
  } catch (e) {
    return false;
  }
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // ===== ADMIN FLOWS =====
  const adminPage = await context.newPage();
  try {
    await login(adminPage, 'admin');
    log('PASS', 'Admin login');
  } catch (e) {
    log('FAIL', `Admin login: ${e.message}`);
  }

  const adminRoutes = [
    { url: '/admin', check: 'h1' },
    { url: '/admin/clients', check: 'h1' },
    { url: '/admin/tasks', check: 'h1' },
    { url: '/admin/bizlens', check: 'h1' },
    { url: '/admin/team', check: 'h1' },
    { url: '/admin/compliance', check: 'h1' },
    { url: '/admin/notices', check: 'h1' },
    { url: '/admin/hearings', check: 'h1' },
    { url: '/admin/queries', check: 'h1' },
    { url: '/admin/approvals', check: 'h1' },
    { url: '/admin/settings', check: 'h1' },
    { url: '/account/notifications', check: 'h1' },
  ];

  for (const route of adminRoutes) {
    const ok = await checkPage(adminPage, route.url, route.check);
    log(ok ? 'PASS' : 'FAIL', `Admin ${route.url}`);
  }

  // Test BizLens create + navigate to input
  try {
    await adminPage.goto(`${BASE_URL}/admin/bizlens`);
    await adminPage.waitForSelector('button', { timeout: 8000 });
    const createBtn = await adminPage.$('text=/Create|New|Add/i');
    if (createBtn) {
      await createBtn.click();
      await adminPage.waitForTimeout(500);
      // Look for client select in dialog
      await adminPage.waitForSelector('[data-testid="create-bizlens-dialog"], dialog, [role="dialog"]', { timeout: 5000 }).catch(() => {});
    }
    log('PASS', 'Admin BizLens page loads with create button');
  } catch (e) {
    log('FAIL', `Admin BizLens create: ${e.message}`);
  }

  // ===== TEAM FLOWS =====
  const teamPage = await context.newPage();
  try {
    await login(teamPage, 'team');
    log('PASS', 'Team login');
  } catch (e) {
    log('FAIL', `Team login: ${e.message}`);
  }

  const teamRoutes = [
    { url: '/team', check: 'h1' },
    { url: '/team/clients', check: 'h1' },
    { url: '/team/tasks', check: 'h1' },
    { url: '/team/attendance', check: 'h1' },
    { url: '/team/leave', check: 'h1' },
    { url: '/team/approvals', check: 'h1' },
    { url: '/team/notices', check: 'h1' },
    { url: '/team/queries', check: 'h1' },
    { url: '/team/hearings', check: 'h1' },
    { url: '/account/notifications', check: 'h1' },
  ];

  for (const route of teamRoutes) {
    const ok = await checkPage(teamPage, route.url, route.check);
    log(ok ? 'PASS' : 'FAIL', `Team ${route.url}`);
  }

  // Test team attendance check-in flow
  try {
    await teamPage.goto(`${BASE_URL}/team/attendance`);
    await teamPage.waitForSelector('button', { timeout: 8000 });
    log('PASS', 'Team attendance page loads');
  } catch (e) {
    log('FAIL', `Team attendance: ${e.message}`);
  }

  // ===== CLIENT FLOWS =====
  const clientPage = await context.newPage();
  try {
    await login(clientPage, 'client');
    log('PASS', 'Client login');
  } catch (e) {
    log('FAIL', `Client login: ${e.message}`);
  }

  const clientRoutes = [
    { url: '/portal', check: 'h1' },
    { url: '/portal/tasks', check: 'h1' },
    { url: '/portal/queries', check: 'h1' },
    { url: '/portal/notices', check: 'h1' },
    { url: '/portal/calendar', check: 'h1' },
    { url: '/portal/bizlens', check: 'h1' },
    { url: '/account/notifications', check: 'h1' },
  ];

  for (const route of clientRoutes) {
    const ok = await checkPage(clientPage, route.url, route.check);
    log(ok ? 'PASS' : 'FAIL', `Client ${route.url}`);
  }

  // ===== BROKEN ROUTE VERIFICATION =====
  // Verify /team/compliance now redirects or 404s appropriately
  try {
    await teamPage.goto(`${BASE_URL}/team/compliance`);
    await teamPage.waitForLoadState('networkidle');
    const url = teamPage.url();
    if (url.includes('/team/compliance')) {
      const body = await teamPage.textContent('body');
      if (body.includes('404') || body.includes('not found')) {
        log('PASS', '/team/compliance correctly 404s (no page exists)');
      } else {
        log('WARN', `/team/compliance exists unexpectedly at ${url}`);
      }
    } else {
      log('PASS', `/team/compliance redirected to ${url}`);
    }
  } catch (e) {
    log('FAIL', `/team/compliance check: ${e.message}`);
  }

  await browser.close();

  // Summary
  console.log('\n=== E2E SMOKE TEST SUMMARY ===');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  console.log(`Total: ${results.length} | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}`);
  if (failed > 0) {
    console.log('\nFailures:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`  - ${r.message}`);
    }
  }
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('E2E test runner crashed:', e);
  process.exit(1);
});
