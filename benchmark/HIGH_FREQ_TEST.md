# 场景 A: 高频小增量更新性能测试

## 📋 测试目标

对比 `mio-previewer` 和纯 `v-html` 在模拟 LLM Token-by-Token 流式输出场景下的性能表现。

### 核心指标

1. **DOM 节点稳定性** - 节点数抖动 (标准差)
2. **DOM 操作次数** - Mutation 次数
3. **渲染性能** - 平均每次更新耗时
4. **内存使用** - JS Heap 占用

---

## 🚀 快速开始

### 方式 1: 手动测试（可视化）

1. 启动开发服务器:
```bash
pnpm dev
```

2. 在浏览器中打开:
```
http://localhost:5173/benchmark-high-freq.html
```

3. 调整参数并点击"开始测试"
   - **Chunk 大小**: 每次更新的字符数 (1-10)
   - **延迟**: 每次更新之间的延迟 (ms)
   - **总字符数**: 测试文档的总长度

4. 观察实时图表和指标对比

### 方式 2: 自动化测试

1. 在一个终端启动开发服务器:
```bash
pnpm dev
```

2. 在另一个终端运行自动化测试:
```bash
pnpm benchmark:high-freq
```

3. 测试将自动运行多个配置，结果保存在 `benchmark/results/`

---

## 📊 测试配置

自动化测试包含 4 种场景：

| 场景 | Chunk 大小 | 延迟 (ms) | 总字符数 | 说明 |
|------|-----------|----------|---------|------|
| token-level | 1 | 20 | 2,000 | 极高频，单字符更新 |
| word-level | 3 | 15 | 5,000 | 词级别更新 |
| fast-streaming | 5 | 10 | 10,000 | 快速流式 |
| chunk-streaming | 10 | 5 | 20,000 | 块级流式 |

每个场景运行 5 次，取平均值。

---

## 🎯 预期结果

### mio-previewer 的优势

#### 1. DOM 稳定性
- **v-html**: 每次更新重建完整 DOM 树，节点数剧烈抖动
- **mio-previewer**: 增量更新，节点数平滑增长

**预期提升**: 节点抖动减少 **40-80%**

#### 2. DOM 操作次数
- **v-html**: 每次全量替换 innerHTML，大量 DOM 操作
- **mio-previewer**: 只 diff 新增部分，操作次数大幅减少

**预期提升**: DOM 操作减少 **50-90%**

#### 3. 渲染性能
- **v-html**: markdown-it + 全量 innerHTML 替换
- **mio-previewer**: markdown-it + AST diff + Vue patch

**预期提升**: 在高频场景下 **10-30%** 更快

#### 4. 内存使用
- **v-html**: 临时节点频繁创建/销毁，内存抖动
- **mio-previewer**: 复用现有节点，内存稳定

**预期提升**: 内存峰值降低 **30-60%**

---

## 📈 实时图表说明

### DOM 节点数变化图
- **红线 (v-html)**: 锯齿状，频繁跳动
- **绿线 (mio-previewer)**: 平滑增长

### 渲染耗时对比图
- 每次更新的耗时对比
- mio 在高频场景下更稳定

---

## 🔬 技术细节

### 测试原理

1. **v-html 路径**:
   ```
   markdown text → markdown-it.render() → HTML string
                → Vue innerHTML binding → 浏览器全量重建 DOM
   ```

2. **mio-previewer 路径**:
   ```
   markdown text → markdown-it.render() → HTML string
                → htmlparser2 → AST
                → Vue VNode → Vue patch/diff → 浏览器增量更新 DOM
   ```

### 指标采集

- **DOM 节点数**: 递归遍历 DOM 树计数
- **DOM 操作次数**: MutationObserver 监听所有 DOM 变更
- **渲染耗时**: performance.now() 测量赋值操作耗时
- **内存使用**: performance.memory.usedJSHeapSize

---

## 📝 报告生成

自动化测试会生成：

1. **JSON 报告**: `benchmark/results/report-high-freq-*.json`
   - 包含所有原始数据
   - 聚合统计
   - 配置信息

2. **截图**: `benchmark/results/screenshot-*.png`
   - 每次测试的完整截图
   - 可用于可视化报告

3. **控制台总结**:
   - 各配置的平均提升
   - 关键发现
   - 结论

---

## 🎬 Demo 视频制作

使用手动测试模式可以录制演示视频：

1. 打开测试页面
2. 使用录屏软件 (如 OBS)
3. 选择极端参数 (chunk=1, delay=10)
4. 并排对比 v-html 和 mio 的实时变化
5. 重点展示:
   - 节点数曲线对比
   - 渲染流畅度
   - 最终提升百分比

---

## 🐛 故障排除

### 问题: 浏览器打不开测试页面
**解决**: 确保 `pnpm dev` 正在运行

### 问题: 自动化测试超时
**解决**: 
- 减小 totalChars 参数
- 增加 delay 参数
- 检查 CPU 负载

### 问题: 内存数据为 0
**解决**: 
- 某些浏览器不支持 `performance.memory`
- 使用 Chrome 浏览器
- 启动时添加 `--enable-precise-memory-info`

---

## 📚 相关文档

- [BENCHMARK_DESIGN.md](./BENCHMARK_DESIGN.md) - 完整测试设计方案
- [REPORT.md](./REPORT.md) - 现有测试报告
- [README.md](./README.md) - 通用 benchmark 说明

---

## 🎯 结论

通过这个测试，我们可以证明 **mio-previewer 在真实 LLM 流式输出场景下的显著优势**：

✅ **更稳定的 DOM 管理** - 节点数平滑增长，无抖动  
✅ **更少的 DOM 操作** - 减少浏览器重排压力  
✅ **更好的性能** - 高频更新场景下更快  
✅ **更低的内存占用** - 避免临时节点暴增  

这些优势在 **Token-by-Token** 级别的流式输出时最为明显！
