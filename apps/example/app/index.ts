import { Index } from "@upstash/vector"
const vectorRedis = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
})

import { MemoraSdk } from "@workspace/memorasdk"
const ai = new MemoraSdk({
  MemoraKey: process.env.MemoraKey!,
  openAIKey: process.env.Openapikey!,
  RedisInstance:vectorRedis
})
await ai.populate()