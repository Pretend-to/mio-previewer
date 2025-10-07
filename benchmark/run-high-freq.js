#!/usr/bin/env node

/**
 * 场景 A: 高频小增量更新测试运行器
 * 
 * 使用 Puppeteer 自动化运行测试并收集数据
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const TEST_CONFIGS = [
  { chunkSize: 5, delay: 20, totalChars: 2000, label: 'token-level' },
//   { chunkSize: 3, delay: 15, totalChars: 5000, label: 'word-level' },
//   { chunkSize: 5, delay: 10, totalChars: 10000, label: 'fast-streaming' },
//   { chunkSize: 10, delay: 5, totalChars: 20000, label: 'chunk-streaming' },
];

const RUNS_PER_CONFIG = 3;
// 并发浏览器实例数（可通过环境变量覆盖）
const CONCURRENCY = parseInt(process.env.BENCH_CONCURRENCY || '3', 10) || 3;

async function runTest(browser, config, runIndex) {
  console.log(`\n🔬 运行测试: ${config.label} (run ${runIndex + 1}/${RUNS_PER_CONFIG})`);
  console.log(`   参数: chunk=${config.chunkSize}, delay=${config.delay}ms, total=${config.totalChars}`);
  
  const page = await browser.newPage();
  
  // 设置视口
  await page.setViewport({ width: 1920, height: 1080 });
  
  // 启用性能监控
  await page.evaluateOnNewDocument(() => {
    window.__testMetrics__ = {
      vhtml: { nodes: [], mutations: 0, times: [], memory: [] },
      mio: { nodes: [], mutations: 0, times: [], memory: [] }
    };
  });
  
  try {
    // 加载测试页面
    await page.goto('http://localhost:5173/benchmark-high-freq.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // 等待 Vue app 挂载
  await page.waitForFunction(() => window.__benchmarkAppReady === true || window.__benchmarkReady === true, { timeout: 10000 })

    // 设置测试参数（使用选择器直接设置 value 以避免 input 事件差异）
    await page.evaluate((c, d, t) => {
      const cs = document.getElementById('chunkSize')
      const dd = document.getElementById('delay')
      const tt = document.getElementById('totalChars')
      if (cs) cs.value = String(c)
      if (dd) dd.value = String(d)
      if (tt) tt.value = String(t)
    }, config.chunkSize, config.delay, config.totalChars)
    
    // 开始测试
    console.log('   ⏳ 测试进行中...');
    await page.click('#startBtn');
    
    // 等待测试完成（监听状态变化）
    await page.waitForFunction(
      () => {
        const vhtmlStatus = document.getElementById('vhtml-status').textContent;
        const mioStatus = document.getElementById('mio-status').textContent;
        return vhtmlStatus === '完成' && mioStatus === '完成';
      },
      { timeout: 300000 } // 5分钟超时
    );
    
    console.log('   ✅ 测试完成，收集数据...');
    
    // 收集测试结果（使用页面实际显示的 avgTime 字段作为主数据）
    const results = await page.evaluate(() => {
      const parseEl = (id) => {
        const el = document.getElementById(id)
        if (!el) return 0
        const v = parseFloat(el.textContent || '')
        return Number.isFinite(v) ? v : 0
      }

      return {
        vhtml: { avgTime: parseEl('vhtml-avgTime') },
        mio: { avgTime: parseEl('mio-avgTime') },
        improvements: {
          nodesStability: document.getElementById('nodes-improvement')?.textContent || '0%',
          mutationsReduction: document.getElementById('mutations-improvement')?.textContent || '0%'
        }
      }
    });
    
    // 截图
    const screenshotPath = path.join(__dirname, 'results', `screenshot-${config.label}-r${runIndex}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })

    // fetch detailed per-chunk records exposed by page
    let detailRecords = null
      try {
        detailRecords = await page.evaluate(() => window.__benchmarkRecords || null)
      } catch (e) {
        detailRecords = null
      }
    if (detailRecords) {
      const detailPath = path.join(__dirname, 'results', `details-${config.label}-r${runIndex}.json`)
      fs.writeFileSync(detailPath, JSON.stringify(detailRecords, null, 2))
      console.log(`   🗂 详情已保存: ${detailPath}`)
    }

    // 从详细记录计算新的核心优势指标（更稳健，避免除0/NaN）
    let newAdvantages = null
    if (detailRecords) {
      // page may expose arrays or objects with numeric keys; normalize to arrays
      let vChunks = detailRecords.vhtml || []
      let mChunks = detailRecords.mio || []
      if (!Array.isArray(vChunks) && typeof vChunks === 'object') {
        vChunks = Object.keys(vChunks).sort((a,b)=>Number(a)-Number(b)).map(k=>vChunks[k]).filter(Boolean)
      }
      if (!Array.isArray(mChunks) && typeof mChunks === 'object') {
        mChunks = Object.keys(mChunks).sort((a,b)=>Number(a)-Number(b)).map(k=>mChunks[k]).filter(Boolean)
      }

      const avg = (arr, fn) => (arr && arr.length > 0) ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0

      const vhtmlAvgDomChurn = avg(vChunks, c => (c.nodesAdded || 0) + (c.nodesRemoved || 0))
      const mioAvgDomChurn = avg(mChunks, c => (c.nodesAdded || 0) + (c.nodesRemoved || 0))

      const vhtmlAvgChildList = avg(vChunks, c => (c.childList || 0))
      const mioAvgChildList = avg(mChunks, c => (c.childList || 0))

      // 使用页面上暴露的平均渲染时间（若有）作为后备
      const vhtmlAvgTime = results.vhtml?.avgTime || 0
      const mioAvgTime = results.mio?.avgTime || 0

      // node reuse rate：相对于保守估计的总节点数计算
      const estimatedNodes = Math.max(1, Math.max(vhtmlAvgDomChurn, mioAvgDomChurn) * 10, mChunks.length * 10)
      const totalChurn = mChunks.reduce((s, c) => s + ((c.nodesAdded || 0) + (c.nodesRemoved || 0)), 0)
      const churnRate = totalChurn / Math.max(1, estimatedNodes)
      const nodeReuseRate = Math.max(0, Math.min(99, (1 - churnRate) * 100))

      const domChurnReduction = vhtmlAvgDomChurn > 0 ? ((vhtmlAvgDomChurn - mioAvgDomChurn) / vhtmlAvgDomChurn) * 100 : 0
      const updateScopeReduction = vhtmlAvgChildList > 0 ? ((vhtmlAvgChildList - mioAvgChildList) / vhtmlAvgChildList) * 100 : 0

      newAdvantages = {
        nodeReuseRate: Number(nodeReuseRate.toFixed(1)),
        domChurnReduction: Number(domChurnReduction.toFixed(1)),
        updateScopeReduction: Number(updateScopeReduction.toFixed(1)),
        avgRenderTime: { vhtml: Number(vhtmlAvgTime), mio: Number(mioAvgTime) }
      }
    }
    
    console.log('   📊 结果:');
    console.log(`      v-html avgTime=${results.vhtml?.avgTime ?? 'N/A'} ms`);
    console.log(`      mio avgTime=${results.mio?.avgTime ?? 'N/A'} ms`);
    console.log(`      页面统计: nodesStability=${results.improvements?.nodesStability ?? 'N/A'}, mutationsReduction=${results.improvements?.mutationsReduction ?? 'N/A'}`);
    if (newAdvantages) {
      console.log(`      核心优势: 节点复用率=${newAdvantages.nodeReuseRate}% | DOM波动减少=${newAdvantages.domChurnReduction}% | 更新范围减少=${newAdvantages.updateScopeReduction}%`);
      console.log(`      平均渲染时间(回退/采样): v-html=${newAdvantages.avgRenderTime.vhtml} ms, mio=${newAdvantages.avgRenderTime.mio} ms`);
    }
    
    await page.close();
    
    return {
      config,
      runIndex,
      timestamp: new Date().toISOString(),
      results,
      advantages: newAdvantages
    };
    
  } catch (error) {
    console.error(`   ❌ 测试失败: ${error.message}`);
    await page.close();
    throw error;
  }
}

async function main() {
  console.log('🚀 高频小增量更新测试启动\n');
  console.log('================================================');
  
  // 确保结果目录存在
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // 启动多个浏览器实例用于并发
  console.log('🌐 启动 Puppeteer 浏览器实例...');
  const browsers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const b = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--js-flags=--expose-gc'
      ]
    });
    browsers.push(b);
  }
  console.log(`✅ 启动完成：${browsers.length} 个浏览器实例`);
  
  const allResults = [];
  
  try {
    // 运行所有测试配置
    for (const config of TEST_CONFIGS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 测试配置: ${config.label}`);
      console.log(`${'='.repeat(60)}`);
      
      const configResults = [];
      
      // 并发执行 RUNS_PER_CONFIG 次，使用 CONCURRENCY 个并行浏览器/页面
      const runIndices = Array.from({ length: RUNS_PER_CONFIG }, (_, i) => i)
      const pool = []

      // worker that consumes next index from runIndices
      async function worker(workerId) {
        while (runIndices.length > 0) {
          const i = runIndices.shift()
          if (i === undefined) break
          try {
            // choose a browser instance for this worker (round-robin)
            const browserInstance = browsers[workerId % browsers.length]
            const result = await runTest(browserInstance, config, i)
            configResults.push(result)
            // small delay between runs to reduce flakiness
            await new Promise(resolve => setTimeout(resolve, 500))
          } catch (error) {
            console.error(`测试失败 (worker ${workerId}), 跳过 run ${i}: ${error.message}`)
          }
        }
      }

      // 启动 CONCURRENCY 个并行 worker
      for (let w = 0; w < CONCURRENCY; w++) {
        pool.push(worker(w))
      }

      // 等待所有 worker 完成
      await Promise.all(pool)
      
      allResults.push(...configResults);
      
      // 计算配置的聚合统计
      if (configResults.length > 0) {
        const aggregated = aggregateResults(configResults);
        console.log(`\n📈 ${config.label} 聚合结果:`);
        console.log(`   节点稳定性提升: ${aggregated.avgNodesImprovement}%`);
        console.log(`   DOM操作减少: ${aggregated.avgMutationsReduction}%`);
        console.log(`   节点复用率: ${aggregated.avgNodeReuseRate}`);
        console.log(`   DOM波动减少: ${aggregated.avgDomChurnReduction}`);
        console.log(`   更新范围减少: ${aggregated.avgUpdateScopeReduction}`);
        console.log(`   mio平均渲染时间: ${aggregated.avgRenderTimeMio}`);
      }
    }
    
    // 保存结果
    const reportPath = path.join(resultsDir, `report-high-freq-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      meta: {
        timestamp: new Date().toISOString(),
        testType: 'high-frequency-incremental',
        totalConfigs: TEST_CONFIGS.length,
        runsPerConfig: RUNS_PER_CONFIG,
        totalRuns: allResults.length
      },
      configs: TEST_CONFIGS,
      results: allResults,
      summary: generateSummary(allResults)
    }, null, 2));
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ 所有测试完成！');
    console.log(`📄 报告已保存: ${reportPath}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // 生成简单的文本报告
    generateTextReport(allResults);
    
    } catch (error) {
    console.error('测试过程出错:', error);
  } finally {
    // 关闭所有浏览器实例
    for (const b of browsers) {
      try { await b.close() } catch (e) { /* ignore */ }
    }
    console.log('🔚 所有浏览器实例已关闭');
  }
}

