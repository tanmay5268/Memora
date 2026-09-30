import { MemoraSDKOptions } from "../types/coretypes";
import { assertNonEmptyString } from "./utils";
export class MemoraSdk {
  constructor(private options: MemoraSDKOptions) {
    assertNonEmptyString(options.MemoraKey, "MemoraKey");
    assertNonEmptyString(options.openAIKey, "openAIKey");
  }

  async chat() {
    
  }
}
