import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
const port = process.env.SOLVY_TEST_PORT || '3123';
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env };
// Hermetic smoke run: never call paid providers or write the user's live database.
for (const key of ['GEMINI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) env[key] = "";
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', port], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; server.stdout.on('data', chunk => { logs += chunk; }); server.stderr.on('data', chunk => { logs += chunk; });
const results = [];
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { const response = await fetch(base); ready = response.ok; } catch {}
    if (ready) break;
    if (server.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Server did not start: ${logs}`);
  results.push('Production server starts and serves homepage');
  async function post(problem, subject = 'mathematics', explanationLevel = 'step-by-step') {
    const form = new FormData(); form.set('problem', problem); form.set('subject', subject); form.set('explanationLevel', explanationLevel);
    const response = await fetch(`${base}/api/solve`, { method: 'POST', body: form });
    return { status: response.status, body: await response.json() };
  }
  for (const [text, subject, answer] of [
    ['2x+6=14', 'mathematics', 'x = 4'],
    ['differentiate x^3', 'mathematics', '3*x^2'],
    ['solve x^2-5x+6=0', 'mathematics', 'x = 2 or 3'],
    ['integrate x^2 from 0 to 3', 'mathematics', '9'],
    ['solve -2x+3 <= 7', 'mathematics', 'x >= -2'],
    ['inverse [[1,2],[3,4]]', 'mathematics', '[[-2, 1], [3/2, -1/2]]'],
    ['solve linear system [[2,1,5],[1,-1,1]]', 'mathematics', 'x1 = 2, x2 = 1'],
    ['sample variance [1,2,3]', 'mathematics', '1'],
    ['binomial at least n=3, k=2, p=1/2', 'mathematics', '1/2'],
    ['geometric sum a=2, r=3, n=4', 'mathematics', '80'],
    ['3x+1=2', 'mathematics', 'x = 1/3'],
    ['0x=0', 'mathematics', 'Infinitely many solutions (all real numbers)'],
    ['0x=5', 'mathematics', 'No solution'],
    ['A 5 kg object accelerates at 4 m/s². Find the force.', 'physics', '20 N'],
    ['A 500 g object accelerates at 200 cm/s². Find the force.', 'physics', '1 N'],
  ]) {
    const { status, body } = await post(text, subject);
    assert.equal(status, 200); assert.equal(body.solution.answer, answer);
    assert.equal(body.solution.verification.status, 'VERIFIED_WITHIN_SCOPE');
  }
  results.push('Fifteen deterministic HTTP cases, including exact fractions, solution sets and SI conversion');
  assert.equal((await post('x/0=1')).body.code, 'CLARIFICATION_REQUIRED');
  assert.equal((await post('')).status, 400);
  assert.equal((await post('2x=4', 'chemistry')).body.code, 'INVALID_OPTIONS');
  assert.equal((await post('integrate x^2 sin x')).body.code, 'AI_NOT_CONFIGURED');
  for (const problem of ['simplify x^0', 'solve (x-1)^0=1', 'simplify 0^0']) {
    assert.equal((await post(problem)).body.code, 'AI_NOT_CONFIGURED');
  }
  results.push('Domain-restricted zero powers cannot bypass unconfigured AI fallback');
  const invalid = await fetch(`${base}/api/solve`, { method: 'POST', body: 'not a form' });
  assert.equal(invalid.status, 400);
  results.push('Clarification, validation, malformed request and absent AI configuration');
  if (process.argv.includes('--browser')) {
    const browser = spawn(process.execPath, ['scripts/browser-smoke.mjs'], { env: { ...process.env, SOLVY_TEST_URL: base }, stdio: 'inherit' });
    const [code] = await once(browser, 'exit');
    assert.equal(code, 0, 'Browser smoke tests failed');
    results.push('Browser smoke checks');
  }
  console.log(JSON.stringify({ passed: results }, null, 2));
} finally {
  server.kill('SIGTERM');
  if (server.exitCode === null) await once(server, 'exit');
}
