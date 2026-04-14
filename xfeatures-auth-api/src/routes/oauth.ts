import { IRequest } from 'itty-router';
import { Env } from '..';
import { hashToken } from '../crypto';

const getUserIdFromCookie = async (request: Request, env: Env) => {
	const cookieHeader = request.headers.get('Cookie');
	const sessionIdMatch = cookieHeader?.match(/session_id=([^;]+)/);
	const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

	if (!sessionId) return null;

	const hashedSessionId = await hashToken(sessionId);
	const session: any = await env.DB.prepare('SELECT user_id FROM sessions WHERE id = ? AND expires_at > ?')
		.bind(hashedSessionId, Math.floor(Date.now() / 1000)).first();

	return session ? session.user_id : null;
};

export const githubInitHandler = async (request: IRequest, env: Env) => {
	const redirectUri = `${new URL(request.url).origin}/api/oauth/github/callback`;
	const state = crypto.randomUUID();

	const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=read:user&state=${state}`;

	const stateCookie = `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;

	return new Response(null, {
		status: 302,
		headers: {
			'Location': url,
			'Set-Cookie': stateCookie
		}
	});
};

export const githubCallbackHandler = async (request: IRequest, env: Env) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const frontendUrl = env.FRONTEND_URL || 'https://account.xfeatures.net';

	const cookieHeader = request.headers.get('Cookie');
	const stateMatch = cookieHeader?.match(/oauth_state=([^;]+)/);
	const cookieState = stateMatch ? stateMatch[1] : null;

	const clearStateCookie = `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

	if (!state || !cookieState || state !== cookieState) {
		return new Response(null, {
			status: 302,
			headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_csrf_failed`, 'Set-Cookie': clearStateCookie }
		});
	}

	const userId = await getUserIdFromCookie(request as any, env);
	if (!userId) {
		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/login`, 'Set-Cookie': clearStateCookie } });
	}
	if (!code) {
		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_rejected`, 'Set-Cookie': clearStateCookie } });
	}

	try {
		const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
			body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
		});
		const tokenData: any = await tokenRes.json();

		if (!tokenData.access_token) {
			return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_failed`, 'Set-Cookie': clearStateCookie } });
		}

		const userRes = await fetch('https://api.github.com/user', {
			headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'Xfeatures-SSO' }
		});
		const githubUser: any = await userRes.json();

		const providerId = githubUser.id.toString();
		const existing: any = await env.DB.prepare('SELECT user_id FROM integrations WHERE provider = ? AND provider_id = ?').bind('github', providerId).first();
		if (existing && existing.user_id !== userId) {
			return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=account_already_linked`, 'Set-Cookie': clearStateCookie } });
		}

		const id = crypto.randomUUID();
		const providerUsername = githubUser.login;
		const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';

		await env.DB.prepare('DELETE FROM integrations WHERE user_id = ? AND provider = ?').bind(userId, 'github').run();
		await env.DB.prepare(
			'INSERT INTO integrations (id, user_id, provider, provider_id, provider_username, created_at) VALUES (?, ?, ?, ?, ?, ?)'
		).bind(id, userId, 'github', providerId, providerUsername, Math.floor(Date.now() / 1000)).run();

		await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'integration_linked', ?, ?)")
			.bind(crypto.randomUUID(), userId, ipAddress, JSON.stringify({ provider: 'github', username: providerUsername })).run();

		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?oauth=success`, 'Set-Cookie': clearStateCookie } });
	} catch {
		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_failed`, 'Set-Cookie': clearStateCookie } });
	}
};

export const discordInitHandler = async (request: IRequest, env: Env) => {
	const redirectUri = encodeURIComponent(`${new URL(request.url).origin}/api/oauth/discord/callback`);
	const state = crypto.randomUUID();

	const url = `https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`;

	const stateCookie = `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;

	return new Response(null, {
		status: 302,
		headers: {
			'Location': url,
			'Set-Cookie': stateCookie
		}
	});
};

export const discordCallbackHandler = async (request: IRequest, env: Env) => {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const frontendUrl = env.FRONTEND_URL || 'https://account.xfeatures.net';
	const redirectUri = `${url.origin}/api/oauth/discord/callback`;

	const cookieHeader = request.headers.get('Cookie');
	const stateMatch = cookieHeader?.match(/oauth_state=([^;]+)/);
	const cookieState = stateMatch ? stateMatch[1] : null;

	const clearStateCookie = `oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;

	if (!state || !cookieState || state !== cookieState) {
		return new Response(null, {
			status: 302,
			headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_csrf_failed`, 'Set-Cookie': clearStateCookie }
		});
	}

	const userId = await getUserIdFromCookie(request as any, env);
	if (!userId) {
		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/login`, 'Set-Cookie': clearStateCookie } });
	}
	if (!code) {
		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_rejected`, 'Set-Cookie': clearStateCookie } });
	}

	try {
		const params = new URLSearchParams();
		params.append('client_id', env.DISCORD_CLIENT_ID);
		params.append('client_secret', env.DISCORD_CLIENT_SECRET);
		params.append('grant_type', 'authorization_code');
		params.append('code', code);
		params.append('redirect_uri', redirectUri);

		const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: params.toString()
		});
		const tokenData: any = await tokenRes.json();

		if (!tokenData.access_token) {
			return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_failed`, 'Set-Cookie': clearStateCookie } });
		}

		const userRes = await fetch('https://discord.com/api/users/@me', {
			headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
		});
		const discordUser: any = await userRes.json();

		const providerId = discordUser.id;
		const existing: any = await env.DB.prepare('SELECT user_id FROM integrations WHERE provider = ? AND provider_id = ?').bind('discord', providerId).first();
		if (existing && existing.user_id !== userId) {
			return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=account_already_linked`, 'Set-Cookie': clearStateCookie } });
		}

		const id = crypto.randomUUID();
		const providerUsername = discordUser.username;
		const ipAddress = request.headers.get('CF-Connecting-IP') || 'unknown';

		await env.DB.prepare('DELETE FROM integrations WHERE user_id = ? AND provider = ?').bind(userId, 'discord').run();
		await env.DB.prepare(
			'INSERT INTO integrations (id, user_id, provider, provider_id, provider_username, created_at) VALUES (?, ?, ?, ?, ?, ?)'
		).bind(id, userId, 'discord', providerId, providerUsername, Math.floor(Date.now() / 1000)).run();

		await env.DB.prepare("INSERT INTO audit_logs (id, user_id, action, ip_address, details) VALUES (?, ?, 'integration_linked', ?, ?)")
			.bind(crypto.randomUUID(), userId, ipAddress, JSON.stringify({ provider: 'discord', username: providerUsername })).run();

		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?oauth=success`, 'Set-Cookie': clearStateCookie } });
	} catch {
		return new Response(null, { status: 302, headers: { 'Location': `${frontendUrl}/dashboard?error=oauth_failed`, 'Set-Cookie': clearStateCookie } });
	}
};
