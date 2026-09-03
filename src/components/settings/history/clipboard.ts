export type ClipboardWriter = Pick<Clipboard, "writeText">;

export const writeClipboardText = async (
  text: string,
  clipboard: ClipboardWriter = navigator.clipboard,
  reportError: (message: string, error: unknown) => void = console.error,
): Promise<boolean> => {
  try {
    await clipboard.writeText(text);
    return true;
  } catch (error) {
    reportError("Failed to copy to clipboard:", error);
    return false;
  }
};
