import { ConvexError } from "convex/values";
import { toast, type ExternalToast } from "sonner";

type AppErrorData = {
  message?: unknown;
};

const isAppErrorData = (data: unknown): data is AppErrorData => {
  return typeof data === "object" && data !== null && "message" in data;
};

const cleanConvexMessage = (message: string) => {
  return message
    .replace(/^\[CONVEX[^\]]+\]\s*/, "")
    .replace(/^\[Request ID:[^\]]+\]\s*/, "")
    .replace(/^Server Error\s*/, "")
    .replace(/^Uncaught \w*Error:\s*/, "")
    .replace(/\s*Called by client\s*$/, "")
    .trim();
};

export const getClientErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  if (error instanceof ConvexError && isAppErrorData(error.data)) {
    const message = error.data.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error) {
    return cleanConvexMessage(error.message) || fallback;
  }

  return fallback;
};

export const toastClientError = (
  error: unknown,
  fallback: string,
  options?: ExternalToast,
) => {
  return toast.error(getClientErrorMessage(error, fallback), options);
};
