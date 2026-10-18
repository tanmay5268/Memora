import { baseProcedure } from '../middleware/auth.js'
import * as z from 'zod'

/**
 * The probe is public — an uptime monitor has no session — so it skips
 * `authMiddleware` and is built straight off `baseProcedure`.
 */
export const healthErrors = {
	UNAVAILABLE: { message: 'Server not responding' },
} as const

export const healthCheckOutput = z.object({
	status: z.literal('ok'),
	region: z.string(),
	node: z.string().nullable(),
	uptimeSeconds: z.number(),
	/** ISO string so the browser never revives a Date off the wire. */
	timestamp: z.string(),
})

export const checkHealth = baseProcedure
	.errors(healthErrors)
	.output(healthCheckOutput)
