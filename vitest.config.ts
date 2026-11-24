import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			exclude: [
				/* prettier-ignore */
				'**/coverage/**',
				'**/dist/**',
			],
			enabled: true,
			reporter: [
				/* prettier-ignore */
				'json',
				['text', { skipFull: true }],
			],
			thresholds: {
				100: true,
			},
		},
		projects: [
			{
				test: {
					name: 'node',
				},
			},
			{
				test: {
					name: 'browser',
					browser: {
						enabled: true,
						headless: true,
						instances: [{ browser: 'chromium' }],
						provider: playwright({
							launchOptions: {
								channel: 'chrome',
							},
						}),
					},
				},
			},
		],
	},
});
