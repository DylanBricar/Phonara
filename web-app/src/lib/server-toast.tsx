import type { ServerToastEnum } from "../features/server-sonner/server-toast.schema";
import { logger } from "./logger";

export async function serverToast(
  message: string,
  type: ServerToastEnum = "info",
) {
  logger.warn(
    "[serverToast] Not implemented in TanStack Start. Use client-side toast instead.",
    { message, type },
  );
}
