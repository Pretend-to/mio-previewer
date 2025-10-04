const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function loadFixtureToPage(page, text) {
  const ok = await page.evaluate((t) => {
    if (typeof window.__mio_set_md__ === 'function') {
      try { window.__mio_set_md__(t); return true } catch (e) { return false }
    }
    return false
  }, text);
  if (!ok) throw new Error('Could not inject fixture into benchmark page');
}

async function main() {
  // Experiment grid config (can be overridden by env vars)
  const fixtures = [
    { name: 'complex', file: path.join(__dirname, 'fixtures', 'complex.md') }
    // Add more: { name: 'long-medium', file: ... }, { name: 'long-large', file: ... }
  ];
  const renderers = ['vhtml', 'mio'];
  const chunkSizes = [35]; // More realistic LLM streaming chunk size
  const delays = [5]; // More realistic streaming delay (5ms between chunks)
  const repeats = parseInt(process.env.REPEATS) || 5; // 5 repeats for statistics

  const defaultPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];
  let executablePath = undefined;
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) { executablePath = p; break; }
  }
  const launchOptions = { headless: true };
  if (executablePath) launchOptions.executablePath = executablePath;
  
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const allRuns = [];
  let runIndex = 0;

  for (const fixture of fixtures) {
    console.log(`\n=== Fixture: ${fixture.name} ===`);
    const text = fs.readFileSync(fixture.file, 'utf8');
    
    for (const renderer of renderers) {
      for (const chunkSize of chunkSizes) {
        for (const delay of delays) {
          for (let repeat = 0; repeat < repeats; repeat++) {
            runIndex++;
            console.log(`[${runIndex}/${fixtures.length * renderers.length * chunkSizes.length * delays.length * repeats}] ${fixture.name} | ${renderer} | chunk=${chunkSize} delay=${delay} repeat=${repeat+1}/${repeats}`);
            
            // Navigate to benchmark page
            await page.goto('http://localhost:5173/benchmark/benchmark.html', { waitUntil: 'networkidle2' });
            await page.waitForFunction(() => !!window.runBenchmark);
            await loadFixtureToPage(page, text);
            
            // Run benchmark
            const result = await page.evaluate(async (opts) => {
              return await window.runBenchmark(opts.renderer, {
                fixture: opts.fixture,
                chunkSize: opts.chunkSize,
                delay: opts.delay,
                repeat: opts.repeat
              });
            }, { renderer, fixture: fixture.name, chunkSize, delay, repeat });
            
            // Save individual run
            const filename = `run-${fixture.name}-${renderer}-c${chunkSize}-d${delay}-r${repeat}.json`;
            const filepath = path.join(resultsDir, filename);
            fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
            
            allRuns.push({
              file: filename,
              fixture: fixture.name,
              renderer,
              chunkSize,
              delay,
              repeat,
              aggregates: result.aggregates,
              summary: result.summary
            });
            
            // Brief wait between runs to let browser stabilize
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }
    }
  }

  // Write index manifest
  const manifestPath = path.join(resultsDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    timestamp: Date.now(),
    totalRuns: allRuns.length,
    config: { fixtures: fixtures.map(f => f.name), renderers, chunkSizes, delays, repeats },
    runs: allRuns
  }, null, 2));
  console.log(`\nWrote manifest to ${manifestPath}`);
  console.log(`Total runs: ${allRuns.length}`);

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1) });

