import { ConvexError } from "convex/values";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFIGURATION_ERROR";

type AppErrorData = {
  code: AppErrorCode;
  message: string;
};

export function throwAppError(
  code: AppErrorCode,
  message: string,
): never {
  throw new ConvexError<AppErrorData>({ code, message });
}

export function throwUnauthorized(message = "Unauthorized"): never {
  throwAppError("UNAUTHORIZED", message);
}

export function throwForbidden(message = "Forbidden"): never {
  throwAppError("FORBIDDEN", message);
}

export function throwNotFound(message = "Not found"): never {
  throwAppError("NOT_FOUND", message);
}

export function throwValidationError(message: string): never {
  throwAppError("VALIDATION_ERROR", message);
}

export function throwConfigurationError(message: string): never {
  throwAppError("CONFIGURATION_ERROR", message);
}
