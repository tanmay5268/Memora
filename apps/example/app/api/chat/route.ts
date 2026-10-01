import { Index } from "@upstash/vector";
// Import the source entry directly: the package's `index.ts` re-exports
// `./core/main.js`, which the bundler cannot resolve to the `.ts` source.
import { MemoraSdk } from "@workspace/memorasdk/core/main";

const MODEL = "gemini-3.5-flash";

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

/**
 * The SDK returns either the model's text reply or the raw vector-store
 * matches (which carry the answer in their metadata). Normalise both into a
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

  const startedAt = Date.now();

  try {
    const answer = await getClient().chat({ prompt, model: MODEL });
    const durationMs = Date.now() - startedAt;
    return Response.json({ reply: toText(answer), durationMs });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    return Response.json({ error: message, durationMs }, { status: 502 });
  }
}
