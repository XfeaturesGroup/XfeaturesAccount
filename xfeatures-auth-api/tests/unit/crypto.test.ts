import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, generateId, hashToken } from '../../src/crypto';

describe('Crypto Utilities', () => {
	it('должен корректно хешировать и проверять пароль', async () => {
		const password = 'SuperSecretPassword123!';

		const { hash, salt } = await hashPassword(password);

		expect(hash).toBeDefined();
		expect(salt).toBeDefined();
		expect(hash).not.toBe(password);

		const isValid = await verifyPassword(password, hash, salt);
		expect(isValid).toBe(true);

		const isInvalid = await verifyPassword('WrongPassword', hash, salt);
		expect(isInvalid).toBe(false);
	});

	it('должен генерировать уникальные сессионные токены', () => {
		const token1 = generateSessionToken();
		const token2 = generateSessionToken();

		expect(token1).toBeDefined();
		expect(typeof token1).toBe('string');
		expect(token1).not.toBe(token2);
	});

	it('должен генерировать валидный UUIDv4', () => {
		const id = generateId();
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		expect(uuidRegex.test(id)).toBe(true);
	});

	it('должен корректно хешировать токены через SHA-256', async () => {
		const token = 'my-test-token';
		const hashed = await hashToken(token);

		expect(hashed).toBeDefined();
		expect(hashed).toHaveLength(64);
	});
});
