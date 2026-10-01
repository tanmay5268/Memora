import { Index } from "@upstash/vector"
const vectorRedis = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
})

import { MemoraSdk } from "@workspace/memorasdk"
const ai = new MemoraSdk({
  topK: 2,
  scoreThreshold:0.7,
  openAIKey: process.env.OPEN_AI_KEY!,
  VectorInstance: vectorRedis,
})
console.log(await ai.chat({
  prompt: "what is the capital of india?",
  model: "gemini-3.5-flash",
}))