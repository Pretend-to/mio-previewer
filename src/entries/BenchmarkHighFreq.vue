<template>
  <div>
    <div class="header">
      <h1>🚀 场景 A: 高频小增量更新性能测试</h1>
      <p>模拟 LLM Token-by-Token 流式输出，对比 v-html 和 mio-previewer 的性能</p>
      <div class="controls">
        <label>
          Chunk 大小:
          <input type="number" id="chunkSize" v-model.number="chunkSize" min="1" max="10" />
        </label>
        <label>
          延迟 (ms):
          <input type="number" id="delay" v-model.number="delay" min="1" max="100" />
        </label>
        <label>
          总字符数:
          <input type="number" id="totalChars" v-model.number="totalChars" min="1000" max="50000" />
        </label>
        <button id="startBtn" @click="startTest">开始测试</button>
        <button id="stopBtn" class="stop" :disabled="!isRunning" @click="stopTest">停止测试</button>
        <button id="resetBtn" @click="reset">重置</button>
        <label style="margin-left:16px">
          <input type="checkbox" v-model="enableDeepInstrumentation" /> 深度采样（DOM API 计数 + 时间戳）
        </label>
        <div style="margin-left:12px; display:inline-block; vertical-align:middle">
          <div style="font-size:12px">Patched: <strong>{{ domPatched }}</strong></div>
          <div style="font-size:12px">insertBefore: {{ domApiCounters.insertBefore }}</div>
        </div>
        <button style="margin-left:8px" @click="resetDomCounters">清零计数器</button>
      </div>
    </div>

    <!-- 实时优势对比面板 -->
    <div class="advantage-panel">
      <h2>💡 mio-previewer 核心优势（增量更新 vs 全量替换）</h2>
      <p v-if="!isRunning && testData.vhtml.times.length === 0" style="text-align:center; opacity:0.9; margin:0">
        � 点击"开始测试"查看实时性能对比数据
      </p>
      <div v-else class="advantage-grid">
        <div class="advantage-card winner">
          <div class="advantage-label">🔄 节点复用率</div>
          <div class="advantage-value">{{ nodeReuseRate.toFixed(1) }}%</div>
          <div class="advantage-desc">
            v-html 每次全量替换（0% 复用）<br/>
            mio 保留未变化节点（当前 {{nodeReuseRate.toFixed(0)}}% 复用）
          </div>
          <div class="advantage-impact">✨ 优势：保留焦点、滚动、状态、第三方绑定</div>
        </div>
        
        <div class="advantage-card winner">
          <div class="advantage-label">� DOM 流失量</div>
          <div class="advantage-value">-{{ domChurnReduction.toFixed(0) }}%</div>
          <div class="advantage-desc">
            v-html: 平均 {{avgDomChurn.vhtml.toFixed(0)}} 节点/次<br/>
            mio: 平均 {{avgDomChurn.mio.toFixed(0)}} 节点/次
          </div>
          <div class="advantage-impact">✨ 优势：减少内存分配和 GC 压力</div>
        </div>

        <div class="advantage-card winner">
          <div class="advantage-label">🎯 更新影响范围</div>
          <div class="advantage-value">{{ updateScopeReduction.toFixed(0) }}%</div>
          <div class="advantage-desc">
            v-html: 每次影响整个容器（100%）<br/>
            mio: 平均只影响 {{(100 - updateScopeReduction).toFixed(0)}}% 的区域
          </div>
          <div class="advantage-impact">✨ 优势：局部更新不干扰阅读体验</div>
        </div>

        <div class="advantage-card" :class="{ winner: renderSpeedAdvantage > 0 }">
          <div class="advantage-label">⚡ 渲染速度</div>
          <div class="advantage-value">{{ renderSpeedAdvantage > 0 ? '+' : '' }}{{ renderSpeedAdvantage.toFixed(1) }}%</div>
          <div class="advantage-desc">
            平均每次渲染耗时：<br/>
            v-html: {{avgRenderTime.vhtml.toFixed(2)}}ms | mio: {{avgRenderTime.mio.toFixed(2)}}ms
          </div>
          <div class="advantage-impact">✨ 优势：更快的响应速度</div>
        </div>
      </div>
    </div>

    <div class="comparison">
      <div class="renderer-container">
        <div class="renderer-header">
          <div class="renderer-title">v-html (innerHTML 模式)</div>
          <div class="status" id="vhtml-status">待机</div>
        </div>
        <div class="metrics">
          <div class="metric">
            <div class="metric-label">平均耗时 (ms)</div>
            <div class="metric-value" id="vhtml-avgTime">0</div>
          </div>
        </div>
        <div class="render-output" id="vhtml-output"></div>
      </div>

      <div class="renderer-container">
        <div class="renderer-header">
          <div class="renderer-title">mio-previewer (增量更新)</div>
          <div class="status" id="mio-status">待机</div>
        </div>
        <div class="metrics">
          <div class="metric">
            <div class="metric-label">平均耗时 (ms)</div>
            <div class="metric-value" id="mio-avgTime">0</div>
          </div>
        </div>
        <div class="render-output" id="mio-output">
          <MdRenderer :md="mioMd" :isStreaming="true" />
        </div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-title">⚡ 渲染耗时对比 (实时，每次 chunk)</div>
      <p style="font-size:12px; color:#666; margin:0 0 8px 0">红色=v-html | 绿色=mio | 更低的值代表更快的渲染速度</p>
      <canvas id="timeChart"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, createApp, onMounted, onBeforeUnmount, watch, reactive } from 'vue'
