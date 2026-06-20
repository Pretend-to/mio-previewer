// === mio-previewer Benchmark v2 (Browser Self-Contained) ===
// 诚实地测量 mio vs v-html 在流式场景下的真实性能差异
// 用法: pnpm dev → 打开 benchmark.html → 点击 "Run All Scenarios"
import MarkdownIt from 'markdown-it'
import { createApp, h } from 'vue'
import * as Mio from '/src/index.ts'

const md = new MarkdownIt({ html: true, linkify: true })

// === DOM 引用 ===
const statusEl = document.getElementById('status')
const renderContent = document.getElementById('render-content')
const renderStats = document.getElementById('render-stats')

// === Vue 实例 ===
let mioApp = null, mioVm = null
let vhtmlApp = null, vhtmlVm = null

// === MutationObserver ===
let mutationObserver = null
let mutationStats = { added: 0, removed: 0, total: 0 }

function startMutationObserver() {
  mutationStats = { added: 0, removed: 0, total: 0 }
  mutationObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      mutationStats.total++
      mutationStats.added += m.addedNodes.length
      mutationStats.removed += m.removedNodes.length
    }
  })
  mutationObserver.observe(renderContent, { childList: true, subtree: true, characterData: true })
}

function stopMutationObserver() {
  if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null }
  return { ...mutationStats }
}

// === FPS 监控 ===
let fpsData = [], fpsRunning = false, fpsRAF = null

function startFPS() {
  fpsData = []; fpsRunning = true
  let lastTime = performance.now(), frames = 0
  function loop() {
    if (!fpsRunning) return
    frames++
    const now = performance.now()
    if (now - lastTime >= 1000) { fpsData.push(frames); frames = 0; lastTime = now }
    fpsRAF = requestAnimationFrame(loop)
  }
  fpsRAF = requestAnimationFrame(loop)
}

function stopFPS() {
  fpsRunning = false
  if (fpsRAF) cancelAnimationFrame(fpsRAF)
  if (fpsData.length === 0) return { avg: -1, min: -1, max: -1 }
  return {
    avg: fpsData.reduce((a, b) => a + b, 0) / fpsData.length,
    min: Math.min(...fpsData),
    max: Math.max(...fpsData),
    samples: fpsData
  }
}

// === 环境元信息 ===
function collectEnvMeta() {
  return {
    userAgent: navigator.userAgent,
    cpuCores: navigator.hardwareConcurrency || -1,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    dpr: window.devicePixelRatio || 1,
    timestamp: Date.now()
  }
}

// === 挂载渲染器 ===
// === 挂载渲染器 ===
function ensureVhtmlMounted() {
  const container = document.getElementById('vhtml-app-root')
  if (!container || !vhtmlApp) {
    if (vhtmlApp) {
      try { vhtmlApp.unmount() } catch (e) {}
      vhtmlApp = null
      vhtmlVm = null
    }
    renderContent.innerHTML = '<div id="vhtml-app-root"></div>'
    vhtmlApp = createApp({
      data() { return { html: '' } },
      render() { return h('div', { innerHTML: this.html }) }
    })
    vhtmlVm = vhtmlApp.mount('#vhtml-app-root')
  }
}

function ensureMioMounted(isStreaming = true) {
  const container = document.getElementById('mio-app-root')
  if (!container || !mioApp) {
    if (mioApp) {
      try { mioApp.unmount() } catch (e) {}
      mioApp = null
      mioVm = null
    }
    renderContent.innerHTML = '<div id="mio-app-root"></div>'
    mioApp = createApp({
      components: { MdRenderer: Mio.MdRenderer },
      data() { return { md: '', _streaming: isStreaming } },
      render() {
        return h('div', null, [
          h(Mio.MdRenderer, { md: this.md, isStreaming: this._streaming })
        ])
      }
    })
    mioVm = mioApp.mount('#mio-app-root')
  } else {
    mioVm._streaming = isStreaming
    mioVm.md = ''
  }
}

