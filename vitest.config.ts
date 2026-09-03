import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: [
			/* prettier-ignore */
			...configDefaults.exclude,
			'.agent-*/**',
		],
	},
});
