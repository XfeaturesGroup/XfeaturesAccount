import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';

describe('Database Integration', () => {
	beforeEach(async () => {
		const schema = `
      DROP TABLE IF EXISTS users;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE
      );
    `.replace(/\n/g, ' ');

		await env.DB.exec(schema);
	});

	it('должен создавать пользователя в БД', async () => {
		await env.DB.prepare('INSERT INTO users (id, username) VALUES (?, ?)')
			.bind('123', 'testuser').run();

		const result = await env.DB.prepare('SELECT * FROM users WHERE username = ?')
			.bind('testuser').first();

		expect(result).toBeDefined();
		expect(result.id).toBe('123');
	});
});
