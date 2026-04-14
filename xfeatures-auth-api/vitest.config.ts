import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.toml' },
		}),
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, './src')
		}
	}
});
