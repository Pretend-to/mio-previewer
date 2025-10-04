declare module 'markdown-it';
declare module 'htmlparser2';
declare module 'markdown-it-katex';
declare module 'github-markdown-css';

// Minimal Vue shim to allow incremental TS conversion. Exports are `any` and
// meant to be replaced by proper `npm i -D @types/vue` or `vue` types when
// fully converting the repo.
declare module 'vue' {
  export type VNode = any
  export type Ref<T = any> = any
  export const ref: (...args: any[]) => Ref
  export const watch: (...args: any[]) => any
  export const onMounted: (...args: any[]) => any
  export const onUnmounted: (...args: any[]) => any
  export const h: (...args: any[]) => VNode
  export const defineComponent: (...args: any[]) => any
  export function createApp(...args: any[]): any
  // script-setup helpers (compiler macros) — provide minimal signatures
  export function defineProps<T>(): T
  export function defineEmits<T>(): T
}
