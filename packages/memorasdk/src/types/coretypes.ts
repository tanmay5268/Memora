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