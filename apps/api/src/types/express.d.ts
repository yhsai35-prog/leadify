import type { AuthenticatedUser } from "@bluwheelz/shared";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
