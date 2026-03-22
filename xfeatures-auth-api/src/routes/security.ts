import { error, json, IRequest } from 'itty-router';
import { Env } from '../index';
import { AuthenticatedRequest } from '../middleware/session';
import { hashPassword, verifyPassword, generateSessionToken, hashToken } from '../crypto';
import * as OTPAuth from 'otpauth';

const PASSWORD_REGEX = /^(?=.*[a-zа-яё])(?=.*[A-ZА-ЯЁ])(?=.*\d).{8,}$/;

export const changePasswordHandler = async (request: AuthenticatedRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.currentPassword || !body.newPassword) {
		return error(400, { error: 'Current and new passwords are required' });
	}

	if (!PASSWORD_REGEX.test(body.newPassword)) {
		return error(400, { error: 'New password does not meet security requirements' });
	}

	const user: any = await env.DB.prepare('SELECT password_hash, salt, is_2fa_enabled, totp_secret FROM users WHERE id = ?').bind(request.userId).first();

	const isValid = await verifyPassword(body.currentPassword, user.password_hash, user.salt);
	if (!isValid) return error(403, { error: 'Invalid current password' });

	if (user.is_2fa_enabled) {
		if (!body.totpCode || typeof body.totpCode !== 'string') {
			return error(403, { error: '2FA code is required to change password' });
		}
		const totp = new OTPAuth.TOTP({
			issuer: 'Xfeatures',
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: user.totp_secret
		});
		if (totp.validate({ token: body.totpCode, window: 1 }) === null) {
			return error(403, { error: 'Invalid 2FA code' });
		}
	}

	const { hash, salt } = await hashPassword(body.newPassword);
	await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
		.bind(hash, salt, Math.floor(Date.now() / 1000), request.userId).run();

	const cookieHeader = request.headers.get('Cookie') || '';
	const currentSessionId = cookieHeader.match(/session_id=([^;]+)/)?.[1];

	if (currentSessionId) {
		const hashedCurrentSessionId = await hashToken(currentSessionId);
		await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
			.bind(request.userId, hashedCurrentSessionId).run();
	}

	return json({ success: true, message: 'Password changed successfully. Logged out from other devices.' });
};

export const forgotPasswordHandler = async (request: IRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.email) return error(400, { error: 'Email is required' });

	const user: any = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(body.email.trim().toLowerCase()).first();

	if (!user) return json({ success: true, message: 'If this email exists, a reset link has been sent.' });

	const resetToken = generateSessionToken();
	const hashedToken = await hashToken(resetToken);
	const expiresAt = Math.floor(Date.now() / 1000) + 3600;

	await env.DB.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(hashedToken, user.id, expiresAt).run();

	const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
	await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, ?, ?, ?)')
		.bind(crypto.randomUUID(), user.id, 'password_reset_requested', ipAddress, '{}').run();

	const resetLink = `${env.FRONTEND_URL || 'https://account.xfeatures.net'}/reset-password?token=${resetToken}`;
	try {
		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({
				from: 'Xfeatures Security <no-reply@xfeatures.net>',
				to: body.email.trim().toLowerCase(),
				subject: 'Password Reset Request',
				html: `<p>We received a request to reset your password. Click <a href="${resetLink}">here</a> to reset it.</p><p>If you didn't request this, ignore this email.</p>`
			})
		});
	} catch (e) {
		console.error('Password reset email failed:', e);
	}

	return json({ success: true, message: 'If this email exists, a reset link has been sent.'});

	return json({ success: true, message: 'If this email exists, a reset link has been sent.'});
};

