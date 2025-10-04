import MarkdownIt from 'markdown-it'
import { createApp, h } from 'vue'
// dynamic import of the library entry
import * as Mio from '/src/index.ts'

const md = new MarkdownIt({ html: true, linkify: true })

const status = document.getElementById('status')
const fixtureSelect = document.getElementById('fixtureSelect')
const loadBtn = document.getElementById('loadBtn')
const startRenderBtn = document.getElementById('startRender')
const clearBtn = document.getElementById('clearBtn')
const renderModeSelect = document.getElementById('renderMode')
const runTypeSelect = document.getElementById('runType')
const streamDelayInput = document.getElementById('streamDelay')
const renderContent = document.getElementById('render-content')
const renderStats = document.getElementById('render-stats')
const chunkSizeInput = document.getElementById('chunkSize')
const normalizeImagesCheckbox = document.getElementById('normalizeImages')

let mioApp = null
let mioVm = null
let vhtmlApp = null
let vhtmlVm = null

// Collect environment metadata for reproducibility
function collectEnvMeta() {
  try {
    return {
      userAgent: navigator.userAgent || 'unknown',
      cpuCores: navigator.hardwareConcurrency || -1,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      dpr: window.devicePixelRatio || 1,
      memoryAvailable: (performance.memory && performance.memory.jsHeapSizeLimit) ? true : false,
      timestamp: Date.now()
    }
  } catch (e) {
    return { error: String(e) }
  }
}

// Collect current memory usage if available
function collectMemory() {
  try {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
    }
  } catch (e) {}
  return null
}

async function renderVHtml(text) {
  // mount a tiny Vue app that binds innerHTML (v-html equivalent) so we compare using Vue
  if (!vhtmlApp) {
    renderContent.innerHTML = '<div id="vhtml-app-root"></div>'
    const App = {
      data() { return { html: '' } },
      render() { return h('div', { innerHTML: this.html }) }
    }
    vhtmlApp = createApp(App)
    vhtmlVm = vhtmlApp.mount('#vhtml-app-root')
  }
  const t0 = performance.now()
  vhtmlVm.html = md.render(text)
  // wait a frame to let browser layout
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const t1 = performance.now()
  return { renderTimeMs: t1 - t0, htmlLength: document.getElementById('vhtml-app-root').innerHTML.length }
}

async function renderIncremental(text) {
  // mount Mio inside mioContent if not mounted
  if (!mioApp) {
    renderContent.innerHTML = '<div id="mio-app-root"></div>'
    const App = {
      components: { MdRenderer: Mio.MdRenderer },
      data() { return { md: '' } },
      render() { return h('div', null, [ h(Mio.MdRenderer, { md: this.md, isStreaming: false }) ]) }
    }
    mioApp = createApp(App)
    mioVm = mioApp.mount('#mio-app-root')
  }
  const t0 = performance.now()
  mioVm.md = text
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const t1 = performance.now()
  const html = document.getElementById('mio-app-root').innerHTML
  return { renderTimeMs: t1 - t0, htmlLength: html.length }
}

// Expose a helper to allow runners to inject fixtures
// expose a simple setter for the runner and also for manual loading
window.__mio_set_md__ = (txt) => { window.__mio_last_md__ = txt }

// The runner will call window.runBenchmark(renderer, opts) where renderer='vhtml'|'mio'
window.runBenchmark = async function (renderer, opts) {
  const text = window.__mio_last_md__ || ''
  const optsLocal = opts || {}
  const delay = Number(optsLocal.delay) || 20
  const chunkSize = Number(optsLocal.chunkSize) || 1
  const fixture = optsLocal.fixture || 'unknown'
  
  status.textContent = `Running ${renderer} (size=${text.length}, chunk=${chunkSize}, delay=${delay})`;
  
  // Call renderIncrementalGeneric with mode
  const renderOpts = { delay, chunkSize, mode: renderer }
  const result = await renderIncrementalGeneric(text, renderOpts)
  
  // Build complete JSON response
  const response = {
    meta: {
      fixture,
      renderer,
      chunkSize,
      delay,
      repeat: optsLocal.repeat || 0,
      env: collectEnvMeta(),
      timestampStart: Date.now() - result.totalMs,
      timestampEnd: Date.now()
    },
    perChunk: result.perChunk,
    aggregates: result.aggregates,
    summary: {
      totalMs: result.totalMs,
      totalRenderMs: result.totalRenderMs,
      chunks: result.chunks
    }
  }
  
  // Store for debugging
  window.__mio_last_result__ = response
  
  return response
}

console.log('bench.js loaded')

// --- UI glue: load fixture list and wire interactions ---
async function loadFixtureList() {
  try {
    const resp = await fetch('/benchmark/fixtures/');
    // Vite dev server serves directory listing as HTML; instead we'll hardcode known fixtures if fetch fails
    // Try to fetch specific fixture files
    const fixtures = ['complex.md','long-medium.md','long-large.md']
    for (const f of fixtures) {
      const opt = document.createElement('option')
      opt.value = f
      opt.textContent = f
      fixtureSelect.appendChild(opt)
    }
  } catch (e) {
    const fixtures = ['complex.md','long-medium.md','long-large.md']
    for (const f of fixtures) {
      const opt = document.createElement('option')
      opt.value = f
      opt.textContent = f
      fixtureSelect.appendChild(opt)
    }
  }
}

