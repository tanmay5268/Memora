import { Index } from "@upstash/vector";
export interface MemoraSDKOptions {
  openAIKey: string;
  VectorInstance: Index;
  scoreThreshold: number;
  topK?: number;
}
export type ChatRequest = {
  prompt: string;
  model: string;
};

/** Minimal shape of the Gemini `interactions` response we depend on. */
export interface GeminiInteractionResponse {
  id?: string;
  steps?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}