export const resetPasswordHandler = async (request: IRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.token || !body.newPassword) return error(400, { error: 'Token and new password required' });

	const hashedToken = await hashToken(body.token);
	const currentTimestamp = Math.floor(Date.now() / 1000);

	const resetRecord: any = await env.DB.prepare('SELECT user_id FROM password_resets WHERE token = ? AND expires_at > ?')
		.bind(hashedToken, currentTimestamp).first();

	if (!resetRecord) return error(400, { error: 'Invalid or expired reset token' });

	const { hash, salt } = await hashPassword(body.newPassword);
	await env.DB.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
		.bind(hash, salt, currentTimestamp, resetRecord.user_id).run();

	await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(resetRecord.user_id).run();
	await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(resetRecord.user_id).run();

	const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
	await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, ?, ?, ?)')
		.bind(crypto.randomUUID(), resetRecord.user_id, 'password_reset_success', ipAddress, '{}').run();

	return json({ success: true, message: 'Password has been reset successfully. Please log in.' });
};

export const getSessionsHandler = async (request: AuthenticatedRequest, env: Env) => {
	const sessions = await env.DB.prepare(
		'SELECT id, ip_address, user_agent, created_at, expires_at, location FROM sessions WHERE user_id = ? ORDER BY created_at DESC'
	).bind(request.userId).all();

	const cookieHeader = request.headers.get('Cookie') || '';
	const currentSessionId = cookieHeader.match(/session_id=([^;]+)/)?.[1];

	let hashedCurrentSessionId = null;
	if (currentSessionId) {
		hashedCurrentSessionId = await hashToken(currentSessionId);
	}

	const safeSessions = sessions.results.map((s: any) => ({
		id: s.id.substring(0, 8) + '...',
		full_id: s.id,
		ip_address: s.ip_address,
		user_agent: s.user_agent,
		created_at: s.created_at,
		location: s.location || 'Unknown Location',
		is_current: s.id === hashedCurrentSessionId
	}));

	return json({ success: true, sessions: safeSessions });
};

export const revokeSessionHandler = async (request: AuthenticatedRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.sessionId) return error(400, { error: 'Session ID required' });

	await env.DB.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?')
		.bind(body.sessionId, request.userId).run();

	return json({ success: true, message: 'Session revoked' });
};

export const sendVerificationEmailHandler = async (request: AuthenticatedRequest, env: Env) => {
	const user: any = await env.DB.prepare('SELECT email, email_verified FROM users WHERE id = ?').bind(request.userId).first();

	if (user.email_verified === 1) {
		return json({ success: true, message: 'Email is already verified' });
	}

	const currentTimestamp = Math.floor(Date.now() / 1000);

	const existing: any = await env.DB.prepare('SELECT expires_at FROM email_verifications WHERE user_id = ?').bind(request.userId).first();

	if (existing) {
		const secondsSinceLastSent = (24 * 60 * 60) - (existing.expires_at - currentTimestamp);

		if (secondsSinceLastSent < 60) {
			const waitTime = Math.ceil(60 - secondsSinceLastSent);
			return error(429, { error: `Please wait ${waitTime} seconds before requesting another link.` });
		}
	}

	const rawToken = generateSessionToken();
	const hashedToken = await hashToken(rawToken);
	const expiresAt = currentTimestamp + (24 * 60 * 60);

	await env.DB.prepare('DELETE FROM email_verifications WHERE user_id = ?').bind(request.userId).run();

	await env.DB.prepare('INSERT INTO email_verifications (token, user_id, email, expires_at) VALUES (?, ?, ?, ?)')
		.bind(hashedToken, request.userId, user.email, expiresAt).run();

	const verifyLink = `https://account.xfeatures.net/verify-email?token=${rawToken}`;

	try {
		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'Xfeatures <no-reply@xfeatures.net>',
				to: user.email,
				subject: 'Verify your email address - Xfeatures',
				html: `
					<div style="background-color: #050505; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; margin: 0; -webkit-font-smoothing: antialiased;">
						<table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111111; border: 1px solid #222222; border-radius: 12px; overflow: hidden;">
							<tr>
								<td style="padding: 40px 40px 20px 40px; text-align: center;">
									<div style="font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #ffffff;">
										Xfeatures
									</div>
								</td>
							</tr>

							<tr>
								<td style="padding: 20px 40px 40px 40px;">
									<h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">Verify your email address</h1>
									<p style="margin: 0 0 32px 0; font-size: 16px; line-height: 24px; color: #a1a1aa;">
										Hello,<br><br>
										Welcome to Xfeatures. To complete your registration and fully secure your account, please verify your email address by clicking the button below.
									</p>

									<table width="100%" cellpadding="0" cellspacing="0">
										<tr>
											<td align="center">
												<a href="${verifyLink}" style="display: inline-block; background-color: #ff003c; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px 0 rgba(255, 0, 60, 0.39);">
													Verify Email
												</a>
											</td>
										</tr>
									</table>

									<div style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid #222222;">
										<p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a;">
											Or copy and paste this URL into your browser:
										</p>
										<a href="${verifyLink}" style="font-size: 13px; color: #ff003c; text-decoration: none; word-break: break-all;">
											${verifyLink}
										</a>
									</div>
								</td>
							</tr>

							<tr>
								<td style="padding: 24px 40px; background-color: #0a0a0a; border-top: 1px solid #222222; text-align: center;">
									<p style="margin: 0 0 8px 0; font-size: 12px; color: #52525b;">
										If you didn't request this email, you can safely ignore it.
									</p>
									<p style="margin: 0; font-size: 12px; color: #52525b;">
										&copy; ${new Date().getFullYear()} Xfeatures. All rights reserved.
									</p>
								</td>
							</tr>
						</table>
					</div>
				`
			})
		});
	} catch (e) {
		console.error('Email Dispatch Failed:', e);
	}

	return json({
		success: true,
		message: 'Verification email sent via Edge Network'
	});
};

