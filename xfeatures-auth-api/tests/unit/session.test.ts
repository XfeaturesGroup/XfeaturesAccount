import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { requireAuth, AuthenticatedRequest } from '../../src/middleware/session';
import { hashToken } from '../../src/crypto';

describe('Session Middleware (requireAuth)', () => {
	beforeEach(async () => {
		const schema = `
			DROP TABLE IF EXISTS sessions;
			CREATE TABLE sessions (
				id TEXT PRIMARY KEY,
				user_id TEXT,
				ip_address TEXT,
				user_agent TEXT,
				expires_at INTEGER,
				location TEXT
			);
		`.replace(/\n/g, ' ');

		await env.DB.exec(schema);
	});

	it('должен возвращать 401, если куки нет вообще', async () => {
		const req = new Request('http://localhost/api/user/me') as AuthenticatedRequest;

		const response = await requireAuth(req, env);
		const data = await response?.json() as any;

		expect(response?.status).toBe(401);
		expect(data.error).toBe('Unauthorized: Missing session token');
	});

	it('должен возвращать 401 для несуществующей сессии', async () => {
		const req = new Request('http://localhost/api/user/me', {
			headers: { 'Cookie': 'session_id=fake_token_123' }
		}) as AuthenticatedRequest;

		const response = await requireAuth(req, env);
		expect(response?.status).toBe(401);
	});

	it('должен возвращать 401 и удалять сессию, если она истекла', async () => {
		const rawToken = 'expired_token';
		const hashed = await hashToken(rawToken);
		const pastTime = Math.floor(Date.now() / 1000) - 10000;

		await env.DB.prepare('INSERT INTO sessions (id, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)')
			.bind(hashed, 'user-1', 'test-agent', pastTime).run();

		const req = new Request('http://localhost/api/user/me', {
			headers: {
				'Cookie': `session_id=${rawToken}`,
				'User-Agent': 'test-agent'
			}
		}) as AuthenticatedRequest;

		const response = await requireAuth(req, env);
		expect(response?.status).toBe(401);

		const sessionInDb = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(hashed).first();
		expect(sessionInDb).toBeNull();
	});

	it('должен пропускать запрос (возвращать undefined) и добавлять userId для валидной сессии', async () => {
		const rawToken = 'good_token';
		const hashed = await hashToken(rawToken);
		const futureTime = Math.floor(Date.now() / 1000) + 10000;

		await env.DB.prepare('INSERT INTO sessions (id, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)')
			.bind(hashed, 'user-99', 'test-agent', futureTime).run();

		const req = new Request('http://localhost/api/user/me', {
			headers: {
				'Cookie': `session_id=${rawToken}`,
				'User-Agent': 'test-agent'
			}
		}) as AuthenticatedRequest;

		const response = await requireAuth(req, env);

		expect(response).toBeUndefined();
		expect(req.userId).toBe('user-99');
	});
});
