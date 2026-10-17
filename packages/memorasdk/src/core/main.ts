import { ChatRequest, MemoraSDKOptions, GeminiInteractionResponse } from "../types/coretypes.js";
import type { Index } from "@upstash/vector";
import { assertNonEmptyString, assertScoreThreshold } from "./utils.js";

const DEFAULT_TOP_K = 10;
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
/** How many times to retry when Gemini rate-limits us (HTTP 429/5xx). */
const MAX_RETRIES = 3;
/** Base delay for exponential backoff; multiplied by 2^attempt. */
const RETRY_BASE_MS = 1000;

export class MemoraSdk {
  private readonly topK: number;

  constructor(private options: MemoraSDKOptions) {
    assertNonEmptyString(options.openAIKey, "openAIKey");
    assertScoreThreshold(options.scoreThreshold, "scoreThreshold");
    if(!options.VectorInstance) {
      throw new Error("VectorInstance is required");
    }
    this.topK = options.topK ?? DEFAULT_TOP_K;
  }

  /** Vector matches on cache hit; the fresh answer text on miss. */
  async chat({ prompt, model }: ChatRequest): Promise<
    Awaited<ReturnType<Index["query"]>> | string
  > {
    const lookup = await this.options.VectorInstance.query({
      data: `${prompt}`,
      topK: this.topK,
      includeMetadata: true,
      includeData: true,
    })
    const relevant = lookup.filter(
      (result) => result.score > this.options.scoreThreshold,
    );
    if (relevant.length > 0) {
      return relevant;
    }
    const data = await this.callGemini(prompt, model);
    const answer: string = this.extractAnswer(data);
    await this.options.VectorInstance.upsert({
      id: data.id ?? crypto.randomUUID(),
      data: `${prompt}`,
      metadata: {
       response: answer,
     }
    });
    return answer;
  }

  /**
   * POST to Gemini with rate-limit awareness: 429 and 5xx responses are
   * retried with exponential backoff instead of blowing up the caller.
   */
  private async callGemini(
    prompt: string,
    model: string,
  ): Promise<GeminiInteractionResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "x-goog-api-key": `${this.options.openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `${model}`,
          input: `${prompt}`,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data) {
        return data as GeminiInteractionResponse;
      }

      const status = response.status;
      const message =
        (data as { error?: { message?: string } } | null)?.error?.message ??
        `Gemini responded with HTTP ${status}`;

      // Rate limit / transient server error -> retry with backoff.
      if (status === 429 || status >= 500) {
        lastError = new Error(
          `Gemini rate limit or transient error (HTTP ${status}), ` +
            `retrying: ${message}`,
        );
        continue;
      }

      // Permanent client error (401/403/400...) -> fail immediately.
      throw new Error(`Gemini request failed (HTTP ${status}): ${message}`);
    }

    throw new Error(
      `Gemini request failed after ${MAX_RETRIES + 1} attempts: ` +
        (lastError?.message ?? "unknown error"),
    );
  }

  /**
   * Pull the assistant text out of the interactions response without
   * assuming any particular nesting exists — the old code did
   * `data.steps[1].content[0].text` and crashed with
   * "Cannot read properties of undefined (reading '1')" whenever the
   * response shape differed (error payloads, safety blocks, etc).
   */
  private extractAnswer(data: GeminiInteractionResponse): string {
    const steps = Array.isArray(data.steps) ? data.steps : [];
    for (const step of steps) {
      const content = Array.isArray(step?.content) ? step.content : [];
      for (const block of content) {
        if (typeof block?.text === "string" && block.text.trim().length > 0) {
          return block.text;
        }
      }
    }
    throw new Error(
      `Gemini returned no answer text. Raw payload: ` +
        `${JSON.stringify(data).slice(0, 300)}`,
    );
  }
}
