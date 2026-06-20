<!-- App-plugin-demo.vue - 插件系统演示 -->
<template>
  <div class="container">
    <div class="controls">
      <h2>插件系统演示</h2>
      <div class="control-row">
        <label class="switch-label">
          <input 
            type="checkbox" 
            v-model="enableStreaming" 
            class="switch-checkbox"
          />
          <span class="switch-text">
            {{ enableStreaming ? '流式输出' : '全量输出' }}
          </span>
        </label>
      </div>
      <div class="control-row">
        <label>光标形状:</label>
        <select v-model="cursorShape" @change="updatePlugins">
          <option value="square">方形 ▮</option>
          <option value="line">竖线 |</option>
        </select>
      </div>
      <div class="control-row">
        <label>光标颜色:</label>
        <input type="color" v-model="cursorColor" @change="updatePlugins" />
      </div>
      <div class="control-row">
        <label class="switch-label">
          <input 
            type="checkbox" 
            v-model="showLineNumbers" 
            class="switch-checkbox"
            @change="updatePlugins"
          />
          <span class="switch-text">
            显示代码行号
          </span>
        </label>
      </div>
      <div class="button-row">
        <button @click="startRendering">{{ enableStreaming ? '开始流式渲染' : '全量渲染' }}</button>
        <button @click="resetStreaming">重置</button>
      </div>
    </div>
    <div class="preview">
      <MdRenderer 
        :md="markdownStream" 
        :isStreaming="isStreaming"
        :customPlugins="customPlugins"
        :markdownItPlugins="markdownItPlugins"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck - 禁用 TypeScript 检查以避免模板字符串中 $ 符号的误报错误
import { ref } from 'vue'
/* 从编译后的包中导入 */
// import MdRenderer from '/dist/mio-previewer.es.js'
// import { alertPlugin, katexPlugin } from '/dist/plugins/markdown-it.es.js'
// import { mermaidPlugin, codeBlockPlugin, emojiPlugin, cursorPlugin } from '/dist/plugins/custom.es.js'
// import '/dist/mio-previewer.css'

/* 从源码中导入 - 仅用于开发环境 */
import MdRenderer from './MdRenderer.vue'
import { alertPlugin, katexPlugin } from './plugins/markdown-it'
import { mermaidPlugin, codeBlockPlugin, emojiPlugin, cursorPlugin } from './plugins/custom'

const markdownStream = ref('')
const isStreaming = ref(false)
const enableStreaming = ref(true) // 控制是否启用流式输出
const cursorShape = ref<'square' | 'line'>('square') // 光标形状
const cursorColor = ref('#0066ff') // 光标颜色
const showLineNumbers = ref(true) // 是否显示代码行号

// 示例文本，包含自定义标记
// @ts-ignore - TypeScript 误解析模板字符串中的 $ 符号
const fullText = `# 插件系统演示 :rocket:

这是一个普通的段落，包含一些表情 :smile: :fire:

## 自定义 Alert 警告框

::: info
这是一个 **info** 类型的警告框 :eyes:
支持 *Markdown* 语法!
:::

::: warning
⚠️ 这是一个 **warning** 类型的警告框
可以有 \`代码\` 和其他格式
:::

::: error
❌ 这是一个 **error** 类型的警告框
- 支持列表
- 支持 **加粗**
:::

::: success
✅ 这是一个 **success** 类型的警告框 :check:
[链接也可以](https://example.com)
:::

## Emoji 表情替换

Hello :smile: Welcome! :tada:

Let's build something awesome :rocket: :fire:

Great work! :thumbsup: :100: :star:

## 数学公式 (KaTeX)

支持多种定界符语法：单美元符、双美元符、反斜杠圆括号、反斜杠方括号

### 行内公式 - 使用 $...$

质能方程: $E = mc^2$

勾股定理: $a^2 + b^2 = c^2$

二次方程: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$

### 行内公式 - 使用 \\(...\\)

圆的面积: \\(A = \\pi r^2\\)

欧拉公式: \\(e^{i\\pi} + 1 = 0\\)

### 块级公式 - 使用 $$...$$

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

### 块级公式 - 使用 \\[...\\]

\\[
\\begin{bmatrix}
a & b \\\\
c & d
\\end{bmatrix}
\\begin{bmatrix}
x \\\\
y
\\end{bmatrix}
=
\\begin{bmatrix}
ax + by \\\\
cx + dy
\\end{bmatrix}
\\]

\\[
f(x) = \\int_{-\\infty}^{x} e^{-t^2} dt
\\]

## 代码块高亮

### JavaScript 代码

\`\`\`javascript
const plugins = [AlertPlugin, EmojiPlugin, CodeBlockPlugin];

// 初始化 markdown 渲染器
function initRenderer() {
  console.log('Plugins loaded!', plugins);
  return new MdRenderer({
    customPlugins: plugins,
    markdownItOptions: { html: true }
  });
}

// 异步加载
async function loadData() {
  const response = await fetch('/api/data');
  return response.json();
}
\`\`\`

### Python 代码

\`\`\`python
def hello_world():
    """打印 Hello World"""
    print("Hello, World! 🌍")
    
    # 列表推导式
    squares = [x**2 for x in range(10)]
    return squares

if __name__ == "__main__":
    hello_world()
\`\`\`

### HTML 代码 (可预览)

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Hello</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .box { background: #f0f0f0; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Hello, World! 🎉</h1>
    <p>This is a <strong>preview</strong> example.</p>
    <button onclick="alert('Clicked!')">Click Me</button>
  </div>
</body>
</html>
\`\`\`

### TypeScript 代码

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
\`\`\`

## Mermaid 图表 :chart_with_upwards_trend:

### 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B{是否成功?}
    B -->|是| C[继续]
    B -->|否| D[重试]
    D --> B
    C --> E[结束]
\`\`\`

### 时序图

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 浏览器
    participant 服务器
    用户->>浏览器: 点击按钮
    浏览器->>服务器: 发送请求
    服务器-->>浏览器: 返回数据
    浏览器-->>用户: 显示结果
\`\`\`

### 状态图

\`\`\`mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中: 开始
    处理中 --> 已完成: 成功
    处理中 --> 失败: 错误
    失败 --> 待处理: 重试
    已完成 --> [*]
\`\`\`

### 类图

\`\`\`mermaid
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }
    class Admin {
        +String permissions
        +manageUsers()
    }
    User <|-- Admin
\`\`\`

## 列表 :check:

- 项目 1 :star:
- 项目 2 :fire:
- 项目 3 :rocket:

## 表格

| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A :heart: | B :star: | C :fire: |
| D | E | F |

## 链接

这是一个 [链接示例](https://example.com) :eyes:

---

**流式渲染完成!** :tada: :100:
`