// === 增量流式渲染（核心）v3 ← 修复了 paint 测量和 MAX_CHUNKS ===
async function renderIncremental(text, opts) {
  const { mode, chunkSize, delay } = opts
  const maxChunks = opts.maxChunks || 100
  const perChunkData = []

  if (mode === 'vhtml') {
    ensureVhtmlMounted()
    vhtmlVm.html = ''
  } else {
    ensureMioMounted(true)
    mioVm.md = ''
  }

  startMutationObserver()
  startFPS()

  // 修正 1: 按 chunk 次数限流，而不是按字符数
  // chunkSize=1, MAX_CHUNKS=500 → 不论文本多长都只跑前 500 个 token
  const MAX_CHUNKS = maxChunks
  let acc = ''
  const streamStart = performance.now()

  // 修正 2: 分离 v-html 的 md.render() 跟踪
  let mdRenderTimeAvg = 0
  let mdRenderCalls = 0

  for (let i = 0, chunkNum = 0; i < text.length; i += chunkSize) {
    if (chunkNum >= MAX_CHUNKS) break
    chunkNum++

    const chunk = text.slice(i, i + chunkSize)
    acc += chunk + (delay > 0 ? '' : '')

    // -- JS 阶段 Start --
    const tsBeforeJs = performance.now()

    if (mode === 'vhtml') {
      const t0 = performance.now()
      const html = md.render(acc)
      mdRenderTimeAvg += performance.now() - t0
      mdRenderCalls++
      vhtmlVm.html = html
    } else {
      mioVm.md = (mioVm.md || '') + chunk
    }

    const tsAfterJs = performance.now()
    // -- JS 阶段 End --

    // 修正 3: 用 rAF callback 的 timestamp 测帧边界（比 performance.now() 更准）
    const frameStart = await new Promise(resolve => {
      requestAnimationFrame(ts => resolve(ts))   // 第一帧开始 = 浏览器开始处理此次更新
    })
    // 修正 4: 第二帧确保 paint 完成（但只记录时间，不用于 paint 耗时计算）
    await new Promise(resolve => requestAnimationFrame(resolve))
    const tsAfterPaint = performance.now()
    const paintWaitMs = tsAfterPaint - tsAfterJs     // 纯等待耗时（含 frame scheduling）

    let totalNodes = -1, renderNodes = -1
    try {
      totalNodes = document.getElementsByTagName('*').length
      renderNodes = renderContent.getElementsByTagName('*').length
    } catch (e) {}

    // 修正 5: 记录 mutation 增量（delta），而非累积值
    perChunkData.push({
      chunkNum,
      accLength: acc.length,
      jsMs: tsAfterJs - tsBeforeJs,              // 精确: 纯 JS 执行时间
      frameLatencyMs: frameStart - tsAfterJs,     // JS 完成 → 下一帧开始的等待
      paintWaitMs,                                // 总等待时间（含两帧）
      frameStart,                                 // 帧开始时间戳（rAF 提供）
      totalNodes,
      renderNodes,
      // mutations: 只保存最终结果，在循环外聚合
    })

    if (delay > 0) await new Promise(r => setTimeout(r, delay))
  }

  const streamEnd = performance.now()
  const finalMutationStats = stopMutationObserver()
  const fps = stopFPS()

  // 聚合
  const jsTimes = perChunkData.map(d => d.jsMs)
  const frameLatencies = perChunkData.map(d => d.frameLatencyMs)

  const sorted = arr => [...arr].sort((a, b) => a - b)
  const pct = (arr, p) => { const s = sorted(arr); return s[Math.floor(s.length * p)] || s[s.length - 1] }
  const avg = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const stdDev = arr => { if (arr.length === 0) return 0; const m = avg(arr); return Math.sqrt(arr.reduce((a,v) => a+(v-m)**2,0) / arr.length) }

  // 修正 6: 加一项组装时间指标 — 总耗时里去掉 delay 才是真正的渲染耗时
  const totalChunkDelay = delay * perChunkData.length
  const renderTimeExcludingDelay = streamEnd - streamStart - totalChunkDelay

  const paintTimes = perChunkData.map(d => d.paintWaitMs)

  return {
    totalMs: streamEnd - streamStart,
    totalRenderMs: renderTimeExcludingDelay,      // 去掉 delay 的净耗时
    chunkCount: perChunkData.length,
    jsTime: {
      avg: avg(jsTimes), median: pct(jsTimes, 0.5),
      p95: pct(jsTimes, 0.95), stdDev: stdDev(jsTimes),
      total: jsTimes.reduce((a,b) => a+b, 0),
    },
    frameLatency: {
      avg: avg(frameLatencies), median: pct(frameLatencies, 0.5),
      p95: pct(frameLatencies, 0.95), stdDev: stdDev(frameLatencies),
    },
    paintTime: {
      avg: avg(paintTimes), median: pct(paintTimes, 0.5),
      p95: pct(paintTimes, 0.95), stdDev: stdDev(paintTimes),
    },
    frames: perChunkData.length,                  // 总共触发了多少帧更新
    nodes: {
      max: Math.max(...perChunkData.map(d => d.renderNodes).filter(n => n > 0), -1),
      final: perChunkData.length > 0 ? perChunkData[perChunkData.length-1].renderNodes : -1,
      stdDev: stdDev(perChunkData.map(d => d.renderNodes).filter(n => n > 0)),
    },
    mutations: finalMutationStats,
    mdParse: mdRenderCalls > 0 ? { avgMs: mdRenderTimeAvg / mdRenderCalls, totalMs: mdRenderTimeAvg, calls: mdRenderCalls } : null,
    fps,
    perChunk: perChunkData
  }
}

