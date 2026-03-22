import { error, IRequest } from 'itty-router';

const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;

export const globalSecurityMiddleware = async (request: IRequest) => {
	if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
		let origin = request.headers.get('Origin');

		if (!origin) {
			const referer = request.headers.get('Referer');
			if (referer) {
				try { origin = new URL(referer).origin; } catch (e) {}
			}
		}

		if (!origin) {
			return error(403, { error: 'Forbidden: Missing Origin or Referer header' });
		}

		const allowedOrigins = [
			'https://account.xfeatures.net',
			'http://localhost:5173',
			'http://127.0.0.1:5173'
		];

		if (!allowedOrigins.includes(origin)) {
			return error(403, { error: 'Forbidden: CSRF protection triggered (Invalid Origin)' });
		}
	}

	const contentLength = request.headers.get('content-length');
	if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
		return error(413, { error: 'Payload Too Large' });
	}
};

export const addSecurityHeaders = (response: Response) => {
	const headers = new Headers(response.headers);

	headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
	headers.set('X-Frame-Options', 'DENY');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: headers
	});
};
