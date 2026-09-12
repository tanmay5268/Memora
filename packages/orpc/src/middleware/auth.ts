import { os } from '@orpc/server'
import { ORPCError } from '@orpc/server'
import { auth } from '@workspace/auth/server'

export const baseProcedure = os.$context<{ headers: Headers }>()

export const authMiddleware = baseProcedure.middleware(async ({ context, next }) => {
	const session = await auth.api.getSession({ headers: context.headers })
	if (!session?.user) {
		throw new ORPCError('UNAUTHORIZED')
	}
	return next({ context: { user: session.user } })
})