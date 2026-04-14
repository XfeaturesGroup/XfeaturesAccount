import { json } from 'itty-router';
import { Env } from '..';
import { AuthenticatedRequest } from '../middleware/session';

export const getIntegrationsHandler = async (request: AuthenticatedRequest, env: Env) => {
	const integrations = await env.DB.prepare(
		'SELECT id, provider, provider_id, provider_username, is_active, created_at FROM integrations WHERE user_id = ? ORDER BY created_at DESC'
	).bind(request.userId).all();

	return json({ success: true, integrations: integrations.results });
};

export const toggleIntegrationHandler = async (request: AuthenticatedRequest, env: Env) => {
	const { id } = request.params;
	const body: any = await request.json().catch(() => null);

	await env.DB.prepare('UPDATE integrations SET is_active = ? WHERE id = ? AND user_id = ?')
		.bind(body.is_active ? 1 : 0, id, request.userId).run();

	return json({ success: true });
};

export const toggleAllIntegrationsHandler = async (request: AuthenticatedRequest, env: Env) => {
	const body: any = await request.json().catch(() => null);

	await env.DB.prepare('UPDATE integrations SET is_active = ? WHERE user_id = ?')
		.bind(body.is_active ? 1 : 0, request.userId).run();

	return json({ success: true });
};

export const deleteIntegrationHandler = async (request: AuthenticatedRequest, env: Env) => {
	const { id } = request.params;
	await env.DB.prepare('DELETE FROM integrations WHERE id = ? AND user_id = ?').bind(id, request.userId).run();
	return json({ success: true });
};
