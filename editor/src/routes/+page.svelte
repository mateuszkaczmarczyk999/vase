<script lang="ts">
	let count = $state<number>(0);
	
	function increment(): void {
		count++;
	}
</script>

<main>
	<h1>Hello World!</h1>
	<p>Welcome to Svelte 5</p>
	
	<div class="counter">
		<button onclick={increment}>
			Count: {count}
		</button>
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}
	
	h1 {
		font-size: 4rem;
		margin: 0;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
	}
	
	p {
		font-size: 1.5rem;
		margin: 1rem 0 2rem;
		opacity: 0.9;
	}
	
	.counter {
		margin-top: 2rem;
	}
	
	button {
		background: white;
		color: #667eea;
		border: none;
		padding: 1rem 2rem;
		font-size: 1.2rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
		font-weight: 600;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
	
	button:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
	}
	
	button:active {
		transform: translateY(0);
	}
</style>

