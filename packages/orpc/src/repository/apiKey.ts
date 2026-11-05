import { authDb, apiKey } from '@workspace/db/auth-db'
import { eq, and, desc } from 'drizzle-orm'
import { redis } from '@workspace/cache/index'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Server-side secret used to salt API key hashes.
 *
 * `API_KEY_PEPPER` takes precedence. Falls back to `BETTER_AUTH_SECRET` so
 * local development works without a new variable. In production you must set
 * `API_KEY_PEPPER` to a high-entropy value; without it the module throws at
 * import time so we never ship keys hashed with an empty pepper.
 */
const PEPPER =
	process.env.API_KEY_PEPPER ?? process.env.BETTER_AUTH_SECRET ?? ''
if (!PEPPER) {
	throw new Error(
		'[apiKey] API_KEY_PEPPER (or BETTER_AUTH_SECRET) is required to hash API keys',
	)
}

function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
	const randomPart = randomBytes(14).toString('base64url')
	const rawKey = `memora_${randomPart}`
	const keyHash = hashApiKey(rawKey)
	const keyPrefix = rawKey.slice(0, 20)
	return { rawKey, keyHash, keyPrefix }
}

/** HMAC-SHA256 of the raw key using the server pepper. Never store the raw key. */
export function hashApiKey(rawKey: string): string {
	return createHmac('sha256', PEPPER).update(rawKey).digest('hex')
}

/** Constant-time comparison so key verification does not leak timing info. */
export function verifyApiKey(rawKey: string, keyHash: string): boolean {
	const expected = hashApiKey(rawKey)
	if (expected.length !== keyHash.length) return false
	return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(keyHash, 'utf8'))
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
	} else {
		console.log("Redis not available")
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

	const keyHash = result[0]!.keyHash

	if (redis) {
		try {
			await redis.del(`apikey:${keyHash}`)
		} catch (e) {
			console.error('[apiKey] Redis del failed:', e)
		}
	}

	return { keyHash }
}

/**
 * Authenticate a raw API key presented in an `Authorization: Bearer <key>`
 * header. Returns the owning user + key metadata on success, `null` otherwise.
 *
 * Lookup is by `keyPrefix` (first 20 chars of the raw key) to narrow candidates,
 * then the HMAC hash is compared in constant time. On success `lastUsedAt` is
 * refreshed so the dashboard can show real usage.
 */
export async function authenticateApiKey(rawKey: string) {
	const prefix = rawKey.slice(0, 20)
	const [row] = await authDb
		.select({
			id: apiKey.id,
			userId: apiKey.userId,
			name: apiKey.name,
			keyPrefix: apiKey.keyPrefix,
			keyHash: apiKey.keyHash,
			revoked: apiKey.revoked,
		})
		.from(apiKey)
		.where(eq(apiKey.keyPrefix, prefix))
		.limit(1)

	if (!row || row.revoked) return null
	if (!verifyApiKey(rawKey, row.keyHash)) return null

	await authDb
		.update(apiKey)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKey.id, row.id))

	return {
		id: row.userId,
		userId: row.userId,
		name: row.name,
		keyPrefix: row.keyPrefix,
	}
}
