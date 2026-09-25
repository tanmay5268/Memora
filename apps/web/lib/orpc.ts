import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import type { Router } from '@workspace/orpc'

const link = new RPCLink({
  origin: typeof window === 'undefined' ? 'http://localhost:3000' : '',
  url: '/api/rpc',
})

export const orpc: RouterClient<Router> = createORPCClient(link)

export { createSafeClient, safe, isDefinedError } from '@orpc/client'