import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/errors.js";

type Target = "body" | "query" | "params";

/** Validates and replaces `req[target]` with the parsed (and defaulted/coerced) value. */
export function validate(schema: ZodSchema, target: Target = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message =
        target === "body"
          ? "Some of the submitted data was incomplete. Refresh the page and try again."
          : "The request could not be processed. Check your input and try again.";
      throw ApiError.badRequest(message, result.error.flatten());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}
