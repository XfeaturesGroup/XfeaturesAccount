import { error, json, IRequest } from 'itty-router';
import { Env } from '../index';
import { hashPassword, verifyPassword, generateId, generateSessionToken, hashToken } from '../crypto';
import * as OTPAuth from 'otpauth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d).{8,}$/;

export const checkUsernameHandler = async (request: IRequest, env: Env) => {
	const url = new URL(request.url);
	const username = url.searchParams.get('username');

	if (!username) return error(400, { error: 'Username parameter is required' });

	const existingUser = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
		.bind(username.trim())
		.first();

	return json({ available: !existingUser });
};

export const registerHandler = async (request: IRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);

	if (!body || !body.email || !body.username || !body.password) {
		return error(400, { error: 'Missing required fields: email, username, password' });
	}

	const email = body.email.trim().toLowerCase();
	const username = body.username.trim();
	const password = body.password;

	if (!EMAIL_REGEX.test(email)) return error(400, { error: 'Invalid email format' });
	if (!USERNAME_REGEX.test(username)) return error(400, { error: 'Username must be 3-20 characters (letters, numbers, underscores)' });
	if (!PASSWORD_REGEX.test(password)) return error(400, { error: 'Password must be 8+ chars, include uppercase, lowercase, and a number' });

	const existingUser = await env.DB.prepare('SELECT email, username FROM users WHERE email = ? OR username = ?')
		.bind(email, username)
		.first();

	if (existingUser) {
		if (existingUser.email === email) return error(409, { error: 'Email is already registered' });
		return error(409, { error: 'Username is already taken' });
	}

	const { hash, salt } = await hashPassword(password);
	const userId = generateId();

	try {
		await env.DB.prepare(
			`INSERT INTO users (id, username, email, password_hash, salt) VALUES (?, ?, ?, ?, ?)`
		).bind(userId, username, email, hash, salt).run();

	} catch (err: any) {
		if (err.message && err.message.includes('UNIQUE constraint failed')) {
			if (err.message.includes('users.email')) {
				return error(409, { error: 'Email is already registered' });
			}
			return error(409, { error: 'Username is already taken' });
		}
		console.error('Registration error:', err);
		return error(500, { error: 'Database error during registration' });
	}

	return json({ success: true, message: 'User registered successfully', user: { id: userId, username, email } }, { status: 201 });
};

export const loginHandler = async (request: IRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.email || !body.password) return error(400, { error: 'Missing credentials' });

	const email = body.email.trim().toLowerCase();
	const totpCode = body.totpCode;

	const user: any = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

	if (!user) {
		await hashPassword(body.password);
		return error(401, { error: 'Invalid email or password' });
	}

	const isPasswordValid = await verifyPassword(body.password, user.password_hash, user.salt);
	if (!isPasswordValid) return error(401, { error: 'Invalid email or password' });

	const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
	const userAgent = request.headers.get('User-Agent') || 'unknown';

	if (user.is_2fa_enabled) {
		if (!totpCode || typeof totpCode !== 'string') {
			return new Response(JSON.stringify({ error: 'Valid 2FA code required', require2FA: true }), {
				status: 403, headers: { 'Content-Type': 'application/json' }
			});
		}

		if (totpCode.length === 8) {
			const oldBackupCodesStr = user.backup_codes;
			const backupCodes = oldBackupCodesStr ? JSON.parse(oldBackupCodesStr) : [];
			const hashedTotpCode = await hashToken(totpCode);

			if (!backupCodes.includes(hashedTotpCode)) {
				await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'login_failed', ?, ?)").bind(crypto.randomUUID(), user.id, ipAddress, JSON.stringify({ reason: 'Invalid backup code' })).run();
				return error(403, { error: 'Invalid backup code.' });
			}
			const updatedCodes = backupCodes.filter((c: string) => c !== hashedTotpCode);

			const updateResult = await env.DB.prepare('UPDATE users SET backup_codes = ? WHERE id = ? AND backup_codes = ?')
				.bind(JSON.stringify(updatedCodes), user.id, oldBackupCodesStr).run();

			if (updateResult.meta.changes === 0) {
				await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'login_failed', ?, ?)").bind(crypto.randomUUID(), user.id, ipAddress, JSON.stringify({ reason: 'Backup code race condition mitigated' })).run();
				return error(403, { error: 'Invalid or already used backup code.' });
			}
		} else {
			const totp = new OTPAuth.TOTP({
				issuer: 'Xfeatures', algorithm: 'SHA1', digits: 6, period: 30, secret: user.totp_secret
			});
			if (totp.validate({ token: totpCode, window: 1 }) === null) {
				await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'login_failed', ?, ?)").bind(crypto.randomUUID(), user.id, ipAddress, JSON.stringify({ reason: 'Invalid TOTP' })).run();
				return error(403, { error: 'Invalid 2FA code. Please try again.' });
			}
		}
	}

	const cf = (request as any).cf;
	const city = cf?.city || 'Unknown';
	const country = cf?.country || request.headers.get('CF-IPCountry') || 'Unknown';
	const location = (city !== 'Unknown' || country !== 'Unknown') ? `${city}, ${country}`.replace('Unknown, ', '') : 'Unknown Location';

	await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'login_success', ?, ?)")
        .bind(crypto.randomUUID(), user.id, ipAddress, JSON.stringify({ location })).run();

	const sessionId = generateSessionToken();
	const hashedSessionId = await hashToken(sessionId);
	const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7);

	await env.DB.prepare(
		`INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at, location) VALUES (?, ?, ?, ?, ?, ?)`
	).bind(hashedSessionId, user.id, ipAddress, userAgent, expiresAt, location).run();

	const cookieStr = `session_id=${sessionId}; Domain=xfeatures.net; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`;

	return new Response(
		JSON.stringify({ success: true, message: 'Logged in successfully', user: { id: user.id, username: user.username, email: user.email } }),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': cookieStr
			}
		}
	);
};

export const logoutHandler = async (request: IRequest, env: Env) => {
	const cookieHeader = request.headers.get('Cookie');
	const sessionId = cookieHeader?.match(/session_id=([^;]+)/)?.[1];

	if (sessionId) {
		const hashedSessionId = await hashToken(sessionId);
		await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(hashedSessionId).run();
	}

	const deadCookie = `session_id=; Domain=xfeatures.net; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

	return new Response(
		JSON.stringify({ success: true, message: 'Logged out successfully' }),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Set-Cookie': deadCookie
			}
		}
	);
};