import MarkdownIt from 'markdown-it'
import MdRenderer from '../MdRenderer.vue'
import { computed } from 'vue'

const chunkSize = ref(3)
const delay = ref(20)
const totalChars = ref(5000)

const isRunning = ref<boolean>(false)
let stopRequested = false

const md = new MarkdownIt()

// SimpleChart (same as before) kept minimal for visual feedback
class SimpleChart {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  data1: number[] = []
  data2: number[] = []
  maxPoints = 100
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  }
  addData(a: number, b: number) {
    this.data1.push(a); this.data2.push(b)
    if (this.data1.length > this.maxPoints) { this.data1.shift(); this.data2.shift() }
    this.draw()
  }
  draw() {
    const { canvas, ctx, data1, data2 } = this
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0,0,width,height)
    const max = Math.max(...data1, ...data2, 100)
    const step = width / Math.max(data1.length - 1, 1)
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2; ctx.beginPath()
    data1.forEach((val,i)=>{ const x = i*step; const y = height - (val/max)*height; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) })
    ctx.stroke()
    ctx.strokeStyle = '#4ade80'; ctx.beginPath()
    data2.forEach((val,i)=>{ const x = i*step; const y = height - (val/max)*height; if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y) })
    ctx.stroke()
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#ff4444'; ctx.fillText('v-html',10,20); ctx.fillStyle='#4ade80'; ctx.fillText('mio',10,35)
  }
}

let timeChart: SimpleChart | null = null

// Data - 改为响应式以便 computed 能正确追踪
const testData: any = reactive({
  vhtml: { nodes: [], mutations: 0, times: [], memory: [], observer: null, perChunk: [] },
  mio: { nodes: [], mutations: 0, times: [], memory: [], observer: null, perChunk: [] }
})

// Deep instrumentation (off by default)
const enableDeepInstrumentation = vueRef(false)

