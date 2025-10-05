# 文档中心

欢迎来到 mio-previewer 文档中心！

## 📚 主要文档

### 快速开始
- [主 README](../README.md) - 项目介绍、安装和基础使用
- [中文 README](../README.zh-CN.md) - 中文版完整文档

### 核心指南
- [**插件系统完整指南**](./PLUGINS.md) ⭐ - 插件系统架构、使用和开发指南
  - Markdown-it 插件（语法扩展）
  - Custom 插件（自定义渲染）
  - 内置插件详解
  - 完整示例和最佳实践

### 定制化
- [自定义代码块样式](./CUSTOMIZE_CODEBLOCK_STYLE.md) - 如何定制代码高亮主题和样式
- [KaTeX 数学公式配置](./KATEX_DELIMITERS.md) - 数学公式定界符和配置选项

### 更新日志
- [CHANGELOG](../CHANGELOG.md) - 版本更新历史

---

## 📖 文档结构

```
docs/
├── README.md                        # 📍 本文件 - 文档索引
├── PLUGINS.md                       # 插件系统完整指南
├── CUSTOMIZE_CODEBLOCK_STYLE.md     # 代码块样式定制
├── KATEX_DELIMITERS.md              # KaTeX 配置指南
└── archive/                         # 归档的开发日志
    ├── ALERT_MARKDOWN_SUPPORT.md    # Alert 插件实现过程
    ├── CODEBLOCK_KATEX_IMPLEMENTATION.md  # CodeBlock 和 KaTeX 实现
    └── PLUGIN_IMPLEMENTATION.md     # 插件系统实现总结
```

---

## 🚀 快速导航

### 我想...

#### 🎯 开始使用
→ 查看 [主 README - Quick Start](../README.md#quick-start)

#### 🔌 使用插件
→ 查看 [插件系统完整指南](./PLUGINS.md)

#### 🎨 定制样式
→ 查看 [自定义代码块样式](./CUSTOMIZE_CODEBLOCK_STYLE.md)

#### ✏️ 添加数学公式
→ 查看 [KaTeX 配置指南](./KATEX_DELIMITERS.md)

#### 🧩 开发自定义插件
→ 查看 [插件系统 - 创建自定义插件](./PLUGINS.md#创建自定义插件)

#### 📈 使用图表
→ 查看 [插件系统 - Mermaid Plugin](./PLUGINS.md#3-mermaid-plugin图表)

#### ⚡ 流式渲染
→ 查看 [主 README - Streaming Example](../README.md#streaming-rendering)

---

## 🎓 学习路径

### 初学者
1. 阅读 [主 README](../README.md) 了解项目概览
2. 跟随 [Quick Start](../README.md#quick-start) 创建第一个示例
3. 浏览 [内置插件](./PLUGINS.md#内置插件) 了解可用功能

### 进阶用户
1. 深入学习 [插件系统架构](./PLUGINS.md#插件系统架构)
2. 阅读 [完整示例](./PLUGINS.md#完整示例)
3. 了解 [最佳实践](./PLUGINS.md#最佳实践)

### 插件开发者
1. 理解 [双层插件架构](./PLUGINS.md#插件系统架构)
2. 学习 [创建自定义插件](./PLUGINS.md#创建自定义插件)
3. 查看 [ASTNode 结构](./PLUGINS.md#astnode-结构)
4. 参考归档的实现文档（`archive/` 目录）

---

## 💡 常见用例

### 代码展示
```vue
<MdRenderer 
  :md="markdownText"
  :customPlugins="[{ plugin: codeBlockPlugin }]"
/>
```
详见：[Code Block Plugin](./PLUGINS.md#1-code-block-plugin代码块)

### 数学公式
```vue
<MdRenderer 
  :md="markdownText"
  :markdownItPlugins="[{ plugin: katexPlugin }]"
/>
```
详见：[KaTeX Plugin](./PLUGINS.md#2-katex-plugin数学公式)

### 警告框
```vue
<MdRenderer 
  :md="markdownText"
  :markdownItPlugins="[{ plugin: alertPlugin }]"
/>
```
详见：[Alert Plugin](./PLUGINS.md#1-alert-plugin警告框)

### 流式渲染
```vue
<MdRenderer 
  :md="streamedText"
  :isStreaming="isStreaming"
  :customPlugins="[{ plugin: cursorPlugin }]"
/>
```
详见：[流式渲染示例](./PLUGINS.md#流式渲染示例)

---

## 🤝 贡献

发现文档有误或需要改进？欢迎提交 Issue 或 PR！

- [GitHub Issues](https://github.com/Pretend-to/mio-previewer/issues)
- [GitHub Pull Requests](https://github.com/Pretend-to/mio-previewer/pulls)

---

## 📝 文档版本

- **当前版本**: v0.1.7
- **最后更新**: 2025-10-05

---

## 🔗 相关链接

- [NPM 包](https://www.npmjs.com/package/mio-previewer)
- [GitHub 仓库](https://github.com/Pretend-to/mio-previewer)
- [在线演示](https://pretend-to.github.io/mio-previewer) _(如果有)_

---

**Happy Coding! 🚀**
