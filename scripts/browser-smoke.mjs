// Optional real-browser regression check. Uses an installed Playwright; no production dependency.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1365, height: 1000 } });
const failures = [];
page.on('pageerror', error => failures.push(error.message));
const base = process.env.SOLVY_TEST_URL || 'http://localhost:3000';
const results = [];
try {
  await page.goto(base);
  await page.getByLabel('Your problem', { exact: true }).fill('2x + 6 = 14');
  await page.getByRole('button', { name: 'Let’s solve it' }).click();
  await page.locator('.answer strong').filter({ hasText: 'x = 4' }).waitFor();
  assert.ok(await page.locator('.katex').count() >= 2);
  assert.equal(await page.locator('.katex-error').count(), 0);
  await page.locator('.verification-status summary').click();
  assert.match(await page.locator('.verification-status').innerText(), /Original equation check: pass/);
  results.push('Linear equation, KaTeX rendering and scoped verification');
  await page.getByRole('radio', { name: 'Physics' }).check();
  await page.getByLabel('Your problem', { exact: true }).fill('A 5 kg object accelerates at 4 m/s². Find the force.');
  await page.getByRole('button', { name: 'Let’s solve it' }).click();
  await page.locator('.answer strong').filter({ hasText: '20 N' }).waitFor();
  assert.equal(await page.locator('.katex-error').count(), 0);
  results.push('Newton net-force vertical slice');
  if (process.env.SOLVY_SCREENSHOT) await page.screenshot({ path: process.env.SOLVY_SCREENSHOT, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  results.push('Mobile layout without horizontal overflow');
  await page.getByRole('radio', { name: 'Mathematics' }).check();
  await page.getByLabel('Your problem', { exact: true }).fill('x/0=1');
  await page.getByRole('button', { name: 'Let’s solve it' }).click();
  await page.getByRole('status').filter({ hasText: 'division by zero' }).waitFor();
  assert.equal(await page.getByLabel('Your problem', { exact: true }).inputValue(), 'x/0=1');
  results.push('Clarification error preserves editor input');
  await page.getByRole('button', { name: 'Upload image', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'problem.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4b8AAAAASUVORK5CYII=', 'base64') });
  await page.getByAltText('Your uploaded problem').waitFor();
  // The server/provider image boundary is covered by unit tests. Exercise browser multipart transport without a paid call.
  let capturedImage = false;
  await page.route('**/api/solve', async route => {
    capturedImage = route.request().postDataBuffer()?.includes(Buffer.from('filename="problem.png"')) ?? false;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, solution: {
      id: 'image-smoke', title: 'Image test', answer: 'Mock image answer', steps: [{ title: 'Read image', explanation: 'Mocked provider boundary.', expression: 'x=4' }],
      verification: { status: 'UNVERIFIED', scope: 'Mock response', checks: [] },
    } }) });
  });
  await page.getByRole('button', { name: 'Let’s solve it' }).click();
  await page.locator('.answer strong').filter({ hasText: 'Mock image answer' }).waitFor();
  assert.equal(capturedImage, true);
  assert.match(await page.locator('.verification-note').innerText(), /Not independently verified/);
  await page.unroute('**/api/solve');
  await page.getByRole('button', { name: 'Remove image' }).click();
  results.push('Image preview, multipart upload, AI verification label and removal (mocked response)');
  await page.evaluate(() => {
    window.SpeechRecognition = class {
      start() { setTimeout(() => { this.onresult?.({ results: [[{ transcript: '2x + 6 = 14' }]] }); this.onend?.(); }, 0); }
      stop() { this.onend?.(); }
      abort() {}
    };
  });
  await page.getByRole('button', { name: 'Use voice', exact: true }).click();
  await page.getByLabel('Problem transcript').fill('');
  await page.getByRole('button', { name: 'Start voice input' }).click();
  await page.waitForFunction(() => document.querySelector('#problem')?.value === '2x + 6 = 14');
  await page.getByRole('button', { name: 'Let’s solve it' }).click();
  await page.locator('.answer strong').filter({ hasText: 'x = 4' }).waitFor();
  results.push('Voice transcript to real deterministic API (mocked speech recognition)');
  assert.deepEqual(failures, []);
  console.log(JSON.stringify({ passed: results, pageErrors: failures }, null, 2));
} finally { await browser.close(); }