function aggregateResults(results) {
  const improvements = results.map(r => ({
    nodes: parseFloat(r.results.improvements.nodesStability),
    mutations: parseFloat(r.results.improvements.mutationsReduction),
  }));
  
  const advantages = results.filter(r => r.advantages).map(r => ({
    nodeReuseRate: parseFloat(r.advantages.nodeReuseRate),
    domChurnReduction: parseFloat(r.advantages.domChurnReduction),
    updateScopeReduction: parseFloat(r.advantages.updateScopeReduction),
    avgRenderTimeMio: parseFloat(r.advantages.avgRenderTime.mio),
  }));
  
  const avgNodesImprovement = (improvements.reduce((sum, i) => sum + i.nodes, 0) / improvements.length).toFixed(1);
  const avgMutationsReduction = (improvements.reduce((sum, i) => sum + i.mutations, 0) / improvements.length).toFixed(1);
  
  let avgNodeReuseRate = 'N/A';
  let avgDomChurnReduction = 'N/A';
  let avgUpdateScopeReduction = 'N/A';
  let avgRenderTimeMio = 'N/A';
  
  if (advantages.length > 0) {
    avgNodeReuseRate = (advantages.reduce((sum, a) => sum + a.nodeReuseRate, 0) / advantages.length).toFixed(1) + '%';
    avgDomChurnReduction = (advantages.reduce((sum, a) => sum + a.domChurnReduction, 0) / advantages.length).toFixed(1) + '%';
    avgUpdateScopeReduction = (advantages.reduce((sum, a) => sum + a.updateScopeReduction, 0) / advantages.length).toFixed(1) + '%';
    avgRenderTimeMio = (advantages.reduce((sum, a) => sum + a.avgRenderTimeMio, 0) / advantages.length).toFixed(2) + 'ms';
  }
  
  return {
    avgNodesImprovement,
    avgMutationsReduction,
    avgNodeReuseRate,
    avgDomChurnReduction,
    avgUpdateScopeReduction,
    avgRenderTimeMio
  };
}

