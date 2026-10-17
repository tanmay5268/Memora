/**
 * 100-prompt benchmark plan for the Memora SDK.
 *
 * The mix is deliberately weighted to exercise every behaviour of the
 * SDK's cache:
 *
 * - `novel`     (40 prompts): never seen before. First pass always misses,
 *               which seeds the vector store for later passes.
 * - `repeat`    (30 prompts): verbatim copies of prompts that appear in the
 *               novel set (and earlier within this run). Round 2 should hit
 *               them 100% of the time — a good smoke test for the store.
 * - `paraphrase`(30 prompts): same intent, different wording. These measure
 *               how well the embedding + scoreThreshold catch semantic
 *               duplicates, not just exact strings.
 *
 * Every repeat/paraphrase references its source prompt by index so the
 * dashboard can show which seed it came from.
 */

export type PromptKind = "novel" | "repeat" | "paraphrase";

export interface TestPrompt {
  id: number;
  text: string;
  kind: PromptKind;
  /** Index into this array of the prompt this one is derived from. */
  derivedFrom?: number;
}

function novel(text: string, id: number): TestPrompt {
  return { id, text, kind: "novel" };
}

function repeat(sourceId: number, prompts: TestPrompt[]): TestPrompt {
  const source = prompts[sourceId];
  if (!source) throw new Error(`Bad repeat source: ${sourceId}`);
  return {
    id: prompts.length,
    text: source.text,
    kind: "repeat",
    derivedFrom: sourceId,
  };
}

function paraphrase(
  sourceId: number,
  text: string,
  prompts: TestPrompt[],
): TestPrompt {
  const source = prompts[sourceId];
  if (!source) throw new Error(`Bad paraphrase source: ${sourceId}`);
  return {
    id: prompts.length,
    text,
    kind: "paraphrase",
    derivedFrom: sourceId,
  };
}

function buildPlan(): TestPrompt[] {
  const prompts: TestPrompt[] = [];

  // ------------------------------------------------------------------
  // 40 novel prompts — the seeding set. On a fresh vector index every
  // one of these misses and triggers a Gemini call + upsert.
  // ------------------------------------------------------------------
  const novelTexts = [
    "What is the capital of India?",
    "Explain how photosynthesis works in one sentence.",
    "Who wrote the play Hamlet?",
    "What is the boiling point of water at sea level?",
    "Name the largest planet in our solar system.",
    "How many continents are there on Earth?",
    "What does HTTP stand for?",
    "Define machine learning in simple terms.",
    "What year did the Apollo 11 mission land on the moon?",
    "What is the currency of Japan?",
    "Explain the difference between TCP and UDP.",
    "Who painted the Mona Lisa?",
    "What is the chemical symbol for gold?",
    "How many bones are in the adult human body?",
    "What is the speed of light in a vacuum?",
    "Name the longest river in the world.",
    "What does CPU stand for in computing?",
    "Explain what an API is to a five year old.",
    "Which gas do plants primarily absorb from the atmosphere?",
    "What is the square root of 144?",
    "Who is the author of the Harry Potter series?",
    "What language is primarily spoken in Brazil?",
    "Define recursion in programming.",
    "What is the tallest mountain above sea level?",
    "How many players are on a football (soccer) team on the pitch?",
    "What is the primary function of red blood cells?",
    "Name the founder of Microsoft.",
    "What is the freezing point of water in Fahrenheit?",
    "Explain what cloud computing means.",
    "Which planet is known as the Red Planet?",
    "What is the capital of France?",
    "How many bits are in a byte?",
    "What does DNA stand for?",
    "Who developed the theory of general relativity?",
    "What is the smallest prime number?",
    "Name the ocean that lies between Africa and Australia.",
    "What does URL stand for?",
    "Define artificial intelligence.",
    "Which metal is liquid at room temperature?",
    "What is the powerhouse of the cell?",
  ];
  for (const text of novelTexts) {
    prompts.push(novel(text, prompts.length));
  }

  // ------------------------------------------------------------------
  // 30 repeats — verbatim copies of the novel prompts above. These are
  // the easiest hits possible: identical strings should embed to
  // identical vectors and score ~1.0.
  // ------------------------------------------------------------------
  const repeatSources = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];
  for (const sourceId of repeatSources) {
    prompts.push(repeat(sourceId, prompts));
  }

  // ------------------------------------------------------------------
  // 30 paraphrases — same intent, reworded. Whether these hit depends
  // on embedding quality and scoreThreshold; this is where the
  // interesting numbers come from.
  // ------------------------------------------------------------------
  prompts.push(paraphrase(0, "Which city serves as India's capital?", prompts));
  prompts.push(paraphrase(1, "Give a one sentence summary of photosynthesis.", prompts));
  prompts.push(paraphrase(2, "Who was the playwright behind Hamlet?", prompts));
  prompts.push(paraphrase(3, "At sea level, when does water boil?", prompts));
  prompts.push(paraphrase(4, "Which is the biggest planet orbiting our sun?", prompts));
  prompts.push(paraphrase(5, "Tell me the total number of continents.", prompts));
  prompts.push(paraphrase(6, "What is the full form of the acronym HTTP?", prompts));
  prompts.push(paraphrase(7, "In layman's terms, what is machine learning?", prompts));
  prompts.push(paraphrase(8, "In which year did humans first walk on the moon?", prompts));
  prompts.push(paraphrase(9, "What money do they use in Japan?", prompts));
  prompts.push(paraphrase(10, "TCP versus UDP — what sets them apart?", prompts));
  prompts.push(paraphrase(11, "Which artist created the Mona Lisa?", prompts));
  prompts.push(paraphrase(12, "What element does the symbol Au represent?", prompts));
  prompts.push(paraphrase(13, "How many bones does a grown human have?", prompts));
  prompts.push(paraphrase(14, "How fast does light travel in empty space?", prompts));
  prompts.push(paraphrase(15, "Which river holds the record for being the longest?", prompts));
  prompts.push(paraphrase(16, "What is the meaning of CPU in computers?", prompts));
  prompts.push(paraphrase(17, "How would you describe an API to a young child?", prompts));
  prompts.push(paraphrase(18, "What gas do plants take in from the air?", prompts));
  prompts.push(paraphrase(19, "What number squared gives 144?", prompts));
  prompts.push(paraphrase(20, "Who authored the Harry Potter books?", prompts));
  prompts.push(paraphrase(21, "What is the main language spoken in Brazil?", prompts));
  prompts.push(paraphrase(22, "Can you explain what recursion means in code?", prompts));
  prompts.push(paraphrase(23, "What is the highest mountain on Earth?", prompts));
  prompts.push(paraphrase(24, "How many soccer players are on the field per team?", prompts));
  prompts.push(paraphrase(25, "What role do red blood cells play in the body?", prompts));
  prompts.push(paraphrase(26, "Who started the company Microsoft?", prompts));
  prompts.push(paraphrase(27, "At what Fahrenheit temperature does water freeze?", prompts));
  prompts.push(paraphrase(28, "What is meant by the term cloud computing?", prompts));
  prompts.push(paraphrase(29, "Which planet is called the Red Planet?", prompts));

  return prompts;
}

export const TEST_PROMPTS: TestPrompt[] = buildPlan();

export const PROMPT_COUNTS: Record<PromptKind, number> = TEST_PROMPTS.reduce(
  (acc, prompt) => {
    acc[prompt.kind] += 1;
    return acc;
  },
  { novel: 0, repeat: 0, paraphrase: 0 } as Record<PromptKind, number>,
);
