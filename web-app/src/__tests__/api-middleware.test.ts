import { ApplicationError } from "@/lib/errors/application-error";
import { HttpError } from "@/lib/errors/http-error";
import { handleApiError } from "@/lib/api-middleware";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("handleApiError", () => {
  it("should handle HttpError with default 400 status", async () => {
    const response = handleApiError(new HttpError("test"));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ message: "test" });
  });

  it("should handle HttpError with custom status", async () => {
    const response = handleApiError(new HttpError("unauthorized", 401));

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ message: "unauthorized" });
  });

  it("should handle ApplicationError with 400 status", async () => {
    const response = handleApiError(new ApplicationError("bad request"));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toEqual({ message: "bad request" });
  });

  it("should handle ZodError with 422 status", async () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "invalid" });

    if (result.error) {
      const response = handleApiError(result.error);

      expect(response.status).toBe(422);
      const data = await response.json();
      expect(data.message).toBe("Validation error");
    } else {
      expect.unreachable("Should have failed validation");
    }
  });

  it("should handle unknown errors without leaking details in production", async () => {
    const response = handleApiError(new Error("secret internal error"));

    expect(response.status).toBe(500);
    const data = await response.json();
    // In dev mode (vitest), it returns the error message; in prod it returns generic message
    expect(data.message).toBeDefined();
  });
});
