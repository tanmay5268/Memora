import { ChatRequest, MemoraSDKOptions } from "../types/coretypes";
import { assertNonEmptyString, assertScoreThreshold } from "./utils";

const DEFAULT_TOP_K = 10;

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

  async chat({ prompt, model }: ChatRequest) {
    console.time("Chat")
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
       console.timeEnd("Chat")
      return relevant;
    }
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": `${this.options.openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `${model}`,
          input: `${prompt}`,
        }),
      }
    );
    console.timeEnd("Chat")
    const data = await response.json();
    await this.options.VectorInstance.upsert({
      id: data.id,
      data: `${prompt}`,
      metadata: {
       reponse: data.steps[1].content[0].text,
     }
    });
    return data.steps[1].content[0].text;
  }
}
