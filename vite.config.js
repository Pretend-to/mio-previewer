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
          'entries/md': fileURLToPath(new URL('./src/entries/md.ts', import.meta.url)),
          'plugins/custom': fileURLToPath(new URL('./src/entries/plugins/custom.ts', import.meta.url)),
          'plugins/markdown-it': fileURLToPath(new URL('./src/entries/plugins/markdown-it.ts', import.meta.url)),
        },
      name: 'MioPreviewer',
      // build only ES and CJS to avoid problematic UMD output
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        // keep original top-level filenames for the main index
        if (entryName === 'index') return `mio-previewer.${format}.js`;
        // for others, preserve relative folders under dist/
        const base = entryName.replace(/^entries\//, 'entries/').replace(/^plugins\//, 'plugins/');
        const ext = format === 'es' ? 'es.js' : 'cjs.js';
        return `${base}.${ext}`;
      }
    },
    rollupOptions: {
      // don't bundle vue
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