async function loadSelectedFixture() {
  const f = fixtureSelect.value
  if (!f) return
  const p = `/benchmark/fixtures/${f}`
  status.textContent = `Loading ${f}...`
  const txt = await fetch(p).then(r => r.text())
  const normalized = normalizeImagesCheckbox && normalizeImagesCheckbox.checked ? normalizeImages(txt) : txt
  window.__mio_set_md__(normalized)
  status.textContent = `Loaded ${f} (${txt.length} chars)`
}

function normalizeImages(mdText) {
  if (!mdText) return mdText
  // Replace image URLs with picsum.photos random seeds similar to App.vue
  // Match markdown image syntax ![alt](url)
  return mdText.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, alt, url) => {
    // produce a deterministic but varied picsum url using hash of url
    let hash = 0
    for (let i = 0; i < url.length; i++) hash = ((hash << 5) - hash) + url.charCodeAt(i)
    const seed = Math.abs(hash) % 1000
    const newUrl = `https://picsum.photos/400/300?random=${seed}`
    return `![${alt}](${newUrl})`
  })
}

// no input preview; left preview removed

loadFixtureList().then(() => { if (fixtureSelect.options.length) fixtureSelect.selectedIndex = 0 })

loadBtn.addEventListener('click', loadSelectedFixture)

async function renderFullVHtml(text) {
  renderContent.innerHTML = ''
  const t0 = performance.now()
  renderContent.innerHTML = md.render(text)
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const t1 = performance.now()
  return { totalMs: t1 - t0, outputLength: renderContent.innerHTML.length }
}

async function renderFullMio(text) {
  // mount if necessary
  if (!mioApp) {
    renderContent.innerHTML = '<div id="mio-app-root"></div>'
    const App = { components: { MdRenderer: Mio.MdRenderer }, data() { return { md: '' } }, render() { return h('div', null, [ h(Mio.MdRenderer, { md: this.md, isStreaming: false }) ]) } }
    mioApp = createApp(App)
    mioVm = mioApp.mount('#mio-app-root')
  }
  const t0 = performance.now()
  mioVm.md = text
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const t1 = performance.now()
  return { totalMs: t1 - t0, outputLength: document.getElementById('mio-app-root').innerHTML.length }
}

async function renderIncrementalGeneric(text, opts) {
  const delay = Number(opts.delay) || 20
  const chunkSize = Number(opts.chunkSize) || 1
  const timestampStart = performance.now()
  const perChunkData = []
  
  // ensure renderer mounted and cleared
  if (opts.mode === 'vhtml') {
    // mount a tiny Vue app for v-html rendering
    if (!vhtmlApp) {
      renderContent.innerHTML = '<div id="vhtml-app-root"></div>'
      const App = { data() { return { html: '' } }, render() { return h('div', { innerHTML: this.html }) } }
      vhtmlApp = createApp(App)
      vhtmlVm = vhtmlApp.mount('#vhtml-app-root')
    } else {
      // clear previous html
      vhtmlVm.html = ''
    }
    // store accumulator locally
    renderContent._acc = ''
  }
  if (opts.mode === 'mio') {
    if (!mioApp) {
      renderContent.innerHTML = '<div id="mio-app-root"></div>'
      const App = { components: { MdRenderer: Mio.MdRenderer }, data() { return { md: '' } }, render() { return h('div', null, [ h(Mio.MdRenderer, { md: this.md, isStreaming: true }) ]) } }
      mioApp = createApp(App)
      mioVm = mioApp.mount('#mio-app-root')
    } else { mioVm.md = '' }
  }

  let chunkIndex = 0
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize)
    const acc = (renderContent._acc || '') + chunk
    
    const tsStart = performance.now()
    
    // Apply update (JS assign)
    if (opts.mode === 'vhtml') {
      vhtmlVm.html = md.render(acc)
      renderContent._acc = acc
    } else {
      mioVm.md = (mioVm.md || '') + chunk
    }
    
    const tsAfterAssign = performance.now()
    
    // Wait for paint (two rAFs)
    await new Promise(r => requestAnimationFrame(r))
    const tsAfterRAF1 = performance.now()
    await new Promise(r => requestAnimationFrame(r))
    const tsAfterRAF2 = performance.now()
    
    // Collect metrics
    let totalNodes = -1, renderNodes = -1, htmlLength = 0
    try {
      totalNodes = document.getElementsByTagName('*').length
      renderNodes = renderContent.getElementsByTagName('*').length
      htmlLength = opts.mode === 'vhtml' 
        ? (document.getElementById('vhtml-app-root') ? document.getElementById('vhtml-app-root').innerHTML.length : 0)
        : (document.getElementById('mio-app-root') ? document.getElementById('mio-app-root').innerHTML.length : 0)
    } catch (e) {}
    
    const mem = collectMemory()
    
    perChunkData.push({
      chunkIndex,
      chunkSize: chunk.length,
      accLength: acc.length,
      tsStart,
      tsAfterAssign,
      tsAfterRAF1,
      tsAfterRAF2,
      renderTimeJs: tsAfterAssign - tsStart,
      renderTimePaint: tsAfterRAF2 - tsStart,
      totalNodes,
      renderNodes,
      htmlLength,
      memory: mem
    })
    
    chunkIndex++
    
    // Simulate streaming delay
    if (delay > 0) await new Promise(r => setTimeout(r, delay))
  }
  
  const timestampEnd = performance.now()
  
  // Compute aggregates
  const renderTimes = perChunkData.map(d => d.renderTimePaint)
  const totalRenderMs = renderTimes.reduce((a,b) => a+b, 0)
  const avgPerChunk = totalRenderMs / renderTimes.length
  const sortedTimes = renderTimes.slice().sort((a,b) => a-b)
  const medianPerChunk = sortedTimes[Math.floor(sortedTimes.length / 2)]
  const p95Index = Math.floor(sortedTimes.length * 0.95)
  const p95PerChunk = sortedTimes[p95Index] || sortedTimes[sortedTimes.length - 1]
  const p99Index = Math.floor(sortedTimes.length * 0.99)
  const p99PerChunk = sortedTimes[p99Index] || sortedTimes[sortedTimes.length - 1]
  
  const nodeCountsTotal = perChunkData.map(d => d.totalNodes).filter(n => n > 0)
  const maxNodes = nodeCountsTotal.length ? Math.max(...nodeCountsTotal) : -1
  const finalNodes = nodeCountsTotal.length ? nodeCountsTotal[nodeCountsTotal.length - 1] : -1
  
  const outLen = perChunkData.length ? perChunkData[perChunkData.length - 1].htmlLength : 0
  
  return {
    totalMs: timestampEnd - timestampStart,
    totalRenderMs,
    chunks: perChunkData.length,
    perChunk: perChunkData,
    aggregates: {
      avgPerChunk,
      medianPerChunk,
      p95PerChunk,
      p99PerChunk,
      maxNodes,
      finalNodes,
      finalHtmlLength: outLen
    }
  }
}

