import { checkHealth } from '../contract/health.js'

export const checkHealthHandler = checkHealth.handler(async () => ({
	status: 'ok' as const,
	region: process.env.VERCEL_REGION ?? 'local',
	node: process.env.VERCEL_URL ?? null,
	uptimeSeconds: Math.round(process.uptime()),
	timestamp: new Date().toISOString(),
}))
