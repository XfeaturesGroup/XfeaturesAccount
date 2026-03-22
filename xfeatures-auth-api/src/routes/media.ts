import { IRequest } from 'itty-router';
import { Env } from '../index';

export const getAvatarHandler = async (request: IRequest, env: Env) => {
    const filename = request.params.filename;

	const object = await env.AVATARS_BUCKET.get(filename);

    if (object === null) {
        return new Response('Avatar not found', { status: 404 });
    }

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	headers.set('Cache-Control', 'public, max-age=2592000');

	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Content-Security-Policy', "default-src 'none'; sandbox");

	return new Response(object.body, { headers });
};
