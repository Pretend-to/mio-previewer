# mio-previewer Benchmark v3

测量 mio-previewer vs v-html 在流式 Markdown 渲染下的性能差异。

## 测量指标

| 指标 | 精度 | 说明 |
|------|------|------|
| **JS time** | ~0.01ms | `performance.now()` 包围 DOM 赋值操作。唯一精确的指标 |
| **DOM ops** | 精确 | MutationObserver 统计 `addedNodes + removedNodes`。不受 headless/真实浏览器影响 |
| **Frame latency** | 参考 | rAF callback timestamp 反映 JS → 下一帧的调度延迟 |
| **md.parse** | 精确 | v-html 专属：markdown-it 全量重解析耗时 |
| **FPS** | 参考 | rAF 轮询每秒帧数 |

> ❌ **不报告 paint time**：headless Chrome 的 rAF 不等同真实 vsync，paint 绝对值不可靠。
> 在本机有真实 GPU vsync 的浏览器跑，数据才有意义。

## 本地跑

```bash
# 1. 安装依赖
pnpm install

# 2. 启动 dev server
pnpm dev

# 3. 新终端跑 benchmark（会启动本机 Chrome 自动测试）
pnpm benchmark
```

或者手动跑：

```bash
# 只跑 complex + long-medium（较快的两个 fixture）
pnpm benchmark

# 再单独跑 long-large（大文档，v-html 的 token-level 场景会自动跳过）
node benchmark/runner-longlarge.cjs
```

结果输出到 `benchmark/results/`。

## 生成报告

```bash
node benchmark/analyze.cjs
```

输出 `benchmark/results/REPORT-v3.md`。

## 手动浏览器测试

1. `pnpm dev` 启动后打开 http://localhost:5173/benchmark/benchmark.html
2. 选择 Fixture / Renderer / Chunk Size
3. 点 "Run Single" 跑单次，或 "Run All Scenarios" 跑全套
4. 浏览器会自动下载 JSON 结果文件
5. `node benchmark/analyze.cjs <下载的文件.json>` 生成报告

## 场景矩阵

| Scenario | chunkSize | delay(ms) | 模拟场景 |
|----------|-----------|-----------|----------|
| token-level | 1 | 10 | 逐 token 输出（最频繁） |
| word-level | 3 | 15 | 逐词输出 |
| fast-stream | 5 | 10 | 快速流式 |
| chunk-stream | 10 | 5 | 中粒度流式 |
| realistic | 35 | 5 | 真实 LLM chunk |
| burst | 1 | 0 | 无延迟爆发（压力测试） |

每个场景跑 3 次重复，最多 500 个 chunk（大文档不跑满）。
