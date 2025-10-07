import { createApp, h } from 'vue'

// dynamic import to ensure Vite processes the SFC and avoids runtime-template issues
;(async () => {
	const mod = await import('./entries/BenchmarkHighFreq.vue')
	const Comp = mod.default || mod
	const app: any = createApp(Comp)
	app.mount('#app')
	// expose ready flag for external runners after mount
	;(window as any).__benchmarkAppReady = true
})()
