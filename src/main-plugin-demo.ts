// 测试插件系统的简单脚本
import { createApp } from 'vue'
import PluginDemo from './App-plugin-demo.vue'

const app = createApp(PluginDemo)
app.mount('#app')
