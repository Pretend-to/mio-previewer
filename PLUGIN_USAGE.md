# 插件使用指南

## 统一的插件 API

所有插件现在都是**工厂函数**，支持可选配置参数。

### 基本用法

```typescript
import MdRenderer from 'mio-previewer';
import { 
  codeBlockPlugin, 
  emojiPlugin, 
  mermaidPlugin, 
  cursorPlugin 
} from 'mio-previewer/plugins/custom';
import { 
  alertPlugin, 
  katexPlugin 
} from 'mio-previewer/plugins/markdown-it';

// 使用默认配置
const customPlugins = [
  { plugin: codeBlockPlugin },
  { plugin: emojiPlugin },
  { plugin: mermaidPlugin },
  { plugin: cursorPlugin }
];

const markdownItPlugins = [
  { plugin: alertPlugin },
  { plugin: katexPlugin }
];
```

### 带配置使用

```typescript
// 自定义插件配置
const customPlugins = [
  // CodeBlock 插件 - 自定义优先级和语言别名
  { 
    plugin: codeBlockPlugin,
    options: {
      priority: 80,
      languageAliases: {
        js: 'javascript',
        ts: 'typescript'
      }
    }
  },
  
  // Emoji 插件 - 添加自定义 emoji
  { 
    plugin: emojiPlugin,
    options: {
      customEmojis: {
        ':custom:': '🎨',
        ':logo:': '🚀'
      }
    }
  },
  
  // Mermaid 插件 - 自定义主题
  { 
    plugin: mermaidPlugin,
    options: {
      priority: 90,
      theme: 'dark'
    }
  },
  
  // Cursor 插件 - 自定义光标样式
  { 
    plugin: cursorPlugin,
    options: {
      shape: 'line',
      color: '#00ff00',
      blinkSpeed: 600
    }
  }
];
```

## 插件配置选项详解

### 1. codeBlockPlugin

```typescript
import type { CodeBlockPluginOptions } from 'mio-previewer/plugins/custom';

const options: CodeBlockPluginOptions = {
  // 优先级（默认 70）
  priority: 70,
  
  // 语言别名映射
  languageAliases: {
    js: 'javascript',
    ts: 'typescript',
    py: 'python'
  }
};
```

### 2. emojiPlugin

```typescript
import type { EmojiPluginOptions } from 'mio-previewer/plugins/custom';

const options: EmojiPluginOptions = {
  // 优先级（默认 10）
  priority: 10,
  
  // 自定义 emoji 映射（会与内置 emoji 合并）
  customEmojis: {
    ':custom:': '🎨',
    ':brand:': '🚀',
    ':cool:': '😎'
  }
};

// 内置支持的 emoji:
// :smile: 😊, :heart: ❤️, :fire: 🔥, :rocket: 🚀, :star: ⭐
// :thumbsup: 👍, :tada: 🎉, :check: ✅, :cross: ❌, :eyes: 👀
// :thinking: 🤔, :100: 💯
```

### 3. mermaidPlugin

```typescript
import type { MermaidPluginOptions } from 'mio-previewer/plugins/custom';

const options: MermaidPluginOptions = {
  // 优先级（默认 80，高于 CodeBlock）
  priority: 80,
  
  // Mermaid 主题
  theme: 'dark' // 'default' | 'dark' | 'forest' | 'neutral'
};
```

### 4. cursorPlugin

```typescript
import type { CursorPluginOptions } from 'mio-previewer/plugins/custom';

const options: CursorPluginOptions = {
  // 光标形状
  shape: 'line', // 'square' | 'line'
  
  // 光标颜色（CSS 颜色值）
  color: '#0066ff',
  
  // 闪烁速度（毫秒）
  blinkSpeed: 800,
  
  // 优先级（默认 100）
  priority: 100
};
```

## 完整示例

```vue
<template>
  <div>
    <MdRenderer 
      :md="markdownText" 
      :isStreaming="isStreaming"
      :customPlugins="customPlugins"
      :markdownItPlugins="markdownItPlugins"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import MdRenderer from 'mio-previewer';
import { 
  codeBlockPlugin, 
  emojiPlugin, 
  mermaidPlugin, 
  cursorPlugin 
} from 'mio-previewer/plugins/custom';
import { 
  alertPlugin, 
  katexPlugin 
} from 'mio-previewer/plugins/markdown-it';
import 'mio-previewer/style.css';

const markdownText = ref('# Hello World :rocket:');
const isStreaming = ref(false);

// 自定义插件配置
const customPlugins = ref([
  { 
    plugin: cursorPlugin, 
    options: { 
      shape: 'line',
      color: '#0066ff'
    } 
  },
  { plugin: mermaidPlugin },
  { 
    plugin: codeBlockPlugin,
    options: {
      languageAliases: { js: 'javascript' }
    }
  },
  { 
    plugin: emojiPlugin,
    options: {
      customEmojis: { ':custom:': '🎨' }
    }
  }
]);

// Markdown-it 插件配置
const markdownItPlugins = ref([
  { plugin: alertPlugin },
  { plugin: katexPlugin }
]);
</script>
```

## 注意事项

1. **所有插件都必须作为工厂函数调用**，即使不传参数也要写 `{ plugin: pluginName }`
2. **`options` 是可选的**，不传则使用默认配置
3. **插件优先级**：数字越大越先执行
4. **类型安全**：建议导入并使用各插件的 Options 类型以获得 TypeScript 提示

## TypeScript 支持

```typescript
import type { 
  CodeBlockPluginOptions,
  EmojiPluginOptions,
  MermaidPluginOptions,
  CursorPluginOptions,
  CustomPluginConfig
} from 'mio-previewer/plugins/custom';

const customPlugins: CustomPluginConfig[] = [
  { plugin: codeBlockPlugin },
  { 
    plugin: emojiPlugin,
    options: { customEmojis: { ':test:': '✨' } } satisfies EmojiPluginOptions
  }
];
```
