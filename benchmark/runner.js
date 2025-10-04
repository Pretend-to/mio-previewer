const puppeteer = require('puppeteer');
const fs = require('fs');

async function runMode(page, mode) {
  // navigate if necessary
  await page.goto('http://localhost:5173/benchmark/benchmark.html', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !!window.runBenchmark);
  return await page.evaluate(async (m) => {
    return await window.runBenchmark(m);
  }, mode);
}

async function main() {
  // Try to use system Chrome if puppeteer didn't download Chromium in postinstall.
  const defaultPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ];
  const fs = require('fs');
  let executablePath = undefined;
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) { executablePath = p; break; }
  }
  const launchOptions = { headless: true };
  if (executablePath) launchOptions.executablePath = executablePath;
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  console.log('Running incremental (MdRenderer) benchmark...');
  const inc = await runMode(page, 'incremental');
  console.log('Running v-html benchmark...');
  const vhtml = await runMode(page, 'vhtml');

  const report = { timestamp: Date.now(), incremental: inc, vhtml };
  fs.writeFileSync('benchmark/report.json', JSON.stringify(report, null, 2));
  console.log('Report written to benchmark/report.json');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1) });
