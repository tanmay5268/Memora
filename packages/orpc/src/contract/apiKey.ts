import { baseProcedure } from '../middleware/auth.js'
import * as z from 'zod'
import { ORPCError } from '@orpc/server'
export const apiKeyErrors = {
	UNAUTHORIZED: { message: 'Authentication required' },
	NOT_FOUND: { message: 'API key not found' },
	FORBIDDEN: { message: 'Not authorized to access this API key' },
} as const

export const createApiKeyInput = z.object({
	name: z.string().min(1).max(100),
})

export const createApiKeyOutput = z.object({
	apiKey: z.string(),
	id: z.string(),
	keyPrefix: z.string(),
	createdAt: z.date(),
})

export const listApiKeysOutput = z.array(
	z.object({
		id: z.string(),
		keyPrefix: z.string(),
		name: z.string(),
		createdAt: z.date(),
		lastUsedAt: z.date().nullable(),
		revoked: z.boolean(),
	})
)

export const revokeApiKeyInput = z.object({
	id: z.string(),
})

export const revokeApiKeyOutput = z.object({
	success: z.boolean(),
})

export const createApiKey = baseProcedure
	.errors(apiKeyErrors)
	.input(createApiKeyInput)
	.output(createApiKeyOutput)

export const listApiKeys = baseProcedure
	.errors({ UNAUTHORIZED: apiKeyErrors.UNAUTHORIZED })
	.output(listApiKeysOutput)

export const revokeApiKey = baseProcedure
	.errors({ ...apiKeyErrors, NOT_FOUND: apiKeyErrors.NOT_FOUND, FORBIDDEN: apiKeyErrors.FORBIDDEN })
	.input(revokeApiKeyInput)
	.output(revokeApiKeyOutput)