// === 全量渲染 ===
async function renderFull(text, mode) {
  if (mode === 'vhtml') {
    ensureVhtmlMounted()
    const t0 = performance.now()
    vhtmlVm.html = md.render(text)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    return { renderTimeMs: performance.now() - t0 }
  } else {
    ensureMioMounted(false)
    const t0 = performance.now()
    mioVm.md = text
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    return { renderTimeMs: performance.now() - t0 }
  }
}

// === 场景定义 ===
const SCENARIOS = [
  { name: 'token-level', chunkSize: 1,  delay: 10 },
  { name: 'word-level',   chunkSize: 3,  delay: 15 },
  { name: 'fast-stream',  chunkSize: 5,  delay: 10 },
  { name: 'chunk-stream', chunkSize: 10, delay: 5  },
  { name: 'realistic',    chunkSize: 35, delay: 5  },
  { name: 'burst',        chunkSize: 1,  delay: 0  },
]

const REPEATS = 3

// === 加载 fixture ===
async function loadFixture(name) {
  // 先用预置 fixture
  const fixtures = ['complex', 'long-medium', 'long-large']
  if (fixtures.includes(name)) {
    const resp = await fetch(`/benchmark/fixtures/${name}.md`)
    return await resp.text()
  }
  return ''
}

// === 暴露给 HTML 按钮 ===
window.runAllBenchmarks = async function () {
  const results = []
  const fixtures = [
    { name: 'complex', label: 'Complex (1.5KB)' },
    { name: 'long-medium', label: 'Long-Medium (2KB)' },
    { name: 'long-large', label: 'Long-Large (9KB)' },
  ]

  const repeatsSelect = document.getElementById('repeats')
  const maxChunksInput = document.getElementById('maxChunks')
  const repeats = repeatsSelect ? parseInt(repeatsSelect.value) || 3 : 3
  const maxChunks = maxChunksInput ? parseInt(maxChunksInput.value) || 100 : 100

  const totalOps = fixtures.length * SCENARIOS.length * 2 * repeats
  let completed = 0

  statusEl.textContent = `Starting ${totalOps} benchmark runs...`
  renderStats.textContent = ''

  for (const fixture of fixtures) {
    let text
    try {
      text = await loadFixture(fixture.name)
    } catch (e) {
      statusEl.textContent = `❌ Failed to load ${fixture.name}: ${e.message}`
      continue
    }

    statusEl.textContent = `📄 ${fixture.label} (${text.length} chars)...`

    // 先跑全量渲染
    const fullV = await renderFull(text, 'vhtml')
    const fullM = await renderFull(text, 'mio')
    results.push({
      type: 'full', fixture: fixture.name, textLength: text.length,
      vhtml: fullV, mio: fullM
    })

    // 跑流式场景
    for (const scenario of SCENARIOS) {
      for (const renderer of ['vhtml', 'mio']) {
        for (let r = 0; r < repeats; r++) {
          completed++
          const pct = Math.round(completed / totalOps * 100)
          statusEl.textContent = `[${pct}%] ${fixture.label} | ${scenario.name} | ${renderer} | rep ${r+1}/${repeats}`

          const result = await renderIncremental(text, {
            mode: renderer,
            chunkSize: scenario.chunkSize,
            delay: scenario.delay,
            maxChunks
          })

          results.push({
            type: 'streaming',
            fixture: fixture.name,
            scenario: scenario.name,
            renderer,
            repeat: r,
            chunkSize: scenario.chunkSize,
            delay: scenario.delay,
            textLength: text.length,
            result
          })

          await new Promise(res => setTimeout(res, 100))
        }
      }
    }
  }

  statusEl.textContent = `✅ Done! ${completed} runs complete. Downloading results...`

  // 下载 JSON
  const blob = new Blob([JSON.stringify({ meta: collectEnvMeta(), results }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `benchmark-results-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)

  // 快速摘要
  renderQuickSummary(results)
}

function renderQuickSummary(results) {
  const streaming = results.filter(r => r.type === 'streaming')
  const groups = {}
  for (const r of streaming) {
    const key = `${r.fixture}|${r.scenario}`
    if (!groups[key]) groups[key] = { vhtml: [], mio: [] }
    groups[key][r.renderer].push(r.result)
  }

  let html = '<h3>Quick Summary</h3><table border=1 cellpadding=4 style="font-size:12px;border-collapse:collapse">'
  html += '<tr><th>Fixture</th><th>Scenario</th><th>v-html paint(ms)</th><th>mio paint(ms)</th><th>Δ</th>'
  html += '<th>v-html mutations</th><th>mio mutations</th><th>Ratio</th></tr>'

  for (const [key, g] of Object.entries(groups)) {
    const [fixture, scenario] = key.split('|')
    const vPaints = g.vhtml.flatMap(r => r.perChunk.map(c => c.paintWaitMs || c.renderTimePaint || 0))
    const mPaints = g.mio.flatMap(r => r.perChunk.map(c => c.paintWaitMs || c.renderTimePaint || 0))
    const vMed = median(vPaints)
    const mMed = median(mPaints)
    const diff = ((mMed - vMed) / vMed * 100).toFixed(1)
    const vMuts = g.vhtml.reduce((s, r) => s + r.mutations.total, 0) / g.vhtml.length
    const mMuts = g.mio.reduce((s, r) => s + r.mutations.total, 0) / g.mio.length
    const mutRatio = (vMuts / Math.max(mMuts, 1)).toFixed(1)

    const icon = Math.abs(parseFloat(diff)) < 3 ? '≈' : parseFloat(diff) < 0 ? '✅' : ''

    html += `<tr>
      <td>${fixture}</td><td>${scenario}</td>
      <td>${vMed.toFixed(2)}</td><td>${mMed.toFixed(2)}</td>
      <td style="color:${parseFloat(diff)<-3?'green':'inherit'}">${icon} ${diff}%</td>
      <td>${vMuts.toFixed(0)}</td><td>${mMuts.toFixed(0)}</td>
      <td>${mutRatio}x</td>
    </tr>`
  }
  html += '</table>'
  renderStats.innerHTML = html
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

// === 暴露单次测试（保留兼容） ===
window.__mio_set_md__ = (txt) => { window.__mio_last_md__ = txt }

window.runBenchmark = async function (renderer, opts) {
  opts = opts || {}
  const text = window.__mio_last_md__ || ''
  const result = await renderIncremental(text, {
    mode: renderer,
    chunkSize: opts.chunkSize || 1,
    delay: opts.delay || 10,
    maxChunks: opts.maxChunks || 100
  })
  return {
    meta: { fixture: opts.fixture || 'unknown', scenario: opts.scenario || '', renderer, chunkSize: opts.chunkSize, delay: opts.delay, textLength: text.length, env: collectEnvMeta() },
    summary: {
      totalMs: result.totalMs,
      totalRenderMs: result.totalRenderMs,           // 净渲染耗时（去 delay）
      chunkCount: result.chunkCount,
      // JS 执行时间（精确、不含 frame 等待）
      jsTimeAvg: result.jsTime.avg,
      jsTimeMedian: result.jsTime.median,
      jsTimeP95: result.jsTime.p95,
      jsTimeTotal: result.jsTime.total,
      // 帧调度延迟（JS 完成 → 下一帧开始）
      frameLatencyAvg: result.frameLatency.avg,
      frameLatencyP95: result.frameLatency.p95,
      // 真实/物理 Paint 等待
      paintTimeAvg: result.paintTime.avg,
      paintTimeMedian: result.paintTime.median,
      paintTimeP95: result.paintTime.p95,
      // DOM 节点
      nodesMax: result.nodes.max,
      nodesFinal: result.nodes.final,
      nodesStdDev: result.nodes.stdDev,
      // MutationObserver
      mutationsTotal: result.mutations.total,
      mutationsAdded: result.mutations.added,
      mutationsRemoved: result.mutations.removed,
      // md.render() 耗时（仅 v-html 有值）
      mdParseAvgMs: result.mdParse?.avgMs || 0,
      mdParseTotalMs: result.mdParse?.totalMs || 0,
      fpsAvg: result.fps.avg
    },
    aggregates: result,
    perChunk: result.perChunk
  }
}

console.log('[bench-v2] Ready — click "Run All Scenarios" or use window.runBenchmark()')

// === 按钮事件绑定 ===
document.addEventListener('DOMContentLoaded', () => {
  const runAllBtn = document.getElementById('runAllBtn')
  const startSingle = document.getElementById('startSingle')
  const clearBtn = document.getElementById('clearBtn')
  const fixtureSelect = document.getElementById('fixtureSelect')
  const renderMode = document.getElementById('renderMode')
  const chunkInput = document.getElementById('chunkSize')
  const delayInput = document.getElementById('streamDelay')

  // 加载 fixture 内容
  async function loadSelectedFixture() {
    const name = fixtureSelect.value
    statusEl.textContent = `Loading ${name}.md...`
    try {
      const resp = await fetch(`/benchmark/fixtures/${name}.md`)
      const text = await resp.text()
      window.__mio_last_md__ = text
      statusEl.textContent = `Loaded ${name} (${text.length} chars)`
    } catch (e) {
      statusEl.textContent = `❌ Failed to load ${name}`
    }
  }

  // 页面加载时预加载第一个 fixture
  loadSelectedFixture()
  fixtureSelect.addEventListener('change', loadSelectedFixture)

  // Run All
  if (runAllBtn) runAllBtn.addEventListener('click', () => window.runAllBenchmarks())

  // Single run
  if (startSingle) startSingle.addEventListener('click', async () => {
    const text = window.__mio_last_md__ || ''
    if (!text) {
      statusEl.textContent = '❌ No fixture loaded'
      return
    }
    const mode = renderMode.value
    const chunkSize = parseInt(chunkInput.value) || 3
    const delay = parseInt(delayInput.value) || 15
    const maxChunksInput = document.getElementById('maxChunks')
    const maxChunks = maxChunksInput ? parseInt(maxChunksInput.value) || 100 : 100

    statusEl.textContent = `Running ${mode} chunk=${chunkSize} delay=${delay}...`
    renderStats.textContent = ''

    const result = await renderIncremental(text, { mode, chunkSize, delay, maxChunks })
    renderStats.textContent =
      `Paint: avg=${result.paintTime.avg.toFixed(2)}ms median=${result.paintTime.median.toFixed(2)}ms p95=${result.paintTime.p95.toFixed(2)}ms | ` +
      `JS: avg=${result.jsTime.avg.toFixed(2)}ms | ` +
      `Nodes: max=${result.nodes.max} final=${result.nodes.final} stdDev=${result.nodes.stdDev.toFixed(1)} | ` +
      `Mutations: ${result.mutations.total} (added=${result.mutations.added} removed=${result.mutations.removed}) | ` +
      `FPS: avg=${result.fps.avg.toFixed(1)}`
    statusEl.textContent = `✅ Done in ${result.totalMs.toFixed(0)}ms`
  })

  // Clear
  if (clearBtn) clearBtn.addEventListener('click', () => {
    renderContent.innerHTML = ''
    renderStats.textContent = ''
    statusEl.textContent = 'Cleared'
    mioApp = null; mioVm = null
    vhtmlApp = null; vhtmlVm = null
  })
})
