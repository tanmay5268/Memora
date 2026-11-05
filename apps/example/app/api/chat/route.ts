import { Index } from "@upstash/vector";
// Import the source entry directly: the package's `index.ts` re-exports
// `./core/main.js`, which the bundler cannot resolve to the `.ts` source.
import { MemoraSdk } from "memorasdk";

const MODEL = "gemini-3.5-flash";

/** Max prompt length to prevent abuse / excessive token spend. */
const MAX_PROMPT_LENGTH = 4000;

/** Per-IP chat rate limit: 30 requests per minute. */
const CHAT_RATE_LIMIT = { limit: 30, windowMs: 60_000 }

/**
 * Tiny fixed-window rate limiter keyed by client IP. Single-process store is
 * fine for the example app; production should back this with Redis.
 */
const chatWindows = new Map<string, { count: number; resetAt: number }>()
function chatRateLimit(key: string): { allowed: boolean } {
	const now = Date.now()
	let current = chatWindows.get(key)
	if (!current || now > current.resetAt) {
		chatWindows.set(key, { count: 1, resetAt: now + CHAT_RATE_LIMIT.windowMs })
		return { allowed: true }
	}
	if (current.count >= CHAT_RATE_LIMIT.limit) return { allowed: false }
	current.count += 1
	return { allowed: true }
}

let ai: MemoraSdk | null = null;

function getClient() {
	if (ai) return ai;

	const openAIKey = process.env.OPEN_AI_KEY;
	if (!openAIKey) {
		throw new Error("OPEN_AI_KEY is not set");
	}

	const vectorRedis = new Index({
		url: process.env.UPSTASH_VECTOR_REST_URL,
		token: process.env.UPSTASH_VECTOR_REST_TOKEN,
	});

	ai = new MemoraSdk({
		topK: 2,
		scoreThreshold: 0.7,
		openAIKey,
		VectorInstance: vectorRedis,
	});

	return ai;
}

function clientIp(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		request.headers.get("x-real-ip") ??
		"anonymous"
	)
}

/**
 * Normalise the SDK result (cached vector matches or Gemini text) into a
 * plain string the chat UI can render.
 */
function toText(answer: unknown): string {
	if (typeof answer === "string") return answer;
	if (!answer) return "";

	if (Array.isArray(answer)) {
		return answer
			.map((match) => {
				const metadata = (match as { metadata?: Record<string, unknown> })
					?.metadata;
				const cached = metadata?.reponse ?? metadata?.response;
				if (typeof cached === "string") return cached;
				const data = (match as { data?: unknown })?.data;
				if (typeof data === "string") return data;
				return JSON.stringify(match);
			})
			.join("\n\n");
	}

	return JSON.stringify(answer);
}

export async function POST(request: Request) {
	// Rate limit by IP so a single client cannot exhaust the Gemini quota.
	if (!chatRateLimit(`chat:${clientIp(request)}`).allowed) {
		return Response.json(
			{ error: "Too many requests. Please slow down and try again later." },
			{ status: 429, headers: { "Retry-After": "60" } },
		)
	}

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const prompt = (body as { prompt?: unknown })?.prompt;

	if (typeof prompt !== "string" || prompt.trim().length === 0) {
		return Response.json({ error: "prompt is required" }, { status: 400 });
	}

	if (prompt.length > MAX_PROMPT_LENGTH) {
		return Response.json(
			{ error: `prompt is too long (max ${MAX_PROMPT_LENGTH} characters)` },
			{ status: 400 },
		);
	}

	const startedAt = Date.now();

	try {
		const answer = await getClient().chat({ prompt, model: MODEL });
		const durationMs = Date.now() - startedAt;
		return Response.json({ reply: toText(answer), durationMs });
	} catch (error) {
		const durationMs = Date.now() - startedAt;
		// Log the real error server-side but never return it to the client.
		console.error("[chat] upstream failed:", error);
		const message = "The AI service is temporarily unavailable. Try again later.";
		return Response.json({ error: message, durationMs }, { status: 502 });
	}
}
