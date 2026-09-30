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