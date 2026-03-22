import { describe, it, expect, beforeEach } from 'vitest';
import { env, createExecutionContext } from 'cloudflare:test';
import app from '../../src/index';
import { hashPassword, hashToken } from '../../src/crypto';

describe('User Protected Routes Integration', () => {
	let validCookie = '';

	beforeEach(async () => {
		const schema = `
			DROP TABLE IF EXISTS users;
			CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT, salt TEXT, first_name TEXT, last_name TEXT, email_verified BOOLEAN DEFAULT 0, avatar_url TEXT, role TEXT DEFAULT 'user', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at INTEGER, anti_phishing_code TEXT, is_2fa_enabled BOOLEAN DEFAULT 0, language TEXT, totp_secret TEXT);
			DROP TABLE IF EXISTS sessions;
			CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT, ip_address TEXT, user_agent TEXT, expires_at INTEGER, location TEXT);
			DROP TABLE IF EXISTS audit_logs;
			CREATE TABLE audit_logs (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, ip_address TEXT, details TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
		`.replace(/\n/g, ' ');
		await env.DB.exec(schema);

		const { hash, salt } = await hashPassword('MySecret123!');
		await env.DB.prepare(
			'INSERT INTO users (id, username, email, password_hash, salt, language) VALUES (?, ?, ?, ?, ?, ?)'
		).bind('test-user-id', 'johndoe', 'john@example.com', hash, salt, 'en').run();

		const rawToken = 'super_secret_session_token';
		const hashedToken = await hashToken(rawToken);
		const futureTime = Math.floor(Date.now() / 1000) + 3600;

		await env.DB.prepare(
			'INSERT INTO sessions (id, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)'
		).bind(hashedToken, 'test-user-id', 'test-agent', futureTime).run();

		validCookie = `session_id=${rawToken}`;
	});

	describe('GET /api/user/me', () => {
		it('должен возвращать 401 для неавторизованных запросов', async () => {
			const request = new Request('http://localhost/api/user/me');
			const response = await app.fetch(request, env, createExecutionContext() as any);

			expect(response.status).toBe(401);
		});

		it('должен возвращать данные профиля для авторизованного юзера', async () => {
			const request = new Request('http://localhost/api/user/me', {
				headers: {
					'Cookie': validCookie,
					'User-Agent': 'test-agent'
				}
			});
			const response = await app.fetch(request, env, createExecutionContext() as any);
			const data = await response.json() as any;

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.user.username).toBe('johndoe');
			expect(data.user.email).toBe('john@example.com');
			expect(data.user.is_2fa_enabled).toBe(false);
		});
	});

	describe('PUT /api/user/profile', () => {
		it('должен отклонять изменения без указания текущего пароля', async () => {
			const request = new Request('http://localhost/api/user/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': validCookie,
					'User-Agent': 'test-agent',
					'Origin': 'https://account.xfeatures.net'
				},
				body: JSON.stringify({ firstName: 'Johnny' })
			});

			const response = await app.fetch(request, env, createExecutionContext() as any);
			const data = await response.json() as any;

			expect(response.status).toBe(403);
			expect(data.error).toContain('Current password is required');
		});

		it('должен отклонять изменения, если текущий пароль неверный', async () => {
			const request = new Request('http://localhost/api/user/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': validCookie,
					'User-Agent': 'test-agent',
					'Origin': 'https://account.xfeatures.net'
				},
				body: JSON.stringify({ currentPassword: 'WrongPassword', firstName: 'Johnny' })
			});

			const response = await app.fetch(request, env, createExecutionContext() as any);
			expect(response.status).toBe(403);
		});

		it('должен успешно обновлять имя и язык при верном пароле', async () => {
			const request = new Request('http://localhost/api/user/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Cookie': validCookie,
					'User-Agent': 'test-agent',
					'Origin': 'https://account.xfeatures.net'
				},
				body: JSON.stringify({
					currentPassword: 'MySecret123!',
					firstName: 'Johnny',
					language: 'ru'
				})
			});

			const response = await app.fetch(request, env, createExecutionContext() as any);
			const data = await response.json() as any;

			expect(response.status).toBe(200);
			expect(data.user.first_name).toBe('Johnny');

			const updatedUser = await env.DB.prepare('SELECT first_name, language FROM users WHERE id = ?').bind('test-user-id').first() as any;
			expect(updatedUser.first_name).toBe('Johnny');
			expect(updatedUser.language).toBe('ru');
		});
	});

	describe('POST /api/media/avatar', () => {
		it('должен отклонять невалидные файлы аватарок (проверка сигнатуры)', async () => {
			const formData = new FormData();
			const fakeImage = new File(['just some text data'], 'avatar.png', { type: 'image/png' });
			formData.append('avatar', fakeImage);

			const request = new Request('http://localhost/api/media/avatar', {
				method: 'POST',
				headers: {
					'Cookie': validCookie,
					'User-Agent': 'test-agent',
					'Origin': 'https://account.xfeatures.net'
				},
				body: formData
			});

			const response = await app.fetch(request, env, createExecutionContext() as any);
			const data = await response.json() as any;

			expect(response.status).toBe(400);
			expect(data.error).toContain('Invalid file signature');
		});
	});
});
