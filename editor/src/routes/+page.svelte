<script lang="ts">
	import { onMount } from 'svelte';
	import type { RendererInstance } from '$external/index';
	
	let canvas: HTMLCanvasElement;
	let rendererInstance: RendererInstance | null = null;
	let error: string | null = null;
	
	onMount(async () => {
		try {
			// Check for WebGPU support
			if (!navigator.gpu) {
				error = 'WebGPU is not supported in this browser. Please use Chrome/Edge 113+ or a browser with WebGPU enabled.';
				return;
			}
			
		// Dynamically import the engine
		const { initRenderer } = await import('$external/engine.js');
			
		// Initialize the engine
		rendererInstance = await initRenderer(canvas);
		} catch (err) {
		error = err instanceof Error ? err.message : 'Failed to initialize engine';
		console.error('Engine initialization error:', err);
		}
		
		// Cleanup on component destroy
		return () => {
			if (rendererInstance) {
				rendererInstance.cleanup();
			}
		};
	});
</script>

{#if error}
	<div class="error">
		<h1>Error</h1>
		<p>{error}</p>
	</div>
{:else}
	<canvas bind:this={canvas}></canvas>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
	
	canvas {
		display: block;
		width: 100vw;
		height: 100vh;
	}
	
	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: #1a1a1a;
		color: #ff6b6b;
		padding: 2rem;
		text-align: center;
	}
	
	.error h1 {
		font-size: 3rem;
		margin: 0 0 1rem 0;
	}
	
	.error p {
		font-size: 1.2rem;
		max-width: 600px;
		line-height: 1.6;
	}
</style>

