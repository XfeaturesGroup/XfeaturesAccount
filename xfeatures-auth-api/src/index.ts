import { AutoRouter, cors, error, json } from 'itty-router';
import { registerHandler, loginHandler, logoutHandler, checkUsernameHandler } from './routes/auth';
import { requireAuth } from './middleware/session';
import { getMeHandler, updateProfileHandler, uploadAvatarHandler } from './routes/user';
import { globalSecurityMiddleware, addSecurityHeaders } from './middleware/security';
import { getAvatarHandler } from './routes/media';
import {
	changePasswordHandler,
	forgotPasswordHandler,
	resetPasswordHandler,
	getSessionsHandler,
	revokeSessionHandler,
	sendVerificationEmailHandler,
	verifyEmailHandler,
	generate2FAHandler,
	enable2FAHandler,
	disable2FAHandler,
	getAuditLogsHandler,
	deleteAccountHandler
} from './routes/security';
import {
	getIntegrationsHandler,
	toggleIntegrationHandler,
	toggleAllIntegrationsHandler,
	deleteIntegrationHandler
} from './routes/integrations';
import {
	githubInitHandler,
	githubCallbackHandler,
	discordInitHandler,
	discordCallbackHandler
} from './routes/oauth';

export interface Env {
	DB: D1Database;
	AVATARS_BUCKET: R2Bucket;
	ENVIRONMENT: string;
	FRONTEND_URL: string;
	RESEND_API_KEY: string;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
}

const { preflight, corsify } = cors({
	origin: [
		'http://localhost:5173',
		'http://127.0.0.1:5173',
		'https://account.xfeatures.net'
	],
	allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Request-Start'],
	credentials: true,
});

const router = AutoRouter({
	before: [preflight, globalSecurityMiddleware],
	catch: error,
});

router.get('/', () => {
	return json({ status: 'ok', service: 'XfeaturesGroup Auth API', version: '1.0.0' });
});

router.get('/api/auth/check-username', checkUsernameHandler);
router.post('/api/auth/register', registerHandler);
router.post('/api/auth/login', loginHandler);
router.post('/api/auth/logout', logoutHandler);
router.post('/api/auth/forgot-password', forgotPasswordHandler);
router.post('/api/auth/reset-password', resetPasswordHandler);
router.post('/api/auth/verify-email', verifyEmailHandler);

router.get('/api/oauth/github', githubInitHandler);
router.get('/api/oauth/github/callback', githubCallbackHandler);
router.get('/api/oauth/discord', discordInitHandler);
router.get('/api/oauth/discord/callback', discordCallbackHandler);

router.all('/api/user/*', requireAuth);

router.get('/api/user/me', getMeHandler);
router.put('/api/user/profile', updateProfileHandler);
router.post('/api/user/change-password', changePasswordHandler);
router.get('/api/user/sessions', getSessionsHandler);
router.post('/api/user/sessions/revoke', revokeSessionHandler);
router.get('/api/user/audit-logs', getAuditLogsHandler);
router.delete('/api/user/account', deleteAccountHandler);
router.post('/api/user/2fa/generate', generate2FAHandler);
router.post('/api/user/2fa/enable', enable2FAHandler);
router.post('/api/user/2fa/disable', disable2FAHandler);
router.post('/api/user/send-verification', sendVerificationEmailHandler);

router.get('/api/user/integrations', getIntegrationsHandler);
router.post('/api/user/integrations/toggle-all', toggleAllIntegrationsHandler);
router.patch('/api/user/integrations/:id/toggle', toggleIntegrationHandler);
router.delete('/api/user/integrations/:id', deleteIntegrationHandler);

router.post('/api/media/avatar', requireAuth, uploadAvatarHandler);
router.get('/api/media/avatar/:filename', getAvatarHandler);

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.fetch(request, env, ctx)
			.then((res: Response) => corsify(res, request))
			.then(addSecurityHeaders)
			.catch((err: any) => {
				console.error('Global Crash:', err);
				const crashResponse = error(500, { error: 'Internal Core Server Error' });
				return corsify(crashResponse, request);
			});
	},
};
