<script lang="ts">
	import { onMount } from 'svelte';
	import type { RendererInstance } from '$external/index';
	
	let canvas: HTMLCanvasElement;
	let rendererInstance: RendererInstance | null = null;
	let error: string | null = null;
	let isDrawMode = false;
	
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

	function toggleDrawMode() {
		if (rendererInstance) {
			isDrawMode = !isDrawMode;
			rendererInstance.eventBus.emit('TOGGLE_DRAW_MODE', { enabled: isDrawMode });
		}
	}
</script>

{#if error}
	<div class="error">
		<h1>Error</h1>
		<p>{error}</p>
	</div>
{:else}
	<canvas bind:this={canvas}></canvas>
	<div class="controls">
		<button 
			class="draw-mode-btn" 
			class:active={isDrawMode}
			on:click={toggleDrawMode}
		>
			{isDrawMode ? 'Exit Draw Mode' : 'Draw Mode'}
		</button>
	</div>
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

	.controls {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 1000;
	}

	.draw-mode-btn {
		padding: 12px 24px;
		font-size: 14px;
		font-weight: 600;
		background: rgba(255, 255, 255, 0.1);
		color: #ffffff;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		cursor: pointer;
		backdrop-filter: blur(10px);
		transition: all 0.2s ease;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

	.draw-mode-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.5);
		transform: translateY(-1px);
	}

	.draw-mode-btn:active {
		transform: translateY(0);
	}

	.draw-mode-btn.active {
		background: rgba(74, 144, 217, 0.8);
		border-color: #4a90d9;
		box-shadow: 0 0 20px rgba(74, 144, 217, 0.5);
	}

	.draw-mode-btn.active:hover {
		background: rgba(74, 144, 217, 0.9);
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

