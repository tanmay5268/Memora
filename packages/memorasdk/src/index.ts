import { Redis } from "@upstash/redis";
export interface MemoraSDKOptions {
  MemoraKey: string;
  openAIKey: string;
  RedisInstance: Redis; 
}
export class MemoraSDK {
  constructor(private options: MemoraSDKOptions) { }
  async clearCache() {
    await this.options.RedisInstance.flushall();
  }
}
