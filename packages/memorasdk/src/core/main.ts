import { MemoraSDKOptions } from "../types/coretypes";
import { assertNonEmptyString } from "./utils";
/** Throws if a required credential is missing or blank. */
export class MemoraSdk {
  constructor(private options: MemoraSDKOptions) {
    assertNonEmptyString(options.MemoraKey, "MemoraKey");
    assertNonEmptyString(options.openAIKey, "openAIKey");

    if (!options.RedisInstance) {
      throw new Error(`MemoraSdk: "RedisInstance" is required.`);
    }
  }

  async populate() {
    await this.options.RedisInstance.upsert({
      id: "memora",
      data: "How is the weather??",
      metadata: { type: "Weather" },
    });
  }
}
