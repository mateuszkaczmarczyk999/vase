import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			'$external': path.resolve('./external')
		}
	},
	server: {
		fs: {
			allow: ['..']
		}
	}
});