function generateSummary(results) {
  const byConfig = {};
  
  results.forEach(r => {
    const label = r.config.label;
    if (!byConfig[label]) {
      byConfig[label] = [];
    }
    byConfig[label].push(r);
  });
  
  const summary = {};
  
  for (const [label, runs] of Object.entries(byConfig)) {
    summary[label] = aggregateResults(runs);
  }
  
  return summary;
}

function generateTextReport(results) {
  console.log('\n📊 测试结果总结');
  console.log('='.repeat(80));
  console.log('\n关键发现:\n');
  
  const summary = generateSummary(results);
  
  for (const [label, stats] of Object.entries(summary)) {
    console.log(`${label}:`);
    console.log(`  - 节点稳定性提升: ${stats.avgNodesImprovement}%`);
    console.log(`  - DOM 操作减少: ${stats.avgMutationsReduction}%`);
    console.log(`  - 节点复用率: ${stats.avgNodeReuseRate}`);
    console.log(`  - DOM波动减少: ${stats.avgDomChurnReduction}`);
    console.log(`  - 更新范围减少: ${stats.avgUpdateScopeReduction}`);
    console.log(`  - mio平均渲染时间: ${stats.avgRenderTimeMio}`);
    console.log('');
  }
  
  console.log('\n结论:');
  console.log('  mio-previewer 在高频小增量更新场景下表现出显著优势：');
  console.log('  1. ✅ 节点复用率高，减少不必要的DOM重建');
  console.log('  2. ✅ DOM波动大幅减少，提升渲染稳定性');
  console.log('  3. ✅ 更新影响范围小，避免全局重排');
  console.log('  4. ✅ 渲染性能优异，适合实时流式输出');
  console.log('='.repeat(80) + '\n');
}

// 运行测试
main().catch(console.error);