// 使用内置插件 (注意顺序：高优先级在前)
// 新的插件系统支持配置 options
const customPlugins = ref([
  // 自定义光标样式（会覆盖默认的 cursorPlugin）
  { 
    plugin: cursorPlugin, 
    options: { 
      shape: cursorShape.value,
      color: cursorColor.value,
      blinkSpeed: 800 
    } 
  },
  { plugin: mermaidPlugin },    // priority: 80
  { 
    plugin: codeBlockPlugin,  // priority: 70
    options: {
      publishUrl: 'https://httpbin.org/post', // 测试用的发布接口
      onPublished: (url: string) => {
        console.log('HTML 已发布到:', url);
      },
      showLineNumbers: showLineNumbers.value
    }
  },
  { plugin: emojiPlugin }       // priority: 10
]);

// 配置 markdown-it 插件
const markdownItPlugins = ref([
  { plugin: alertPlugin },   // Alert 容器语法支持
  { plugin: katexPlugin }    // KaTeX 数学公式支持
]);

let intervalId: number | null = null;

function startRendering() {
  if (isStreaming.value) return;
  
  markdownStream.value = '';
  
  if (enableStreaming.value) {
    // 流式输出模式
    isStreaming.value = true;
    let index = 0;

    intervalId = window.setInterval(() => {
      if (index < fullText.length) {
        markdownStream.value += fullText[index];
        index++;
      } else {
        isStreaming.value = false;
        if (intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      }
    }, 20); // 每 20 毫秒追加一个字符
  } else {
    // 全量输出模式
    isStreaming.value = false;
    markdownStream.value = fullText;
  }
}

function resetStreaming() {
  if (intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  markdownStream.value = '';
  isStreaming.value = false;
}

// 更新插件配置
function updatePlugins() {
  customPlugins.value = [
    { 
      plugin: cursorPlugin, 
      options: { 
        shape: cursorShape.value,
        color: cursorColor.value,
        blinkSpeed: 800 
      } 
    },
    { plugin: mermaidPlugin },
    { 
      plugin: codeBlockPlugin,
      options: {
        publishUrl: 'https://httpbin.org/post',
        onPublished: (url: string) => {
          console.log('HTML 已发布到:', url);
        },
        showLineNumbers: showLineNumbers.value
      }
    },
    { plugin: emojiPlugin }
  ];
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.controls h2 {
  margin: 0 0 15px 0;
  font-size: 24px;
  color: #2d3748;
}

.control-row {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-row label {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
  min-width: 80px;
}

.control-row select {
  padding: 6px 12px;
  font-size: 14px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.control-row select:hover {
  border-color: #3b82f6;
}

.control-row select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.control-row input[type="color"] {
  width: 60px;
  height: 32px;
  padding: 2px;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
}

.control-row input[type="color"]:hover {
  border-color: #3b82f6;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.switch-checkbox {
  width: 50px;
  height: 26px;
  appearance: none;
  background-color: #cbd5e0;
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s;
  outline: none;
}

.switch-checkbox:checked {
  background-color: #3b82f6;
}

.switch-checkbox::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: white;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.switch-checkbox:checked::before {
  transform: translateX(24px);
}

.switch-text {
  font-size: 16px;
  font-weight: 500;
  color: #2d3748;
  min-width: 80px;
}

.button-row {
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background-color: #3b82f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.controls button:hover {
  background-color: #2563eb;
}

.controls button:active {
  background-color: #1d4ed8;
}

.preview {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 400px;
}
</style>