startRenderBtn.addEventListener('click', async () => {
  const mode = renderModeSelect.value // 'vhtml' or 'mio'
  const type = runTypeSelect.value // 'full' or 'incremental'
  const normalize = !!normalizeImagesCheckbox.checked
  const text = normalize ? normalizeImages(window.__mio_last_md__ || '') : (window.__mio_last_md__ || '')
  renderStats.textContent = ''
  status.textContent = `Running ${type} render with ${mode}...`
  if (type === 'full') {
    const res = mode === 'vhtml' ? await renderFullVHtml(text) : await renderFullMio(text)
    renderStats.textContent = `totalMs=${res.totalMs.toFixed(2)}ms outputLen=${res.outputLength}`
    status.textContent = `Done: ${res.totalMs.toFixed(2)}ms`
  } else {
    const opts = { delay: Number(streamDelayInput.value)||0, chunkSize: Number(chunkSizeInput.value)||1, mode }
    const res = await renderIncrementalGeneric(text, opts)
    // Store last result for external access
    window.__mio_last_result__ = {
      meta: {
        fixture: fixtureSelect.value || 'unknown',
        renderer: mode,
        chunkSize: opts.chunkSize,
        delay: opts.delay,
        env: collectEnvMeta(),
        timestampStart: Date.now() - res.totalMs,
        timestampEnd: Date.now()
      },
      perChunk: res.perChunk,
      aggregates: res.aggregates,
      summary: {
        totalMs: res.totalMs,
        totalRenderMs: res.totalRenderMs,
        chunks: res.chunks
      }
    }
    renderStats.textContent = `totalRender=${res.totalRenderMs.toFixed(2)}ms chunks=${res.chunks} avg=${res.aggregates.avgPerChunk.toFixed(2)}ms median=${res.aggregates.medianPerChunk.toFixed(2)}ms p95=${res.aggregates.p95PerChunk.toFixed(2)}ms maxNodes=${res.aggregates.maxNodes} finalNodes=${res.aggregates.finalNodes}`
    status.textContent = `Done: totalRender=${res.totalRenderMs.toFixed(2)}ms elapsed=${res.totalMs.toFixed(2)}ms`
  }
})

clearBtn.addEventListener('click', () => {
  // clear render output and internal accumulators
  try {
    renderContent.innerHTML = ''
    if (renderContent._acc) renderContent._acc = ''
    if (mioVm && typeof mioVm.md !== 'undefined') mioVm.md = ''
    if (vhtmlVm && typeof vhtmlVm.html !== 'undefined') vhtmlVm.html = ''
    renderStats.textContent = ''
    status.textContent = 'Cleared'
  } catch (e) {
    console.error('clear error', e)
    status.textContent = 'Clear failed'
  }
})

// If runner injected md before script loaded, pick it up
// runner sets window.__mio_last_md__ via __mio_set_md__

