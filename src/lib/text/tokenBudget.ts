export const TRANSCRIPTION_PROMPT_TOKEN_BUDGET = 112;

/** Per-script token cost estimator (tokens per character). */
export const estimatePromptTokens = (text: string): number => {
  let tokens = 0;

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) {
      // CJK Unified Ideographs
      tokens += 2.2;
    } else if (code >= 0x3040 && code <= 0x30ff) {
      // Hiragana / Katakana
      tokens += 2.2;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      // Cyrillic
      tokens += 0.5;
    } else {
      // Latin and other scripts
      tokens += 0.25;
    }
  }

  return Math.ceil(tokens);
};
