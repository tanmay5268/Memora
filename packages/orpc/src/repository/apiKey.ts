import { authDb, apiKey } from '@workspace/db/auth-db'
import { eq, and, desc } from 'drizzle-orm'
import { redis } from '@workspace/cache/index'
import { randomBytes, createHash } from 'crypto'

function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
	const randomPart = randomBytes(14).toString('base64url')
	const rawKey = `memora_${randomPart}`
	const keyHash = createHash('sha256').update(rawKey).digest('hex')
	const keyPrefix = rawKey.slice(0, 20)
	return { rawKey, keyHash, keyPrefix }
}

export async function createApiKeyRepo(userId: string, name: string) {
	const { rawKey, keyHash, keyPrefix } = generateApiKey()
	const id = crypto.randomUUID()
	const now = new Date()

	await authDb.insert(apiKey).values({
		id,
		userId,
		name,
		keyHash,
		keyPrefix,
		revoked: false,
		createdAt: now,
		updatedAt: now,
	})

	if (redis) {
		try {
			await redis.set(`apikey:${keyHash}`, JSON.stringify({ userId }), { ex: 300 })
		} catch (e) {
			console.error('[apiKey] Redis set failed:', e)
		}
	}

	return { rawKey, id, keyPrefix, createdAt: now }
}

export async function listApiKeysRepo(userId: string) {
	return authDb
		.select({
			id: apiKey.id,
			keyPrefix: apiKey.keyPrefix,
			name: apiKey.name,
			createdAt: apiKey.createdAt,
			lastUsedAt: apiKey.lastUsedAt,
			revoked: apiKey.revoked,
		})
		.from(apiKey)
		.where(eq(apiKey.userId, userId))
		.orderBy(desc(apiKey.createdAt))
}

export async function revokeApiKeyRepo(userId: string, id: string): Promise<{ keyHash: string } | null> {
	const result = await authDb
		.update(apiKey)
		.set({ revoked: true, updatedAt: new Date() })
		.where(and(eq(apiKey.id, id), eq(apiKey.userId, userId)))
		.returning({ keyHash: apiKey.keyHash })

	if (result.length === 0) return null

	const keyHash = result[0]?.keyHash

	if (redis) {
		try {
			await redis.del(`apikey:${keyHash}`)
		} catch (e) {
			console.error('[apiKey] Redis del failed:', e)
		}
	}

	return { keyHash }
}