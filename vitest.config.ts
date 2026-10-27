import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'node',
					typecheck: {
						enabled: true,
					},
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