export const verifyEmailHandler = async (request: IRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	const token = body?.token;

	if (!token) return error(400, { error: 'Verification token is missing' });

	const hashedToken = await hashToken(token);
	const currentTimestamp = Math.floor(Date.now() / 1000);

	const record: any = await env.DB.prepare('SELECT user_id, email FROM email_verifications WHERE token = ? AND expires_at > ?')
		.bind(hashedToken, currentTimestamp).first();

	if (!record) return error(400, { error: 'Invalid or expired verification token' });

	const user: any = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(record.user_id).first();
	if (!user || user.email !== record.email) {
		await env.DB.prepare('DELETE FROM email_verifications WHERE token = ?').bind(hashedToken).run();
		return error(400, { error: 'This verification link is for an old email address' });
	}

	await env.DB.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?')
		.bind(currentTimestamp, record.user_id).run();

	await env.DB.prepare('DELETE FROM email_verifications WHERE user_id = ?').bind(record.user_id).run();

	const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';
	await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, ?, ?, ?)')
		.bind(crypto.randomUUID(), record.user_id, 'email_verified', ipAddress, JSON.stringify({ email: record.email })).run();

	return json({ success: true, message: 'Email has been successfully verified!' });
};

export const generate2FAHandler = async (request: AuthenticatedRequest, env: Env) => {
	const secret = new OTPAuth.Secret({ size: 20 });
	const secretBase32 = secret.base32;

	const backupCodes = Array.from({ length: 8 }, () => crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase());

	const hashedBackupCodes = await Promise.all(backupCodes.map(code => hashToken(code)));

	await env.DB.prepare('UPDATE users SET pending_totp_secret = ?, backup_codes = ? WHERE id = ?')
		.bind(secretBase32, JSON.stringify(hashedBackupCodes), request.userId)
		.run();

	const user: any = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(request.userId).first();

	const totp = new OTPAuth.TOTP({
		issuer: 'Xfeatures', label: user.email, algorithm: 'SHA1', digits: 6, period: 30, secret: secretBase32
	});

	return json({ success: true, secret: secretBase32, uri: totp.toString(), backupCodes });
};

