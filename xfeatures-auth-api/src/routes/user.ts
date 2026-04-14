import { error, json } from 'itty-router';
import { Env } from '..';
import { verifyPassword } from '@/crypto';
import * as OTPAuth from 'otpauth';
import { AuthenticatedRequest } from '@/middleware/session';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export const getMeHandler = async (request: AuthenticatedRequest, env: Env) => {
	const user: any = await env.DB.prepare(
		'SELECT id, username, email, first_name, last_name, email_verified, avatar_url, role, created_at, anti_phishing_code, is_2fa_enabled, language FROM users WHERE id = ?'
	).bind(request.userId).first();

	if (!user) return error(404, { error: 'User not found' });

	user.is_2fa_enabled = !!user.is_2fa_enabled;

	return json({ success: true, user });
};

export const updateProfileHandler = async (request: AuthenticatedRequest, env: Env) => {
	try {
		const userId = request.userId;

		const body: any = await request.json().catch(() => null);
		if (!body) return error(400, { error: 'Invalid JSON payload' });

		let { newEmail, newUsername, firstName, lastName, currentPassword, antiPhishingCode, language } = body;

		if (!currentPassword) return error(403, { error: 'Current password is required to change profile settings' });

		const currentUser: any = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
		if (!currentUser) return error(404, { error: 'User not found' });

		const isPasswordValid = await verifyPassword(currentPassword, currentUser.password_hash, currentUser.salt);
		if (!isPasswordValid) return error(403, { error: 'Invalid current password' });

		newEmail = newEmail ? newEmail.trim().toLowerCase() : currentUser.email;
		newUsername = newUsername ? newUsername.trim() : currentUser.username;

		const finalFirstName = firstName !== undefined ? firstName.trim() : currentUser.first_name;
		const finalLastName = lastName !== undefined ? lastName.trim() : currentUser.last_name;
		const finalPhishCode = antiPhishingCode !== undefined ? antiPhishingCode.trim() : currentUser.anti_phishing_code;
		const finalLanguage = language !== undefined ? language.trim().toLowerCase().slice(0, 10) : (currentUser.language || 'en');

		if (finalFirstName && finalFirstName.length > 50) return error(400, { error: 'First name is too long (max 50 chars)' });
		if (finalLastName && finalLastName.length > 50) return error(400, { error: 'Last name is too long (max 50 chars)' });

		if (newEmail !== currentUser.email && !EMAIL_REGEX.test(newEmail)) return error(400, { error: 'Invalid new email format' });
		if (newUsername !== currentUser.username && !USERNAME_REGEX.test(newUsername)) return error(400, { error: 'Invalid new username format' });

		const duplicateCheck: any = await env.DB.prepare(
			'SELECT email, username FROM users WHERE (email = ? OR username = ?) AND id != ?'
		).bind(newEmail, newUsername, userId).first();

		if (duplicateCheck) {
			if (duplicateCheck.email === newEmail) return error(409, { error: 'This email is already registered to another account' });
			if (duplicateCheck.username === newUsername) return error(409, { error: 'This username is already taken by someone else' });
		}

		const isEmailChanged = newEmail !== currentUser.email;

		if (isEmailChanged && currentUser.is_2fa_enabled) {
			if (!body.totpCode || typeof body.totpCode !== 'string') {
				return error(403, { error: '2FA code is required to change email address' });
			}
			const totp = new OTPAuth.TOTP({
				issuer: 'Xfeatures',
				algorithm: 'SHA1',
				digits: 6,
				period: 30,
				secret: currentUser.totp_secret
			});
			if (totp.validate({ token: body.totpCode, window: 1 }) === null) {
				return error(403, { error: 'Invalid 2FA code' });
			}
		}

		const newEmailVerified = isEmailChanged ? 0 : currentUser.email_verified;
		const currentTimestamp = Math.floor(Date.now() / 1000);

		if (finalPhishCode && finalPhishCode.length > 20) return error(400, { error: 'Anti-phishing code too long' });

		const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';

		if (isEmailChanged) {
			const cookieHeader = request.headers.get('Cookie') || '';
			const currentSessionId = cookieHeader.match(/session_id=([^;]+)/)?.[1];
			if (currentSessionId) {
				await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(userId, currentSessionId).run();
			}
		}

		const auditDetails = JSON.stringify({
			email_changed: isEmailChanged, username_changed: newUsername !== currentUser.username
		});

		await env.DB.prepare(
			`UPDATE users SET email = ?, username = ?, first_name = ?, last_name = ?, anti_phishing_code = ?, email_verified = ?, language = ?, updated_at = ? WHERE id = ?`
		).bind(newEmail, newUsername, finalFirstName, finalLastName, finalPhishCode, newEmailVerified, finalLanguage, currentTimestamp, userId).run();

		await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'profile_updated', ?, ?)")
			.bind(crypto.randomUUID(), userId, ipAddress, auditDetails).run();

		return json({
			success: true,
			message: 'Profile updated successfully',
			requireEmailVerification: isEmailChanged,
			user: {
				id: userId,
				username: newUsername,
				email: newEmail,
				first_name: finalFirstName,
				last_name: finalLastName,
				email_verified: newEmailVerified
			}
		});

	} catch (err: any) {
		console.error('Profile Update Error:', err.message);
		return error(500, { error: 'Internal server error while updating profile' });
	}
};

export const uploadAvatarHandler = async (request: AuthenticatedRequest, env: Env) => {
	try {
		const formData = await request.formData().catch(() => null);
		if (!formData) return error(400, { error: 'Invalid form data' });

		const entry = formData.get('avatar');
		const isFileLike = (v: any): v is File => (
			v !== null && typeof (v as any).arrayBuffer === 'function'
		);

		if (!isFileLike(entry)) {
			return error(400, { error: 'Invalid file or file exceeds 5MB limit' });
		}

		const file = entry;
		if (file.size > 5 * 1024 * 1024) {
			return error(400, { error: 'Invalid file or file exceeds 5MB limit' });
		}

		const arrayBuffer = await file.arrayBuffer();
		const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
		let extension = '';

		if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) { extension = 'jpg'; }
		else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) { extension = 'png'; }
		else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) { extension = 'webp'; }
		else {
			return error(400, { error: 'Invalid file signature. Only real JPG, PNG, WEBP are allowed.' });
		}

		const currentUser: any = await env.DB.prepare('SELECT avatar_url FROM users WHERE id = ?').bind(request.userId).first();
		if (currentUser?.avatar_url) {
			const oldFilename = currentUser.avatar_url.split('/').pop();
			if (oldFilename) await env.AVATARS_BUCKET.delete(oldFilename).catch(() => {});
		}

		const filename = `${request.userId}-${Date.now()}.${extension}`;

		await env.AVATARS_BUCKET.put(filename, arrayBuffer, {
			httpMetadata: { contentType: `image/${extension}` }
		});

		const avatarUrl = `/api/media/avatar/${filename}`;

		await env.DB.prepare(
			'UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?'
		).bind(avatarUrl, Math.floor(Date.now() / 1000), request.userId).run();

		return json({
			success: true,
			message: 'Avatar uploaded successfully',
			avatar_url: avatarUrl
		});

	} catch (err: any) {
		console.error('Avatar Upload Error:', err.message);
		return error(500, { error: 'Internal server error while uploading avatar' });
	}
};
