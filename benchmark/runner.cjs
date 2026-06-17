// === mio-previewer Benchmark Runner v2 ===
// Puppeteer 自动化，复用系统已有的 Chromium
const fs = require('fs');
const path = require('path');

// 复用后端已有的 puppeteer-core 和 Chromium
const PUPPETEER_CORE_PATH = path.resolve(__dirname, '../../mio-chat-backend/node_modules/puppeteer-core');
const CHROME_PATH = findChrome();

function findChrome() {
  // 1. 先从 puppeteer 缓存目录找
  const cacheDir = path.join(process.env.HOME || '', '.cache/puppeteer/chrome');
  if (fs.existsSync(cacheDir)) {
    const versions = fs.readdirSync(cacheDir).sort().reverse();
    for (const v of versions) {
      const p = path.join(cacheDir, v, 'chrome-linux64', 'chrome');
      if (fs.existsSync(p)) {
        console.log(`Found Chrome: ${p}`);
        return p;
      }
    }
  }
  // 2. 系统 which
  for (const bin of ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium']) {
    try {
      const result = require('child_process').execSync(`which ${bin} 2>/dev/null`, { encoding: 'utf8' }).trim();
      if (result && fs.existsSync(result)) return result;
    } catch (e) {}
  }
  return null;
}

// === 场景矩阵 ===
const SCENARIOS = [
  { name: 'token-level', chunkSize: 1,  delay: 10, repeats: 3 },
  { name: 'word-level',   chunkSize: 3,  delay: 15, repeats: 3 },
  { name: 'fast-stream',  chunkSize: 5,  delay: 10, repeats: 3 },
  { name: 'chunk-stream', chunkSize: 10, delay: 5,  repeats: 3 },
  { name: 'realistic',    chunkSize: 35, delay: 5,  repeats: 3 },
  { name: 'burst',        chunkSize: 1,  delay: 0,  repeats: 2 },
];

const RENDERERS = ['vhtml', 'mio'];
const FIXTURES = [
  { name: 'complex',    file: path.join(__dirname, 'fixtures', 'complex.md') },
  { name: 'long-medium', file: path.join(__dirname, 'fixtures', 'long-medium.md') },
  { name: 'long-large',  file: path.join(__dirname, 'fixtures', 'long-large.md') },
];

const BASE_URL = 'http://localhost:5173/benchmark/benchmark.html';

async function main() {
  if (!CHROME_PATH) {
    console.error('❌ No Chrome/Chromium found. Install: npx puppeteer browsers install chrome');
    process.exit(1);
  }

  if (!fs.existsSync(PUPPETEER_CORE_PATH)) {
    console.error(`❌ puppeteer-core not found at ${PUPPETEER_CORE_PATH}`);
    process.exit(1);
  }

  const puppeteer = require(PUPPETEER_CORE_PATH);

  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  // 汇总
  let totalRuns = 0;
  for (const fixture of FIXTURES) {
    if (!fs.existsSync(fixture.file)) continue;
    totalRuns += SCENARIOS.length * RENDERERS.length * SCENARIOS[0].repeats; // 近似
  }
  totalRuns = 0;
  for (const f of FIXTURES) {
    if (!fs.existsSync(f.file)) continue;
    for (const s of SCENARIOS) totalRuns += 2 * s.repeats;
  }
  console.log(`Total runs: ${totalRuns}\n`);

  console.log(`Launching Chrome: ${CHROME_PATH}`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(0);

  const allRuns = [];
  let runIndex = 0;

  for (const fixture of FIXTURES) {
    if (!fs.existsSync(fixture.file)) {
      console.log(`⚠️  Skipping ${fixture.name}: file not found`);
      continue;
    }
    const text = fs.readFileSync(fixture.file, 'utf8');
    console.log(`\n━━━ Fixture: ${fixture.name} (${text.length} chars) ━━━`);

    for (const scenario of SCENARIOS) {
      for (const renderer of RENDERERS) {
        for (let repeat = 0; repeat < scenario.repeats; repeat++) {
          runIndex++;
          console.log(`[${runIndex}/${totalRuns}] ${fixture.name} | ${scenario.name} | ${renderer} | r${repeat+1}`);

          try {
            await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

            // 注入 fixture
            await page.evaluate((t) => {
              if (typeof window.__mio_set_md__ === 'function') window.__mio_set_md__(t);
            }, text);

            await new Promise(r => setTimeout(r, 300));

            // 跑 benchmark
            const result = await page.evaluate(async (opts) => {
              return await window.runBenchmark(opts.renderer, {
                fixture: opts.fixture, scenario: opts.scenario,
                chunkSize: opts.chunkSize, delay: opts.delay, repeat: opts.repeat,
              });
            }, { renderer, fixture: fixture.name, scenario: scenario.name, chunkSize: scenario.chunkSize, delay: scenario.delay, repeat });

            const filename = `run-${fixture.name}-${scenario.name}-${renderer}-r${repeat}.json`;
            fs.writeFileSync(path.join(resultsDir, filename), JSON.stringify(result, null, 2));

            allRuns.push({
              file: filename, fixture: fixture.name, scenario: scenario.name,
              renderer, chunkSize: scenario.chunkSize, delay: scenario.delay, repeat,
              summary: result.summary,
            });

          } catch (err) {
            console.error(`  ❌ FAILED: ${err.message}`);
          }
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
  }

  // 写 manifest
  const manifest = {
    timestamp: Date.now(),
    totalRuns: allRuns.length,
    config: { fixtures: FIXTURES.map(f => f.name), scenarios: SCENARIOS, renderers: RENDERERS },
    runs: allRuns,
  };
  fs.writeFileSync(path.join(resultsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Done! ${allRuns.length} runs → ${resultsDir}/`);

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
