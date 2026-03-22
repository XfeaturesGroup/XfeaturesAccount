// tests/vitest-env.d.ts
/// <reference types="@cloudflare/workers-types" />

declare module 'cloudflare:test' {
	import type { ExecutionContext } from '@cloudflare/workers-types';
	import type { Env } from '../src/index';

	export const env: Env;
	export function createExecutionContext(): ExecutionContext;
	export function waitOnExecutionContext(ctx: ExecutionContext): Promise<void>;
}
