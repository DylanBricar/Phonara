import { z } from "zod";
import { ApplicationError } from "./errors/application-error";
import { HttpError } from "./errors/http-error";
import { logger } from "./logger";

/**
 * Error handler for `createAPIFileRoute` handlers.
 *
 * Wrap your handler body in `try { ... } catch (e) { return handleApiError(e); }`.
 * Throw `HttpError(msg, status)` from inside the handler when you need a specific
 * status code; throw `ApplicationError` for plain 400s; `z.ZodError` becomes a 422.
 *
 * API route handlers do not compose declarative middleware. Call auth helpers
 * (`getUser`, `getRequiredCurrentOrg`, `isAdmin`) inline before the work.
 */
export function handleApiError(e: unknown): Response {
  if (e instanceof HttpError) {
    logger.debug("[DEV] - HttpError", e);
    return Response.json({ message: e.message }, { status: e.status });
  }

  if (e instanceof ApplicationError) {
    logger.debug("[DEV] - ApplicationError", e);
    return Response.json({ message: e.message }, { status: 400 });
  }

  if (e instanceof z.ZodError) {
    logger.debug("[DEV] - ZodError", e);
    return Response.json(
      { message: "Validation error", errors: e.issues },
      { status: 422 },
    );
  }

  logger.info("Unknown Error", e);

  if (import.meta.env.DEV) {
    return Response.json(
      { message: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }

  return Response.json({ message: "Internal server error" }, { status: 500 });
}
