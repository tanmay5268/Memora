# memorasdk

**memorasdk** is a small ES‑module SDK that implements a "memorized decay" similarity search over a Upstash vector index, with a Gemini LLM fallback when no cache hit is found.

## Install

```bash
npm i memorasdk @upstash/vector
```

`@upstash/vector` is a peer dependency, so install it alongside the SDK.

## Quick start

```ts
import { MemoraSdk } from "memorasdk";

// 1️⃣ Create (or reuse) an Upstash Vector index instance.
//    See the @upstash/vector docs for connection details.
import { Index } from "@upstash/vector";
const vector = new Index({
  // your upstash config, e.g. url, token, etc.
});

// 2️⃣ Initialise the SDK. You must provide your Gemini API key
//    and the Vector instance.
const sdk = new MemoraSdk({
  openAIKey: process.env.OPENAI_KEY!,   // Gemini API key
  VectorInstance: vector,
  scoreThreshold: 0.7,                  // cosine‑similarity cutoff (0‑1)
  topK: 10,                             // how many nearest neighbours to consider
});

/**
 * Ask the SDK a question. It will:
 *   - Search the vector index for similar stored prompts.
 *   - If a relevant match (score > threshold) is found, return that result.
 *   - Otherwise, query Gemini, store the new answer, and return the text.
 */
async function ask(msg: string, model = "gemini-1.5-flash") {
  const answer = await sdk.chat({ prompt: msg, model });
  console.log(answer);
}

// Example usage:
ask("What's the capital of France?");
```

## Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `openAIKey` | `string` | **required** | Your Gemini (or OpenAI) API key. |
| `VectorInstance` | `Index` | **required** | An instantiated `@upstash/vector` `Index`. |
| `scoreThreshold` | `number` | `0.7` | Minimum cosine‑similarity for a cache hit (0‑1). |
| `topK` | `number` | `10` | How many nearest neighbours to fetch from the vector search. |

## License

MIT

## Repository

The source lives on GitHub: <https://github.com/tanmay5268/Memora>