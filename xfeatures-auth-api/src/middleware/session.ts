import { error, IRequest } from 'itty-router';
import { Env } from '..';
import { hashToken } from '../crypto';

export type AuthenticatedRequest = IRequest & Request & {
	userId: string;
};

export const requireAuth = async (request: AuthenticatedRequest, env: Env) => {
	const cookieHeader = request.headers.get('Cookie');
	const sessionIdMatch = cookieHeader?.match(/session_id=([^;]+)/);
	const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;

	if (!sessionId) return error(401, { error: 'Unauthorized: Missing session token' });

	const hashedSessionId = await hashToken(sessionId);

	const session: any = await env.DB.prepare('SELECT user_id, user_agent, expires_at FROM sessions WHERE id = ?').bind(hashedSessionId).first();
	if (!session) return error(401, { error: 'Unauthorized: Invalid session' });

	const currentTimestamp = Math.floor(Date.now() / 1000);
	if (session.expires_at < currentTimestamp) {
		await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(hashedSessionId).run();
		return error(401, { error: 'Unauthorized: Session expired' });
	}

	const currentUserAgent = request.headers.get('User-Agent') || 'unknown';
	if (session.user_agent !== currentUserAgent) {
		await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(hashedSessionId).run();
		return error(401, { error: 'Unauthorized: Session compromised. Please log in again.' });
	}

	request.userId = session.user_id;
};
