import { ApplicationError } from "@/lib/errors/application-error";
import { HttpError } from "@/lib/errors/http-error";
import { describe, expect, it } from "vitest";

describe("ApplicationError", () => {
  it("should set the message", () => {
    const err = new ApplicationError("oops");
    expect(err.message).toBe("oops");
  });

  it("should be an instance of Error", () => {
    const err = new ApplicationError("oops");
    expect(err).toBeInstanceOf(Error);
  });

  it("should have name 'ApplicationError'", () => {
    const err = new ApplicationError("oops");
    expect(err.name).toBe("ApplicationError");
  });
});

describe("HttpError", () => {
  it("should default status to 400", () => {
    const err = new HttpError("bad input");
    expect(err.status).toBe(400);
  });

  it("should accept a custom status", () => {
    const err = new HttpError("forbidden", 403);
    expect(err.status).toBe(403);
  });

  it("should be an instance of ApplicationError", () => {
    const err = new HttpError("err");
    expect(err).toBeInstanceOf(ApplicationError);
  });
});