export const enable2FAHandler = async (request: AuthenticatedRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.code) return error(400, { error: 'TOTP code is required' });

	const user: any = await env.DB.prepare('SELECT pending_totp_secret FROM users WHERE id = ?').bind(request.userId).first();
	if (!user?.pending_totp_secret) return error(400, { error: 'No 2FA secret generated. Please generate a QR code first.' });

	const totp = new OTPAuth.TOTP({
		issuer: 'Xfeatures',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: user.pending_totp_secret
	});

	const delta = totp.validate({ token: body.code, window: 1 });

	if (delta === null) {
		return error(403, { error: 'Invalid authentication code. Please try again.' });
	}

	await env.DB.prepare('UPDATE users SET is_2fa_enabled = 1, totp_secret = pending_totp_secret, pending_totp_secret = NULL WHERE id = ?').bind(request.userId).run();

	return json({ success: true, message: 'Two-Factor Authentication is now enabled.' });
};

export const disable2FAHandler = async (request: AuthenticatedRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);
	if (!body || !body.password || !body.code) {
		return error(400, { error: 'Password and current 2FA code are required to disable 2FA.' });
	}

	const user: any = await env.DB.prepare('SELECT password_hash, salt, totp_secret FROM users WHERE id = ?').bind(request.userId).first();

	const isPasswordValid = await verifyPassword(body.password, user.password_hash, user.salt);
	if (!isPasswordValid) return error(403, { error: 'Invalid password.' });

	const totp = new OTPAuth.TOTP({
		issuer: 'Xfeatures',
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: user.totp_secret
	});

	const delta = totp.validate({ token: body.code, window: 1 });
	if (delta === null) return error(403, { error: 'Invalid 2FA code.' });

	await env.DB.prepare('UPDATE users SET is_2fa_enabled = 0, totp_secret = NULL WHERE id = ?').bind(request.userId).run();

	return json({ success: true, message: 'Two-Factor Authentication disabled successfully.' });
};

export const getAuditLogsHandler = async (request: AuthenticatedRequest, env: Env) => {
	const logs = await env.DB.prepare(
		'SELECT id, action, ip_address, details, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
	).bind(request.userId).all();

	return json({ success: true, logs: logs.results });
};

export const deleteAccountHandler = async (request: AuthenticatedRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);

	if (!body || !body.password) {
		return error(400, { error: 'Password is required to delete account.' });
	}

	const user: any = await env.DB.prepare(
		'SELECT password_hash, salt, totp_secret, is_2fa_enabled, avatar_url FROM users WHERE id = ?'
	).bind(request.userId).first();

	const isPasswordValid = await verifyPassword(body.password, user.password_hash, user.salt);
	if (!isPasswordValid) return error(403, { error: 'Invalid password.' });

	if (user.is_2fa_enabled) {
		if (!body.code) return error(400, { error: '2FA code is required to delete account.' });

		const totp = new OTPAuth.TOTP({
			issuer: 'Xfeatures',
			algorithm: 'SHA1',
			digits: 6,
			period: 30,
			secret: user.totp_secret
		});

		const delta = totp.validate({ token: body.code, window: 1 });
		if (delta === null) return error(403, { error: 'Invalid 2FA code.' });
	}

	if (user.avatar_url) {
		const oldFilename = user.avatar_url.split('/').pop();
		if (oldFilename) {
			await env.AVATARS_BUCKET.delete(oldFilename).catch(() => console.error('Failed to delete avatar from R2'));
		}
	}

	await env.DB.batch([
		env.DB.prepare('DELETE FROM integrations WHERE user_id = ?').bind(request.userId),
		env.DB.prepare('DELETE FROM audit_logs WHERE user_id = ?').bind(request.userId),
		env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(request.userId),
		env.DB.prepare('DELETE FROM email_verifications WHERE user_id = ?').bind(request.userId),
		env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(request.userId),
		env.DB.prepare('DELETE FROM users WHERE id = ?').bind(request.userId)
	]);

	return json({ success: true, message: 'Account and all associated data deleted successfully.' });
};
