import { createApiKey, listApiKeys, revokeApiKey, verifyApiKey } from '../contract/apiKey.js'
import { authMiddleware, csrfMiddleware } from '../middleware/auth.js'
import { createApiKeyRepo, listApiKeysRepo, revokeApiKeyRepo } from '../repository/apiKey.js'
import { rateLimit } from '../security/rate-limit.js'
import { ORPCError } from '@orpc/server'

function enforceRateLimit(context: { user: { id: string } }, action: string): void {
	const { allowed } = rateLimit(`apikey:${action}:${context.user.id}`, {
		limit: 30,
		windowMs: 60_000,
	})
	if (!allowed) {
		throw new ORPCError('TOO_MANY_REQUESTS', {
			message: 'Rate limit exceeded. Try again later.',
		})
	}
}

export const createApiKeyHandler = createApiKey
	.use(csrfMiddleware)
	.use(authMiddleware)
	.handler(async ({ input, context }) => {
		enforceRateLimit(context, 'create')
		const result = await createApiKeyRepo(context.user.id, input.name)
		return {
			apiKey: result.rawKey,
			id: result.id,
			keyPrefix: result.keyPrefix,
			createdAt: result.createdAt,
		}
	})

export const listApiKeysHandler = listApiKeys
	.use(csrfMiddleware)
	.use(authMiddleware)
	.handler(async ({ context }) => {
		enforceRateLimit(context, 'list')
		return listApiKeysRepo(context.user.id)
	})

export const revokeApiKeyHandler = revokeApiKey
	.use(csrfMiddleware)
	.use(authMiddleware)
	.handler(async ({ input, context }) => {
		enforceRateLimit(context, 'revoke')
		const result = await revokeApiKeyRepo(context.user.id, input.id)
		if (!result) {
			throw new ORPCError('NOT_FOUND')
		}
		return { success: true }
	})

export const verifyApiKeyHandler = verifyApiKey.handler(async ({ context }) => {
	return {
		valid: true,
		userId: context.user.id,
		keyPrefix: context.user.keyPrefix,
		name: context.user.name,
	}
})
