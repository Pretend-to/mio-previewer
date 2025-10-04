const fs = require('fs');
const path = require('path');

function computeStats(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = arr.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const p25 = sorted[Math.floor(n * 0.25)];
  const p75 = sorted[Math.floor(n * 0.75)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)] || sorted[n - 1];
  const min = sorted[0];
  const max = sorted[n - 1];
  
  // Variance and std dev
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return { n, mean, median, min, max, p25, p75, p95, p99, stdDev };
}

function computeEffectSize(arr1, arr2) {
  // Cohen's d: (mean1 - mean2) / pooled_std
  if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return null;
  const mean1 = arr1.reduce((a, b) => a + b, 0) / arr1.length;
  const mean2 = arr2.reduce((a, b) => a + b, 0) / arr2.length;
  const var1 = arr1.reduce((acc, val) => acc + Math.pow(val - mean1, 2), 0) / arr1.length;
  const var2 = arr2.reduce((acc, val) => acc + Math.pow(val - mean2, 2), 0) / arr2.length;
  const pooledStd = Math.sqrt((var1 + var2) / 2);
  if (pooledStd === 0) return null;
  return (mean1 - mean2) / pooledStd;
}

function main() {
  const resultsDir = path.join(__dirname, 'results');
  const manifestPath = path.join(resultsDir, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    console.error('No manifest.json found. Run the benchmark first.');
    process.exit(1);
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`Analyzing ${manifest.totalRuns} runs...`);
  
  // Group runs by (fixture, chunkSize, delay, renderer)
  const groups = {};
  for (const run of manifest.runs) {
    const key = `${run.fixture}-c${run.chunkSize}-d${run.delay}`;
    if (!groups[key]) groups[key] = { vhtml: [], mio: [] };
    if (run.renderer === 'vhtml' || run.renderer === 'mio') {
      groups[key][run.renderer].push(run);
    }
  }
  
  const comparisons = [];
  
  for (const [key, data] of Object.entries(groups)) {
    const vhtmlRuns = data.vhtml;
    const mioRuns = data.mio;
    
    if (vhtmlRuns.length === 0 || mioRuns.length === 0) continue;
    
    // Extract metrics arrays
    const vhtmlAvgTimes = vhtmlRuns.map(r => r.aggregates.avgPerChunk);
    const mioAvgTimes = mioRuns.map(r => r.aggregates.avgPerChunk);
    const vhtmlP95 = vhtmlRuns.map(r => r.aggregates.p95PerChunk);
    const mioP95 = mioRuns.map(r => r.aggregates.p95PerChunk);
    const vhtmlMaxNodes = vhtmlRuns.map(r => r.aggregates.maxNodes);
    const mioMaxNodes = mioRuns.map(r => r.aggregates.maxNodes);
    const vhtmlFinalNodes = vhtmlRuns.map(r => r.aggregates.finalNodes);
    const mioFinalNodes = mioRuns.map(r => r.aggregates.finalNodes);
    
    const statsAvgTime = {
      vhtml: computeStats(vhtmlAvgTimes),
      mio: computeStats(mioAvgTimes),
      effectSize: computeEffectSize(vhtmlAvgTimes, mioAvgTimes)
    };
    
    const statsP95 = {
      vhtml: computeStats(vhtmlP95),
      mio: computeStats(mioP95),
      effectSize: computeEffectSize(vhtmlP95, mioP95)
    };
    
    const statsMaxNodes = {
      vhtml: computeStats(vhtmlMaxNodes),
      mio: computeStats(mioMaxNodes),
      effectSize: computeEffectSize(vhtmlMaxNodes, mioMaxNodes)
    };
    
    const statsFinalNodes = {
      vhtml: computeStats(vhtmlFinalNodes),
      mio: computeStats(mioFinalNodes),
      effectSize: computeEffectSize(vhtmlFinalNodes, mioFinalNodes)
    };
    
    comparisons.push({
      group: key,
      fixture: vhtmlRuns[0].fixture,
      chunkSize: vhtmlRuns[0].chunkSize,
      delay: vhtmlRuns[0].delay,
      n: vhtmlRuns.length,
      avgPerChunk: statsAvgTime,
      p95PerChunk: statsP95,
      maxNodes: statsMaxNodes,
      finalNodes: statsFinalNodes
    });
  }
  
  // Write analysis report
  const reportPath = path.join(resultsDir, 'analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: Date.now(),
    config: manifest.config,
    comparisons
  }, null, 2));
  console.log(`\nWrote analysis report to ${reportPath}`);
  
  // Print summary to console
  console.log('\n=== SUMMARY ===\n');
  for (const c of comparisons) {
    console.log(`Group: ${c.group} (n=${c.n})`);
    console.log(`  avgPerChunk (ms):`);
    console.log(`    v-html: median=${c.avgPerChunk.vhtml.median.toFixed(2)} p95=${c.avgPerChunk.vhtml.p95.toFixed(2)} std=${c.avgPerChunk.vhtml.stdDev.toFixed(2)}`);
    console.log(`    mio:    median=${c.avgPerChunk.mio.median.toFixed(2)} p95=${c.avgPerChunk.mio.p95.toFixed(2)} std=${c.avgPerChunk.mio.stdDev.toFixed(2)}`);
    console.log(`    effect size (Cohen's d): ${c.avgPerChunk.effectSize ? c.avgPerChunk.effectSize.toFixed(3) : 'N/A'}`);
    console.log(`  p95PerChunk (ms):`);
    console.log(`    v-html: median=${c.p95PerChunk.vhtml.median.toFixed(2)} p95=${c.p95PerChunk.vhtml.p95.toFixed(2)}`);
    console.log(`    mio:    median=${c.p95PerChunk.mio.median.toFixed(2)} p95=${c.p95PerChunk.mio.p95.toFixed(2)}`);
    console.log(`  maxNodes:`);
    console.log(`    v-html: median=${c.maxNodes.vhtml.median.toFixed(0)} p95=${c.maxNodes.vhtml.p95.toFixed(0)}`);
    console.log(`    mio:    median=${c.maxNodes.mio.median.toFixed(0)} p95=${c.maxNodes.mio.p95.toFixed(0)}`);
    console.log(`    effect size: ${c.maxNodes.effectSize ? c.maxNodes.effectSize.toFixed(3) : 'N/A'}`);
    console.log(`  finalNodes:`);
    console.log(`    v-html: median=${c.finalNodes.vhtml.median.toFixed(0)}`);
    console.log(`    mio:    median=${c.finalNodes.mio.median.toFixed(0)}`);
    console.log('');
  }
  
  // Generate CSV for easy plotting
  const csvPath = path.join(resultsDir, 'summary.csv');
  const csvLines = ['fixture,renderer,chunkSize,delay,repeat,avgPerChunk,p95PerChunk,maxNodes,finalNodes'];
  for (const run of manifest.runs) {
    csvLines.push(`${run.fixture},${run.renderer},${run.chunkSize},${run.delay},${run.repeat},${run.aggregates.avgPerChunk},${run.aggregates.p95PerChunk},${run.aggregates.maxNodes},${run.aggregates.finalNodes}`);
  }
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`Wrote CSV summary to ${csvPath}`);
}

main();
