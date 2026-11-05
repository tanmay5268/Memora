/**
 * In-memory fixed-window rate limiter.
 *
 * Single-process store: each server instance tracks its own counters. This is
 * sufficient for a single deployed instance and for development. For a
 * multi-region/multi-instance production deployment, back this with Redis
 * (the `@workspace/cache` redis client is already available) so counters are
 * shared across instances.
 */
interface Window {
	count: number
	resetAt: number
}

const stores = new Map<string, Window>()

export interface RateLimitResult {
	allowed: boolean
	remaining: number
	resetAt: number
}

/**
 * Returns `{ allowed, remaining, resetAt }` for `key`.
 *
 * `limit` = max requests per `windowMs`. When the window resets the counter
 * starts over. Exhausted windows return `allowed: false` until `resetAt`.
 */
export function rateLimit(
	key: string,
	{ limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
	const now = Date.now()
	let current = stores.get(key)

	if (!current || now > current.resetAt) {
		current = { count: 1, resetAt: now + windowMs }
		stores.set(key, current)
		return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: current.resetAt }
	}

	if (current.count >= limit) {
		return { allowed: false, remaining: 0, resetAt: current.resetAt }
	}

	current.count += 1
	return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}

/** Remove a key's counter (used by tests / reset). */
export function clearRateLimit(key: string): void {
	stores.delete(key)
}
