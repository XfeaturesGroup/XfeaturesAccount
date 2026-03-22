import { describe, it, expect } from 'vitest';
import { env, createExecutionContext } from 'cloudflare:test';
import app from '../../src/index';

describe('API Router Integration', () => {
	it('GET / должен возвращать статус "ok" и версию', async () => {
		const request = new Request('http://localhost/');
		const ctx = createExecutionContext();

		const response = await app.fetch(request, env, ctx as any);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({
			status: 'ok',
			service: 'XfeaturesGroup Auth API',
			version: '1.0.0'
		});
	});

	it('должен корректно обрабатывать CORS preflight (OPTIONS)', async () => {
		const request = new Request('http://localhost/api/auth/login', {
			method: 'OPTIONS',
			headers: {
				'Origin': 'https://account.xfeatures.net',
				'Access-Control-Request-Method': 'POST',
			}
		});

		const ctx = createExecutionContext();

		const response = await app.fetch(request, env, ctx as any);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://account.xfeatures.net');
		expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
	});

	it('GET неизвестного роута должен возвращать 404', async () => {
		const request = new Request('http://localhost/api/unknown-route');
		const ctx = createExecutionContext();

		const response = await app.fetch(request, env, ctx as any);

		expect(response.status).toBe(404);
	});
});