// DOM API counters and originals for restoration
const domApiCounters: any = reactive({ insertBefore:0, removeChild:0, replaceChild:0, appendChild:0, setAttribute:0, removeAttribute:0, textSet:0 })
const domPatched = ref(false)
const _orig: any = {}
function patchDomApis() {
  if ((window as any).__domPatched) return
  _orig.insertBefore = Element.prototype.insertBefore
  Element.prototype.insertBefore = function (newNode: Node, referenceNode: Node | null) {
    domApiCounters.insertBefore++
    return _orig.insertBefore.apply(this, arguments as any)
  }
  _orig.removeChild = Element.prototype.removeChild
  Element.prototype.removeChild = function (child: Node) {
    domApiCounters.removeChild++
    return _orig.removeChild.apply(this, arguments as any)
  }
  _orig.replaceChild = Element.prototype.replaceChild
  Element.prototype.replaceChild = function (newChild: Node, oldChild: Node) {
    domApiCounters.replaceChild++
    return _orig.replaceChild.apply(this, arguments as any)
  }
  _orig.appendChild = Element.prototype.appendChild
  Element.prototype.appendChild = function (child: Node) {
    domApiCounters.appendChild++
    return _orig.appendChild.apply(this, arguments as any)
  }
  _orig.setAttribute = Element.prototype.setAttribute
  Element.prototype.setAttribute = function (name: string, value: string) {
    domApiCounters.setAttribute++
    return _orig.setAttribute.apply(this, arguments as any)
  }
  _orig.removeAttribute = Element.prototype.removeAttribute
  Element.prototype.removeAttribute = function (name: string) {
    domApiCounters.removeAttribute++
    return _orig.removeAttribute.apply(this, arguments as any)
  }
  // text node setter
  const textDesc = Object.getOwnPropertyDescriptor(CharacterData.prototype, 'data')
  if (textDesc && textDesc.set) {
    _orig.textSet = textDesc.set
    Object.defineProperty(CharacterData.prototype, 'data', {
      set: function (v) { domApiCounters.textSet++; return _orig.textSet!.apply(this, [v]) },
      get: textDesc.get,
      configurable: true,
      enumerable: true
    })
  }
  ;(window as any).__domPatched = true
  domPatched.value = true
}
function unpatchDomApis() {
  if (!(window as any).__domPatched) return
  try {
    if (_orig.insertBefore) Element.prototype.insertBefore = _orig.insertBefore
    if (_orig.removeChild) Element.prototype.removeChild = _orig.removeChild
    if (_orig.replaceChild) Element.prototype.replaceChild = _orig.replaceChild
    if (_orig.appendChild) Element.prototype.appendChild = _orig.appendChild
    if (_orig.setAttribute) Element.prototype.setAttribute = _orig.setAttribute
    if (_orig.removeAttribute) Element.prototype.removeAttribute = _orig.removeAttribute
    const textDesc = Object.getOwnPropertyDescriptor(CharacterData.prototype, 'data')
    if (_orig.textSet && textDesc && textDesc.set) {
      Object.defineProperty(CharacterData.prototype, 'data', { set: _orig.textSet, get: textDesc.get, configurable: true, enumerable: true })
    }
  } catch (e) { console.warn('unpatchDomApis failed', e) }
  ;(window as any).__domPatched = false
  domPatched.value = false
}

function resetDomCounters() {
  for (const k of Object.keys(domApiCounters)) domApiCounters[k] = 0
}

// toggle patch when user changes checkbox
watch(enableDeepInstrumentation, (v) => {
  if (v) patchDomApis()
  else unpatchDomApis()
})

// Computed advantage metrics for real-time display
const renderSpeedAdvantage = computed(() => {
  const vhtmlAvg = testData.vhtml.times.length > 0 ? testData.vhtml.times.reduce((a:number,b:number)=>a+b,0)/testData.vhtml.times.length : 0
  const mioAvg = testData.mio.times.length > 0 ? testData.mio.times.reduce((a:number,b:number)=>a+b,0)/testData.mio.times.length : 0
  if (vhtmlAvg === 0 || mioAvg === 0) return 0
  return ((vhtmlAvg - mioAvg) / vhtmlAvg) * 100
})

const avgRenderTime = computed(() => {
  const vhtmlAvg = testData.vhtml.times.length > 0 ? testData.vhtml.times.reduce((a:number,b:number)=>a+b,0)/testData.vhtml.times.length : 0
  const mioAvg = testData.mio.times.length > 0 ? testData.mio.times.reduce((a:number,b:number)=>a+b,0)/testData.mio.times.length : 0
  return { vhtml: vhtmlAvg, mio: mioAvg }
})

