import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
      lib: {
        entry: {
          index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
          'plugins/custom': fileURLToPath(new URL('./src/plugins/custom/index.ts', import.meta.url)),
          'plugins/markdown-it': fileURLToPath(new URL('./src/plugins/markdown-it/index.ts', import.meta.url)),
        },
      name: 'MioPreviewer',
      // build only ES and CJS to avoid problematic UMD output
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        // keep original top-level filenames for the main index
        if (entryName === 'index') return `mio-previewer.${format}.js`;
        // for plugins, preserve folder structure
        if (entryName.startsWith('plugins/')) {
          const ext = format === 'es' ? 'es.js' : 'cjs.js';
          return `${entryName}.${ext}`;
        }
        return `[name].${format}.js`;
      }
    },
    rollupOptions: {
      // don't bundle vue
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          // Handle main entry
          if (facadeModuleId.includes('src/index.ts')) {
            return chunkInfo.isEntry ? `mio-previewer.[format].js` : `[name].[format].js`;
          }
          // Handle plugins/custom
          if (facadeModuleId.includes('src/plugins/custom/index.ts')) {
            return `plugins/custom.[format].js`;
          }
          // Handle plugins/markdown-it
          if (facadeModuleId.includes('src/plugins/markdown-it/index.ts')) {
            return `plugins/markdown-it.[format].js`;
          }
          // Default fallback
          return `[name].[format].js`;
        }
      }
    }
  }
})
