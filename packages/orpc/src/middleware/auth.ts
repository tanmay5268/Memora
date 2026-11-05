import { os } from '@orpc/server'
import { ORPCError } from '@orpc/server'
import { auth } from '@workspace/auth/server'
import { authenticateApiKey } from '../repository/apiKey.js'

export const baseProcedure = os.$context<{ headers: Headers }>()

/**
 * Allowed origins for cross-site requests.
 *
 * In production only the public app origin is trusted. In development we also
 * allow the local dev server so the console and SDK clients keep working
 * without editing environment variables.
 */
const TRUSTED_ORIGINS = (() => {
	if (process.env.NODE_ENV === 'production') {
		return [process.env.NEXT_PUBLIC_URL].filter((v): v is string => Boolean(v))
	}
	return ['http://localhost:3000', process.env.BETTER_AUTH_URL].filter(
		(v): v is string => Boolean(v),
	)
})()

/**
 * CSRF defence for state-changing oRPC calls.
 *
 * oRPC is served over POST with `Content-Type: application/json`, which is not
 * a "simple" cross-origin request, so browsers send a `Origin` header and
 * require a CORS preflight. We answer no preflight, and here we reject any
 * request whose `Origin` is present but not one of our trusted origins.
 *
 * Requests without an `Origin` header (server-side `call()`, same-origin
 * navigations that browsers don't attach an origin to) are allowed, so this
 * does not break server-side rendering or health probes.
 */
export const csrfMiddleware = baseProcedure.middleware(async ({ context, next }) => {
	const origin = context.headers.get('origin')
	if (origin && !TRUSTED_ORIGINS.includes(origin)) {
		throw new ORPCError('FORBIDDEN', { message: 'Cross-origin requests are not allowed' })
	}
	return next()
})

function parseBearer(header: string | null): string | null {
	const match = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i) : null
	return match?.[1]?.trim() ?? null
}

/**
 * Authenticates a caller using an API key sent as `Authorization: Bearer <key>`.
 *
 * The raw key is never compared byte-for-byte in a timing-vulnerable way: we
 * look the row up by its stored prefix, then verify the HMAC-SHA256 hash with
 * `crypto.timingSafeEqual`. Revoked keys are rejected.
 */
export const apiKeyMiddleware = baseProcedure.middleware(async ({ context, next }) => {
	const key = parseBearer(context.headers.get('authorization'))
	if (!key) {
		throw new ORPCError('UNAUTHORIZED', { message: 'Missing Authorization: Bearer <api-key>' })
	}

	const principal = await authenticateApiKey(key)
	if (!principal) {
		throw new ORPCError('UNAUTHORIZED', { message: 'Invalid or revoked API key' })
	}

	return next({ context: { user: principal } })
})

export const authMiddleware = baseProcedure.middleware(async ({ context, next }) => {
	const session = await auth.api.getSession({ headers: context.headers })
	if (!session?.user) {
		throw new ORPCError('UNAUTHORIZED')
	}
	return next({ context: { user: session.user } })
})

/**
 * Procedure protected by both CSRF and session authentication. Use this for
 * state-changing operations (create, revoke, ...).
 */
export const protectedProcedure = baseProcedure.use(csrfMiddleware).use(authMiddleware)

/**
 * Procedure protected by API-key authentication (`Authorization: Bearer <key>`).
 * Use this for client/server SDK calls that authenticate with an API key
 * instead of a session cookie.
 */
export const apiKeyProcedure = baseProcedure.use(apiKeyMiddleware)

export type AuthedUser = { id: string; name?: string | null; email?: string | null }
