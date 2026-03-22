const PBKDF2_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-512';
const SALT_LENGTH_BYTES = 32;
const TOKEN_LENGTH_BYTES = 64;

function bufToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function base64UrlToBuf(base64url: string): ArrayBuffer {
	let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw', encoder.encode(crypto.randomUUID()),
		{ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
	);

	const hashA = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(a)));
	const hashB = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(b)));

	let result = 0;
	if (hashA.length !== hashB.length) return false;
	for (let i = 0; i < hashA.length; i++) {
		result |= hashA[i] ^ hashB[i];
	}
	return result === 0;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);

	const hashBuffer = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: PBKDF2_ITERATIONS,
			hash: HASH_ALGORITHM,
		},
		keyMaterial,
		512
	);

	return {
		hash: bufToBase64Url(hashBuffer),
		salt: bufToBase64Url(salt.buffer),
	};
}

export async function verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const saltBuffer = base64UrlToBuf(storedSalt);

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		{ name: 'PBKDF2' },
		false,
		['deriveBits']
	);

	const hashBuffer = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: saltBuffer,
			iterations: PBKDF2_ITERATIONS,
			hash: HASH_ALGORITHM,
		},
		keyMaterial,
		512
	);

	const computedHash = bufToBase64Url(hashBuffer);

	return await timingSafeEqual(computedHash, storedHash);
}

export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH_BYTES));
	return bufToBase64Url(bytes.buffer);
}

export function generateId(): string {
	return crypto.randomUUID();
}

export async function hashToken(token: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(token);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);

	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
