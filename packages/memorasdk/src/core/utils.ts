import { MemoraSDKOptions } from "../types/coretypes";
export function assertNonEmptyString(
  value: unknown,
  name: keyof MemoraSDKOptions,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `MemoraSdk: "${name}" is required and must be a non-empty string. ` +
        `Pass a real value (e.g. from an environment variable) instead of "".`,
    );
  }
}

export function assertScoreThreshold(
  value: unknown,
  name: keyof MemoraSDKOptions,
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `MemoraSdk: "${name}" must be a finite number between 0 and 1 ` +
        `to match the cosine similarity range of the vector index.`,
    );
  }
}