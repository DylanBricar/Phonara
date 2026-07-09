import { describe, expect, test } from "bun:test";
import {
  estimatePromptTokens,
  TRANSCRIPTION_PROMPT_TOKEN_BUDGET,
} from "../../src/lib/text/tokenBudget";

describe("estimatePromptTokens", () => {
  test("returns zero for an empty prompt", () => {
    expect(estimatePromptTokens("")).toBe(0);
  });

  test("estimates latin text conservatively", () => {
    expect(estimatePromptTokens("abcd")).toBe(1);
    expect(estimatePromptTokens("hello world")).toBe(3);
  });

  test("charges cyrillic text more than latin text", () => {
    expect(estimatePromptTokens("тест")).toBe(2);
  });

  test("charges CJK and kana text as dense scripts", () => {
    expect(estimatePromptTokens("你好")).toBe(5);
    expect(estimatePromptTokens("かな")).toBe(5);
  });

  test("exports the Whisper prompt budget used by the UI", () => {
    expect(TRANSCRIPTION_PROMPT_TOKEN_BUDGET).toBe(112);
  });
});
