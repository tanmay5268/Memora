import { os } from '@orpc/server'
import { createApiKeyHandler } from './handler/apiKey.js'
import { listApiKeysHandler } from './handler/apiKey.js'
import { revokeApiKeyHandler } from './handler/apiKey.js'
import { checkHealthHandler } from './handler/health.js'
import { RPCHandler } from '@orpc/server/node'

export const apiKeyRouter = {
	create: createApiKeyHandler,
	list: listApiKeysHandler,
	revoke: revokeApiKeyHandler,
}

export const healthRouter = {
	check: checkHealthHandler,
}

export const orpcRouter = os.router({
	apiKey: apiKeyRouter,
	health: healthRouter,
})

export const handler = new RPCHandler(orpcRouter)
export type Router = typeof orpcRouter