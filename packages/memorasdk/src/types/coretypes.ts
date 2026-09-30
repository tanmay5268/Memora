import { Index } from "@upstash/vector";
export interface MemoraSDKOptions {
  MemoraKey: string;
  openAIKey: string;
  RedisInstance: Index;
}