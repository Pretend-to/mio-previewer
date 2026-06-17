// 只跑 long-large fixture，跳过不可能的 v-html 场景
const fs = require('fs');
const path = require('path');

const PUPPETEER_CORE_PATH = path.resolve(__dirname, '../../mio-chat-backend/node_modules/puppeteer-core');
const CHROME_PATH = '/home/mio/.cache/puppeteer/chrome/linux-147.0.7727.57/chrome-linux64/chrome';

const SCENARIOS = [
  { name: 'token-level', chunkSize: 1,  delay: 10, repeats: 3, vhtml: false }, // v-html chunk=1 on 9KB = 不可能
  { name: 'word-level',   chunkSize: 3,  delay: 15, repeats: 3, vhtml: false }, // v-html chunk≈3 on 9KB ≈ 3000次rebuild, 也太慢
  { name: 'fast-stream',  chunkSize: 5,  delay: 10, repeats: 3 },
  { name: 'chunk-stream', chunkSize: 10, delay: 5,  repeats: 3 },
  { name: 'realistic',    chunkSize: 35, delay: 5,  repeats: 3 },
  { name: 'burst',        chunkSize: 1,  delay: 0,  repeats: 2 },
];
const RENDERERS = ['vhtml', 'mio'];
const FIXTURE = { name: 'long-large', file: path.join(__dirname, 'fixtures', 'long-large.md') };
const BASE_URL = 'http://localhost:5173/benchmark/benchmark.html';

async function main() {
  const puppeteer = require(PUPPETEER_CORE_PATH);
  const resultsDir = path.join(__dirname, 'results');
  const text = fs.readFileSync(FIXTURE.file, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    protocolTimeout: 300000, // 5min per protocol call
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(300000); // 5min timeout

  const total = SCENARIOS.reduce((sum, s) => sum + s.repeats * RENDERERS.length, 0);
  let runIndex = 0;

  console.log(`Fixture: ${FIXTURE.name} (${text.length} chars) ≈ ${text.length} token-level chunks\n`);

  for (const scenario of SCENARIOS) {
    if (scenario.vhtml === false) {
      console.log(`⏭️  Skipping v-html for ${scenario.name} (would take too long: ${text.length / scenario.chunkSize} full rebuilds)`);
    }
    for (const renderer of RENDERERS) {
      if (scenario.vhtml === false && renderer === 'vhtml') continue;

      for (let repeat = 0; repeat < scenario.repeats; repeat++) {
        runIndex++;
        console.log(`[${runIndex}] ${scenario.name} | ${renderer} | chunk=${scenario.chunkSize} r${repeat+1}`);

        let retries = 2;
        while (retries >= 0) {
          try {
            await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.evaluate((t) => {
              if (typeof window.__mio_set_md__ === 'function') window.__mio_set_md__(t);
            }, text);
            await new Promise(r => setTimeout(r, 300));

            const result = await page.evaluate(async (opts) => {
              return await window.runBenchmark(opts.renderer, {
                fixture: opts.fixture, scenario: opts.scenario,
                chunkSize: opts.chunkSize, delay: opts.delay, repeat: opts.repeat,
              });
            }, {
              renderer, fixture: FIXTURE.name, scenario: scenario.name,
              chunkSize: scenario.chunkSize,
              delay: scenario.delay,
              repeat,
            });

            const filename = `run-${FIXTURE.name}-${scenario.name}-${renderer}-r${repeat}.json`;
            fs.writeFileSync(path.join(resultsDir, filename), JSON.stringify(result, null, 2));
            break; // success

          } catch (err) {
            retries--;
            if (retries < 0) {
              console.error(`  ❌ ${err.message.slice(0, 100)}`);
            } else {
              console.log(`  ⚠️  Retry (${2-retries}/2): ${err.message.slice(0, 60)}`);
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  await browser.close();
  console.log(`\n✅ Done! ${runIndex} runs`);
}

main().catch(err => { console.error(err); process.exit(1); });