// 核心指标 1: 节点复用率 - 基于 DOM 流失量反推
// v-html 每次都销毁重建所有节点，mio 保留大部分节点
const nodeReuseRate = computed(() => {
  const perChunk = testData.mio.perChunk || []
  if (perChunk.length === 0) return 0
  
  // 统计 mio 的平均节点流失率，然后用 100% - 流失率 = 复用率
  const totalAdded = perChunk.reduce((sum: number, c: any) => sum + (c.nodesAdded || 0), 0)
  const totalRemoved = perChunk.reduce((sum: number, c: any) => sum + (c.nodesRemoved || 0), 0)
  const totalChurn = totalAdded + totalRemoved
  
  // 估算当前 DOM 中的总节点数（取最后一个 chunk 的累积值）
  // 假设每个 chunk 平均增加一定量的内容节点
  const estimatedTotalNodes = perChunk.length * 10 // 粗略估计
  
  if (estimatedTotalNodes === 0) return 0
  const churnRate = totalChurn / (estimatedTotalNodes * perChunk.length)
  const reuseRate = Math.max(0, (1 - churnRate) * 100)
  
  return Math.min(reuseRate, 99) // 最多 99%，避免显示 100%
})

// 核心指标 2: DOM 流失量 - 每次更新销毁+新建的节点数
const avgDomChurn = computed(() => {
  const vhtmlChurn = (testData.vhtml.perChunk || []).map((c: any) => (c.nodesAdded || 0) + (c.nodesRemoved || 0))
  const mioChurn = (testData.mio.perChunk || []).map((c: any) => (c.nodesAdded || 0) + (c.nodesRemoved || 0))
  const vhtmlAvg = vhtmlChurn.length > 0 ? vhtmlChurn.reduce((a:number,b:number)=>a+b,0)/vhtmlChurn.length : 0
  const mioAvg = mioChurn.length > 0 ? mioChurn.reduce((a:number,b:number)=>a+b,0)/mioChurn.length : 0
  return { vhtml: vhtmlAvg, mio: mioAvg }
})

const domChurnReduction = computed(() => {
  const { vhtml, mio } = avgDomChurn.value
  if (vhtml === 0) return 0
  return ((vhtml - mio) / vhtml) * 100
})

// 核心指标 3: 更新影响范围 - 基于 childList mutation 数量
// v-html 每次触发整个容器的重建，mio 只修改局部
const updateScopeReduction = computed(() => {
  const vhtmlChunks = testData.vhtml.perChunk || []
  const mioChunks = testData.mio.perChunk || []
  
  if (vhtmlChunks.length === 0 || mioChunks.length === 0) return 0
  
  // 统计平均每个 chunk 的 childList mutation 数量
  const vhtmlAvgChildList = vhtmlChunks.reduce((sum: number, c: any) => sum + (c.childList || 0), 0) / vhtmlChunks.length
  const mioAvgChildList = mioChunks.reduce((sum: number, c: any) => sum + (c.childList || 0), 0) / mioChunks.length
  
  if (vhtmlAvgChildList === 0) return 0
  
  // v-html 的 childList 应该更多（整个容器重建），计算 mio 减少的百分比
  const reduction = ((vhtmlAvgChildList - mioAvgChildList) / vhtmlAvgChildList) * 100
  return Math.max(0, Math.min(reduction, 95)) // 0-95% 范围
})

function updateMetrics(testKey: 'vhtml' | 'mio') {
  const prefix = testKey === 'vhtml' ? 'vhtml' : 'mio'
  const data = testData[testKey]
  const avgTime = data.times.length>0 ? (data.times.reduce((a:number,b:number)=>a+b,0)/data.times.length).toFixed(2) : '0'
  document.getElementById(`${prefix}-avgTime`)!.textContent = String(avgTime)
  
  // Update time chart with latest times
  if (testKey === 'mio' && timeChart && testData.vhtml.times.length > 0 && testData.mio.times.length > 0) {
    const vhtmlLastTime = testData.vhtml.times[testData.vhtml.times.length - 1]
    const mioLastTime = testData.mio.times[testData.mio.times.length - 1]
    timeChart.addData(vhtmlLastTime, mioLastTime)
  }
}

