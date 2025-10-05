# 开发日志归档

本目录包含 mio-previewer 开发过程中的技术实现文档和问题解决记录。

## 📁 文档列表

### Alert 插件 Markdown 支持
**文件**: [ALERT_MARKDOWN_SUPPORT.md](./ALERT_MARKDOWN_SUPPORT.md)

**内容**: Alert 插件实现过程中解决 Markdown 语法不被解析的问题
- 问题诊断：HTML 标签内的 Markdown 不被解析
- 解决方案：使用 `markdown-it-container` 插件
- 代码改进和测试验证

### CodeBlock 和 KaTeX 插件实现
**文件**: [CODEBLOCK_KATEX_IMPLEMENTATION.md](./CODEBLOCK_KATEX_IMPLEMENTATION.md)

**内容**: CodeBlock 和 KaTeX 插件的完整实现文档
- 功能概述
- 依赖安装
- 文件清单
- 使用示例和架构优势
- 性能考虑

### 插件系统实现总结
**文件**: [PLUGIN_IMPLEMENTATION.md](./PLUGIN_IMPLEMENTATION.md)

**内容**: 插件系统的架构设计和实现细节
- 双层插件架构（Markdown-it + Custom）
- 类型系统设计
- 文件变更清单
- 优先级设计
- 技术亮点和扩展方向

---

## ⚠️ 注意

这些文档主要用于：
1. 开发历史记录
2. 问题解决参考
3. 架构演进追踪

**对于日常使用，请查看主文档：**
- [插件系统完整指南](../PLUGINS.md)
- [文档中心](../README.md)

---

**最后更新**: 2025-10-05
