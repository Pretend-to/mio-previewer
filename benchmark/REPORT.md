# mio-previewer 性能对比报告

**生成时间**: 2025-10-04  
**对比目标**: 证明 mio-previewer 在流式 Markdown 渲染场景下相对于纯 v-html 的优越性

---

## 执行摘要

本报告对比了 **mio-previewer**（基于 AST + VNode diff）与 **纯 v-html**（Vue innerHTML 绑定）在模拟 LLM 流式输出场景下的性能表现。

**关键发现**:
- 在现实的 LLM 流式参数下（chunkSize=35, delay=5ms），**两者的渲染性能非常接近**
- 平均每-chunk 渲染时间：v-html 中位数 10.78ms，mio 中位数 10.72ms（差异 < 1%）
- **DOM 节点峰值**：v-html 最大 144 节点，mio 最大 146 节点（**无显著差异**）
- Effect size (Cohen's d) = 1.326 表明虽有统计显著性，但实际差异极小

**结论**: 在**更大 chunk size**（模拟真实 LLM 输出）的场景下，mio 的优势**不明显**。之前观察到的 DOM 节点暴增现象在 chunkSize=35 时已不复现。

---

## 方法论

### 1. 实验设计

**对比变量（单一变量原则）**:
- **v-html 路径**: Vue app 绑定 `innerHTML`（等价 v-html），每个 chunk 触发完整 markdown-it 渲染并通过 Vue 的 innerHTML 更新 DOM
- **mio 路径**: markdown-it → HTML → htmlparser2 AST → Vue VNode → Vue patch/diff

**固定参数**:
- Fixture: `complex.md`（包含多种 markdown 元素：标题、列表、代码块、链接等）
- chunkSize: **35 字符**（模拟 LLM 流式输出的合理粒度）
- delay: **5ms**（模拟网络/流式延迟）
- 重复次数: **10 次**（每个渲染器）

**测量指标（每个 chunk）**:
- `renderTimeJs`: JS 赋值时间（`vhtmlVm.html = ...` 或 `mioVm.md = ...`）
- `renderTimePaint`: paint-inclusive 渲染时间（等待两次 rAF 后测量，包含浏览器布局与绘制）
- `totalNodes`: 整个 document 的 DOM 节点数
- `renderNodes`: 渲染区域内的 DOM 节点数
- `htmlLength`: 输出 HTML 长度
- `memory`: JS Heap 使用（若可用）

**聚合指标**:
- avgPerChunk, medianPerChunk, p95PerChunk, p99PerChunk
- maxNodes（流式期间峰值节点数）
- finalNodes（流结束后稳定节点数）

### 2. 环境

- **浏览器**: Chromium (Puppeteer headless)
- **机器**: macOS, CPU cores = (从 env meta 可读取)
- **Node.js**: v24.9.0
- **Vue**: 3.x
- **Markdown 引擎**: markdown-it

### 3. 数据采集

- 使用 Puppeteer headless 驱动 benchmark 页面
- 每次 run 保存完整 JSON（meta + perChunk + aggregates）
- 汇总后计算统计量（median, p95, std, effect size）

---

## 实验结果

### 统计摘要

| 指标 | v-html (中位数) | mio (中位数) | 差异 | Effect Size (Cohen's d) |
|------|----------------|-------------|------|------------------------|
| **avgPerChunk (ms)** | 10.78 | 10.72 | -0.06ms (-0.6%) | 1.326 |
| **p95PerChunk (ms)** | 11.40 | 11.55 | +0.15ms (+1.3%) | N/A |
| **maxNodes** | 144 | 146 | +2 (+1.4%) | N/A (无方差) |
| **finalNodes** | 144 | 146 | +2 (+1.4%) | N/A |

### 详细分析

#### 1. 渲染延迟（avgPerChunk）

- **v-html**: median=10.78ms, p95=10.86ms, std=0.06ms
- **mio**: median=10.72ms, p95=10.75ms, std=0.07ms
- **解读**: 
  - mio 略快 0.06ms（差异极小，< 1%）
  - 两者标准差都很小（~0.06-0.07ms），说明性能稳定
  - Effect size = 1.326 表明统计上有差异，但绝对值差异不到 1ms，**实际意义不大**

#### 2. P95 延迟（p95PerChunk）

- **v-html**: median=11.40ms, p95=11.70ms
- **mio**: median=11.55ms, p95=11.90ms
- **解读**: 
  - mio 的 p95 略高（+0.15ms），但差异依然极小
  - 说明在极端情况下 mio 可能稍慢（可能因 AST 解析开销）

#### 3. DOM 节点数（关键指标）

- **v-html**: min=70, max=144, final=144
- **mio**: min=72, max=146, final=146
- **解读**: 
  - **峰值节点数相差仅 2 个**（144 vs 146）
  - **无"节点暴增"现象**：之前在 chunkSize=1、delay=20ms 时观察到的 v-html 节点数飙到"数万"的现象在更大 chunk 下**完全消失**
  - 根因：更大的 chunk 意味着更少的更新频率，浏览器有足够时间回收旧节点；innerHTML 的"临时节点"问题在低频更新下不明显

#### 4. 内存使用

- 当前采集的数据中 `memory` 字段存在但未在本报告中详细分析（因 performance.memory 在某些环境下不可用或不精确）
- 建议后续通过 Chrome DevTools Protocol 采集更精确的 heap snapshot

---

## 讨论与结论

### 主要发现

1. **在现实 LLM 流式场景下（chunkSize=35, delay=5ms），mio 与 v-html 的性能差异极小**
   - 渲染延迟差异 < 1ms
   - DOM 节点数差异 < 2%
   
2. **之前观察到的"DOM 节点暴增"是极端参数（chunkSize=1）导致的**
   - 当 chunk 非常小（1 字符）且更新频繁时，v-html 的 innerHTML 全量替换会短时产生大量临时节点
   - 在合理的 chunk size（30-40 字符）下，这个问题不复现

3. **mio 的设计优势（AST + VNode diff）在当前场景下未体现**
   - 可能原因：
     - chunk 较大时，markdown-it 渲染本身的开销占主导，diff 节省的时间不明显
     - 测试文档 `complex.md` 相对简单，未触发复杂 DOM 结构的 diff 优势
     - Vue 的 VDOM patch 本身已足够高效，纯 innerHTML 在低频更新下性能也可接受

### mio 可能仍有优势的场景（需进一步验证）

1. **极高频更新**（chunkSize < 10, delay < 1ms）
   - 此时 v-html 的临时节点问题会放大
   - 但现实中 LLM 不太可能以如此小粒度输出

2. **超大文档**（> 100KB markdown）
   - 全量 innerHTML 替换可能成为瓶颈
   - mio 的增量 AST 更新可能更有优势（需实验验证）

3. **复杂交互场景**
   - 如果渲染区域内有用户交互（如可编辑、选择文本），v-html 全量替换会破坏状态
   - mio 的局部更新能保持交互状态（但本 benchmark 未测试此场景）

### 对"优越性"的结论

**基于本次实验**，在模拟真实 LLM 流式输出的场景下（chunkSize=35, delay=5ms），**无法证明 mio-previewer 在性能上显著优于纯 v-html**。

**建议的表述**（用于文档/宣传）:
- ✅ "mio-previewer 采用 AST + VNode diff 策略，在极高频更新或超大文档场景下可能提供更稳定的性能"
- ✅ "mio-previewer 的增量更新机制能更好地保持 DOM 状态，适合需要交互的渲染场景"
- ❌ 避免说："mio 总是比 v-html 快"或"mio 显著减少 DOM 节点数"（在常规场景下差异不明显）

---

## 改进建议

### 扩展实验以获得更全面结论

1. **增加 fixture 多样性**
   - 测试超大文档（long-large.md）
   - 测试含大量代码块、表格、嵌套列表的复杂文档
   
2. **参数网格扩展**
   - chunkSize: [5, 20, 35, 50, 100]
   - delay: [0, 1, 5, 10, 50]
   - 找到"mio 优势显现"的临界参数

3. **采集更多指标**
   - 帧率/掉帧（通过 rAF timestamps 计算）
   - CPU 使用（通过 Chrome tracing）
   - 精确内存（通过 CDP HeapProfiler）

4. **交互场景测试**
   - 在流式渲染期间模拟用户选择文本、点击链接等
   - 测试状态保持能力（v-html 会破坏，mio 可能保持）

### 代码优化方向（如需进一步提升 mio 性能）

1. **快速路径优化**
   - 当前 mio 的"快速路径"（直接追加文本节点）被注释掉了，可以重新启用并优化判断逻辑
   
2. **Worker offload**
   - 当前实验未启用 Worker，可测试 `useWorker=true` 对大文档的加速效果

3. **AST 缓存**
   - 对于重复渲染的片段（如 header/footer），可缓存 AST 避免重复解析

---

## 附录

### 数据与脚本

- **原始数据**: `benchmark/results/` 目录下的 JSON 文件（共 20 个 run）
- **汇总报告**: `benchmark/results/analysis-report.json`
- **CSV 数据**: `benchmark/results/summary.csv`（可用于 Excel/Python 绘图）
- **脚本**:
  - `benchmark/bench.js` — 客户端采集脚本
  - `benchmark/runner.cjs` — Puppeteer 自动化 runner
  - `benchmark/analyze.cjs` — 统计分析脚本

### 如何复现

```bash
# 1. 启动 dev server
pnpm dev

# 2. 运行 benchmark（另一个终端）
node benchmark/runner.cjs

# 3. 分析结果
node benchmark/analyze.cjs

# 4. 查看 CSV（可用 Excel 打开或用 Python 绘图）
open benchmark/results/summary.csv
```

### 环境信息示例

```json
{
  "userAgent": "Mozilla/5.0 ...",
  "cpuCores": 8,
  "viewport": { "width": 1280, "height": 800 },
  "dpr": 2,
  "timestamp": 1728000000000
}
```

---

## 致谢与免责声明

- 本报告基于受控的自动化实验，真实用户体验可能因设备、网络、内容而异
- 统计显著性（effect size）不等于实际意义；< 1ms 的差异在实际使用中难以感知
- 建议在实际业务场景中进行 A/B 测试以验证性能影响

**报告生成**: 基于 2025-10-04 的实验数据  
**版本**: v1.0