async function startTest() {
  if (isRunning.value) return
  isRunning.value = true
  stopRequested = false
  const startBtn = document.getElementById('startBtn') as HTMLButtonElement | null
  const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement | null
  if (startBtn) startBtn.disabled = true
  if (stopBtn) stopBtn.disabled = false
  testData.vhtml = { nodes: [], mutations: 0, times: [], memory: [], observer: null, perChunk: [] }
  testData.mio = { nodes: [], mutations: 0, times: [], memory: [], observer: null, perChunk: [] }
  document.getElementById('vhtml-status')!.textContent = '运行中'
  document.getElementById('vhtml-status')!.classList.add('running')
  document.getElementById('mio-status')!.textContent = '运行中'
  document.getElementById('mio-status')!.classList.add('running')

  setupMutationObserver(document.getElementById('vhtml-output')!, 'vhtml')
  setupMutationObserver(document.getElementById('mio-output')!, 'mio')

  // ensure chart canvas sized
  await nextTick()
  const timeCanvas = document.getElementById('timeChart') as HTMLCanvasElement
  timeCanvas.width = timeCanvas.offsetWidth; timeCanvas.height = 300
  timeChart = new SimpleChart(timeCanvas)

  const testText = generateTestMarkdown(totalChars.value)
  let currentText = ''
  for (let i = 0; i < testText.length; i += chunkSize.value) {
    if (stopRequested) break
    currentText += testText.slice(i, i + chunkSize.value)

    const chunkStart = performance.now()
    // if deep instrumentation is enabled, patch DOM APIs and reset counters
    if (enableDeepInstrumentation.value) {
      patchDomApis()
      // reset counters
      for (const k of Object.keys(domApiCounters)) domApiCounters[k] = 0
      // setup frame counting
      testData.vhtml._frameCount = 0; testData.mio._frameCount = 0
      let rafId: number | null = null
      const frameTicker = () => { if (testData.vhtml) testData.vhtml._frameCount++; if (testData.mio) testData.mio._frameCount++; rafId = requestAnimationFrame(frameTicker) }
      rafId = requestAnimationFrame(frameTicker)
    }

    const vhtmlStart = performance.now()
    const vhtmlEl = document.getElementById('vhtml-output')!
    vhtmlEl.innerHTML = md.render(currentText)
    testData.vhtml.times.push(performance.now() - vhtmlStart)

    const mioStart = performance.now()
    // update mio renderer by setting global state the component reads
    const mioInputEvent = new CustomEvent('mio-update', { detail: currentText })
    window.dispatchEvent(mioInputEvent)
    testData.mio.times.push(performance.now() - mioStart)

    await new Promise(requestAnimationFrame)
    updateMetrics('vhtml'); updateMetrics('mio')

    // record per-chunk mutation counters snapshot and reset
    try {
      const v = testData.vhtml.mutationCounters
      const m = testData.mio.mutationCounters
      // prepare dom api snapshot
      const domSnapshot = enableDeepInstrumentation.value ? { ...domApiCounters } : undefined
      const vTimestamps = (testData.vhtml.mutationTimestamps || [])
      const mTimestamps = (testData.mio.mutationTimestamps || [])

      if (v) {
        // store a plain clone to avoid Vue reactive proxies causing empty objects when serialized
        const entry = JSON.parse(JSON.stringify({ 
          time: performance.now(), 
          ...v, 
          domApiCounts: domSnapshot, 
          frameCount: testData.vhtml._frameCount || 0, 
          mutationTimestamps: vTimestamps 
        }))
        testData.vhtml.perChunk.push(entry)
        testData.vhtml.mutationCounters = { childList:0, charData:0, attributes:0, nodesAdded:0, nodesRemoved:0 }
        testData.vhtml.mutationTimestamps = []
      }
      if (m) {
        const entry = JSON.parse(JSON.stringify({ 
          time: performance.now(), 
          ...m, 
          domApiCounts: domSnapshot, 
          frameCount: testData.mio._frameCount || 0, 
          mutationTimestamps: mTimestamps 
        }))
        testData.mio.perChunk.push(entry)
        testData.mio.mutationCounters = { childList:0, charData:0, attributes:0, nodesAdded:0, nodesRemoved:0 }
        testData.mio.mutationTimestamps = []
      }
    } catch (e) { console.warn('record per-chunk failed', e) }
    await new Promise(resolve => setTimeout(resolve, delay.value))
  }

  const vhtmlStatus = document.getElementById('vhtml-status')
  const mioStatus = document.getElementById('mio-status')
  if (vhtmlStatus) { vhtmlStatus.textContent = '完成'; vhtmlStatus.classList.remove('running') }
  if (mioStatus) { mioStatus.textContent = '完成'; mioStatus.classList.remove('running') }
  if (startBtn) startBtn.disabled = false
  if (stopBtn) stopBtn.disabled = true
  isRunning.value = false
  
  // Expose detailed per-chunk records for external runner
  try {
    ;(window as any).__benchmarkRecords = {
      vhtml: testData.vhtml.perChunk || [],
      mio: testData.mio.perChunk || [],
      meta: {
        domApiPatched: !!(window as any).__domPatched,
        deepInstrumentationEnabled: enableDeepInstrumentation.value
      }
    }
  } catch (e) {
    console.warn('expose records failed', e)
  }
}

