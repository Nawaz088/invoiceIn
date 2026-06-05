import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function test() {
  // Start preview server in background
  const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  
  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
    
    await page.waitForSelector('.font-display', { timeout: 10000 });
    
    const hasLogo = await page.locator('text=InvoiceIN').first().isVisible();
    const hasDashboard = await page.locator('text=Dashboard').first().isVisible();
    const hasMetrics = await page.locator('text=Invoiced This Month').isVisible();
    const hasSidebar = await page.locator('aside').first().isVisible();
    
    console.log('\n=== InvoiceIN Test Results ===');
    console.log('✓ Logo visible:', hasLogo);
    console.log('✓ Dashboard visible:', hasDashboard);
    console.log('✓ Metrics visible:', hasMetrics);
    console.log('✓ Sidebar visible:', hasSidebar);
    
    if (errors.length > 0) {
      console.log('\nConsole Errors:', errors);
    } else {
      console.log('✓ No console errors');
    }
    
    const allPassed = hasLogo && hasDashboard && hasMetrics && hasSidebar && errors.length === 0;
    
    if (allPassed) {
      console.log('\n✅ All tests passed!');
    } else {
      console.log('\n⚠️ Some checks did not pass');
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

test();
