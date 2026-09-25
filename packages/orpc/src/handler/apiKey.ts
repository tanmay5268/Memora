import { createApiKey, listApiKeys, revokeApiKey } from '../contract/apiKey.js'
import { authMiddleware } from '../middleware/auth.js'
import { createApiKeyRepo, listApiKeysRepo, revokeApiKeyRepo } from '../repository/apiKey.js'
import { ORPCError } from '@orpc/server'

export const createApiKeyHandler = createApiKey
	.use(authMiddleware)
	.handler(async ({ input, context }) => {
		const result = await createApiKeyRepo(context.user.id, input.name)
		return {
			apiKey: result.rawKey,
			id: result.id,
			keyPrefix: result.keyPrefix,
			createdAt: result.createdAt,
		}
	})

export const listApiKeysHandler = listApiKeys
	.use(authMiddleware)
	.handler(async ({ context }) => {
		return listApiKeysRepo(context.user.id)
	})

export const revokeApiKeyHandler = revokeApiKey
	.use(authMiddleware)
	.handler(async ({ input, context }) => {
		const result = await revokeApiKeyRepo(context.user.id, input.id)
		if (!result) {
			throw new ORPCError('NOT_FOUND')
		}
		return { success: true }
	})