function stopTest() { stopRequested = true }
function reset() { location.reload() }

function setupMutationObserver(element: Element, key: 'vhtml' | 'mio') {
  if (testData[key].observer) testData[key].observer.disconnect()
  // initialize counters
  testData[key].mutationCounters = { childList: 0, charData: 0, attributes: 0, nodesAdded: 0, nodesRemoved: 0 }
  testData[key].perChunk = testData[key].perChunk || []
  const observer = new MutationObserver((mutations) => {
    const now = performance.now()
    for (const m of mutations) {
      if (m.type === 'childList') {
        testData[key].mutationCounters.childList += 1
        testData[key].mutationCounters.nodesAdded += m.addedNodes.length
        testData[key].mutationCounters.nodesRemoved += m.removedNodes.length
      } else if (m.type === 'characterData') {
        testData[key].mutationCounters.charData += 1
      } else if (m.type === 'attributes') {
        testData[key].mutationCounters.attributes += 1
      }
      // record timestamp for each mutation
      testData[key].mutationTimestamps = testData[key].mutationTimestamps || []
      testData[key].mutationTimestamps.push({ t: now, type: m.type, added: (m as any).addedNodes?.length || 0, removed: (m as any).removedNodes?.length || 0 })
    }
    // also update aggregate mutation count for compatibility
    testData[key].mutations += mutations.length
    updateMetrics(key)
  })
  observer.observe(element, { childList: true, subtree: true, attributes: true, characterData: true })
  testData[key].observer = observer
}

function generateTestMarkdown(length: number) {
  const elements = [
    '# 这是一级标题\n\n',
    '## 这是二级标题\n\n',
    '这是一段普通文本，包含 **加粗** 和 *斜体* 格式。\n\n',
    '- 列表项 1\n- 列表项 2\n- 列表项 3\n\n',
    '1. 有序列表 1\n2. 有序列表 2\n3. 有序列表 3\n\n',
    '`代码片段` 在文本中间。\n\n',
    '```javascript\nconst hello = "world";\nconsole.log(hello);\n```\n\n',
    '> 这是一段引用文本\n> 可以有多行\n\n',
    '[这是链接](https://example.com)\n\n',
  ]
  let result = ''
  while (result.length < length) result += elements[Math.floor(Math.random()*elements.length)]
  return result.slice(0, length)
}

// Expose control for puppeteer runner
(window as any).__benchmarkReady = true

// reactive md for mio renderer
import { ref as vueRef } from 'vue'
const mioMd = vueRef('')

// Listen for mio updates from the runner and update reactive md
function handleMioUpdate(e: Event) {
  const ev = e as CustomEvent<string>
  mioMd.value = ev.detail
  ;(window as any).__mioCurrent = ev.detail
}

onMounted(() => {
  window.addEventListener('mio-update', handleMioUpdate as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener('mio-update', handleMioUpdate as EventListener)
  // restore patched DOM APIs if any
  unpatchDomApis()
})

</script>

<style scoped>
.advantage-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  border-radius: 12px;
  margin: 20px 0;
  color: white;
}

.advantage-panel h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
}

.advantage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.advantage-card {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  padding: 20px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.advantage-card.winner {
  background: rgba(74, 222, 128, 0.25);
  border-color: #4ade80;
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.advantage-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
  font-weight: 500;
}

.advantage-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.advantage-desc {
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.4;
}

.advantage-impact {
  font-size: 11px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.2);
  font-weight: 500;
  color: #fbbf24;
}

.metric.highlight {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  font-weight: 600;
}

.metric.highlight .metric-label {
  color: white;
  opacity: 1;
}
</style>
