// === mio-previewer Benchmark Analyzer v3 ===
// 使用 v3 指标：jsTime（精确）、DOM ops（公平）、frameLatency（帧调度）
const fs = require('fs');
const path = require('path');

// === 统计工具 ===
function stats(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  return { mean, median, p95: sorted[Math.floor(n * 0.95)] || sorted[n - 1], stdDev: Math.sqrt(sorted.reduce((a, v) => a + (v - mean) ** 2, 0) / n) };
}
function avg(arr) {
  const nums = arr.filter(v => typeof v === 'number' && isFinite(v));
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function pctDiff(a, b) { return b === 0 ? (a === 0 ? 0 : Infinity) : ((a - b) / b) * 100; }

// === 从 puppeteer manifest 加载（同时兼容 v2/v3 数据格式） ===
function loadResults(resultsDir) {
  const manifestPath = path.join(resultsDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const groups = {};
  for (const entry of manifest.runs) {
    const filepath = path.join(resultsDir, entry.file);
    if (!fs.existsSync(filepath)) continue;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const scenario = data.meta.scenario || entry.scenario || '';
    const key = `${data.meta.fixture}|${scenario}|${data.meta.chunkSize}`;
    if (!groups[key]) groups[key] = { vhtml: [], mio: [], fixture: data.meta.fixture, scenario, chunkSize: data.meta.chunkSize, delay: data.meta.delay };
    if (data.meta.renderer === 'vhtml' || data.meta.renderer === 'mio') {
      groups[key][data.meta.renderer].push(data);
    }
  }
  return { groups, meta: manifest };
}

// === 提取 JS 执行时间（兼容 v2/v3） ===
function getJsTime(run) {
  const s = run.summary || {};
  // v3 用 jsTimeMedian，v2 回退到 renderTimePaint（虽然不准但用于对比）
  return (s.jsTimeMedian || s.jsTimeAvg || s.paintTimeMedian || 0);
}
function getDomOps(run) {
  const s = run.summary || {};
  return (s.mutationsAdded || 0) + (s.mutationsRemoved || 0);
}
function getMdParseAvg(run) {
  return run.summary?.mdParseAvgMs || 0;
}
function getFps(run) {
  return run.summary?.fpsAvg || -1;
}

// === 生成报告 ===
function generateReport({ groups, meta }) {
  const lines = [];
  lines.push('# mio-previewer Benchmark Report');
  lines.push('');
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push(`**Groups analyzed**: ${Object.keys(groups).length}`);
  lines.push('');
  lines.push('> **测量说明 v3**');
  lines.push('> - `JS time`: `performance.now()` 包围 DOM 赋值操作，精度 ~0.01ms，不包含 frame 等待');
  lines.push('> - `DOM ops`: MutationObserver 统计的 `addedNodes + removedNodes`，是真实的 DOM 节点操作量');
  lines.push('> - `Frame latency`: JS 完成到下一帧开始的等待时间（rAF timestamp），反映浏览器调度开销');
  lines.push('> - `md.parse`: v-html 专属的 markdown-it 全量重解析耗时');
  lines.push('> - ❌ paint time: 不再报告，因为 headless Chrome 的 rAF 不等同真实 vsync，绝对值不可靠');
  lines.push('');

  // 按 fixture 分组
  const byFixture = {};
  for (const [key, g] of Object.entries(groups)) {
    if (!byFixture[g.fixture]) byFixture[g.fixture] = [];
    byFixture[g.fixture].push({ key, ...g });
  }

  lines.push('## Streaming Performance');
  lines.push('');

  for (const [fixture, entries] of Object.entries(byFixture)) {
    lines.push(`### Fixture: \`${fixture}\``);
    lines.push('');
    lines.push('| Scenario | chunk | v-html JS(ms) | mio JS(ms) | Δ JS | v-html DOM ops | mio DOM ops | DOM Op Ratio | DOM stdDev Δ | FPS(v/m) | v-html md.parse | Winner |');
    lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |');

    for (const g of entries) {
      // JS time
      const vJs = stats(g.vhtml.flatMap(r => {
        const pc = r.perChunk || [];
        // v3: 直接用 jsMs
        return pc.map(c => c.jsMs).filter(v => v != null && v > 0);
      }));
      const mJs = stats(g.mio.flatMap(r => {
        const pc = r.perChunk || [];
        return pc.map(c => c.jsMs).filter(v => v != null && v > 0);
      }));
      const vJsMed = vJs?.median || NaN;
      const mJsMed = mJs?.median || NaN;
      const jsDiff = isNaN(vJsMed) ? 'N/A' : `${pctDiff(mJsMed, vJsMed) > 0 ? '+' : ''}${pctDiff(mJsMed, vJsMed).toFixed(1)}%`;

      // DOM ops (仅 added + removed)
      const vDom = avg(g.vhtml.map(r => getDomOps(r)));
      const mDom = avg(g.mio.map(r => getDomOps(r)));
      const domRatio = mDom > 0 ? (vDom / mDom).toFixed(0) + 'x' : 'N/A';

      // DOM stability
      const vNodeStd = avg(g.vhtml.map(r => r.summary?.nodesStdDev || 0));
      const mNodeStd = avg(g.mio.map(r => r.summary?.nodesStdDev || 0));
      const nodeStdDiff = vNodeStd > 0 ? `${pctDiff(mNodeStd, vNodeStd).toFixed(1)}%` : 'N/A';

      // FPS
      const vFps = avg(g.vhtml.map(r => getFps(r)));
      const mFps = avg(g.mio.map(r => getFps(r)));
      const fpsStr = vFps > 0 ? `${vFps.toFixed(0)}/${mFps.toFixed(0)}` : 'N/A';

      // md.parse (v-html only)
      const mdParse = avg(g.vhtml.map(r => getMdParseAvg(r)));
      const mdParseStr = mdParse > 0 ? `${mdParse.toFixed(2)}ms` : '—';

      // Winner: DOM ops 为主，JS time 辅助
      let winIcon = '≈ tie';
      const domRatioNum = mDom > 0 ? vDom / mDom : 1;
      if (domRatioNum > 2) winIcon = '✅ mio';
      else if (!isNaN(vJsMed) && !isNaN(mJsMed) && pctDiff(mJsMed, vJsMed) < -10) winIcon = '✅ mio';
      else if (!isNaN(vJsMed) && !isNaN(mJsMed) && pctDiff(mJsMed, vJsMed) > 10) winIcon = 'v-html';

      lines.push(`| ${g.scenario} | ${g.chunkSize} | ${isNaN(vJsMed) ? 'N/A' : vJsMed.toFixed(3)} | ${isNaN(mJsMed) ? 'N/A' : mJsMed.toFixed(3)} | ${jsDiff} | ${vDom.toFixed(0)} | ${mDom.toFixed(0)} | ${domRatio} | ${nodeStdDiff} | ${fpsStr} | ${mdParseStr} | ${winIcon} |`);
    }
    lines.push('');
  }

  // Key Findings
  lines.push('## Key Findings');
  lines.push('');

  // 1. DOM ops advantage
  lines.push('### 1. DOM 操作量优势（核心指标）');
  lines.push('');
  lines.push('mio-previewer 通过 TextNode 增量 Patch，避免了 v-html 每轮全量重建 DOM 的开销：');
  lines.push('');
  const allGroupsSorted = Object.values(groups).sort((a, b) => {
    const aRatio = avg(a.vhtml.map(r => getDomOps(r))) / Math.max(avg(a.mio.map(r => getDomOps(r))), 1);
    const bRatio = avg(b.vhtml.map(r => getDomOps(r))) / Math.max(avg(b.mio.map(r => getDomOps(r))), 1);
    return bRatio - aRatio;
  });
  for (const g of allGroupsSorted.slice(0, 5)) {
    const vDom = avg(g.vhtml.map(r => getDomOps(r)));
    const mDom = avg(g.mio.map(r => getDomOps(r)));
    const ratio = mDom > 0 ? (vDom / mDom).toFixed(0) : '?';
    lines.push(`- \`${g.fixture}/${g.scenario}\` (chunk=${g.chunkSize}): v-html **${vDom.toFixed(0)}** DOM ops → mio **${mDom.toFixed(0)}** — **${ratio}x fewer**`);
  }
  lines.push('');

  // 2. JS time
  lines.push('### 2. JS 执行时间');
  lines.push('');
  lines.push('这是唯一精确测量的指标（`performance.now()` 直接包围赋值操作），不含 frame 等待噪声：');
  lines.push('');
  for (const g of allGroupsSorted.slice(0, 5)) {
    const vJsP = stats(g.vhtml.flatMap(r => (r.perChunk || []).map(c => c.jsMs).filter(v => v != null)));
    const mJsP = stats(g.mio.flatMap(r => (r.perChunk || []).map(c => c.jsMs).filter(v => v != null)));
    if (!vJsP || !mJsP) continue;
    const vMed = vJsP.median;
    const mMed = mJsP.median;
    const diff = pctDiff(mMed, vMed).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    lines.push(`- \`${g.fixture}/${g.scenario}\`: v-html ${vMed.toFixed(3)}ms vs mio ${mMed.toFixed(3)}ms (${sign}${diff}%)`);
  }
  const vJsTotal = allGroupsSorted.reduce((s, g) => s + avg(g.vhtml.flatMap(r => (r.perChunk || []).map(c => c.jsMs).filter(v => v != null))), 0);
  const mJsTotal = allGroupsSorted.reduce((s, g) => s + avg(g.mio.flatMap(r => (r.perChunk || []).map(c => c.jsMs).filter(v => v != null))), 0);
  lines.push('');

  // 3. md.parse overhead
  const vhtmlGroupsWithRender = Object.values(groups).filter(g => g.vhtml.some(r => getMdParseAvg(r) > 0));
  if (vhtmlGroupsWithRender.length > 0) {
    lines.push('### 3. v-html 的 markdown-it 重解析开销');
    lines.push('');
    lines.push('v-html 每轮增量都需要用 markdown-it 重新解析**全部累积文本**（O(n²) 时间复杂度），这是 v-html 方案隐藏的成本：');
    lines.push('');
    const totalMdParse = avg(groups['complex|token-level|1']?.vhtml?.map(r => getMdParseAvg(r)) || [0]);
    lines.push(`- complex/token-level: v-html 每 chunk 额外 ${totalMdParse.toFixed(2)}ms 用于 md.parse (不含 DOM 操作)`);
    lines.push('- mio: 直接追加原始文本，无需重解析');
    lines.push('');
  }

  // Methodology
  lines.push('---');
  lines.push('*Methodology v3*');
  lines.push('- **JS time**: `performance.now()` before/after DOM assignment — 唯一精确的指标');
  lines.push('- **DOM ops**: MutationObserver 统计 `addedNodes + removedNodes` — 不受 headless Chrome 影响');
  lines.push('- **Frame latency**: rAF callback timestamp — 仅作帧调度参考');
  lines.push('- **md.parse**: markdown-it `render()` 耗时 — 单独跟踪，不混入 JS time');
  lines.push('- **环境**: Puppeteer + HeadlessChrome/147, 8 CPU cores, Linux x64');
  lines.push('- **Max chunks**: 每个场景限 500 轮，保证长文本测试可完成');
  lines.push('');

  return lines.join('\n');
}

// === Main ===
function main() {
  const resultsDir = path.join(__dirname, 'results');
  const data = loadResults(resultsDir);
  if (data && Object.keys(data.groups).length > 0) {
    console.log(`Analyzing manifest from ${resultsDir}/ — ${Object.keys(data.groups).length} groups`);
    const report = generateReport(data);
    const outputPath = path.join(resultsDir, 'REPORT-v3.md');
    fs.writeFileSync(outputPath, report);
    console.log(`✅ Report: ${outputPath}`);
  } else {
    console.error('No data found in results/');
    process.exit(1);
  }
}
main();
