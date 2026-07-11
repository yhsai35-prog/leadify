import { describe, expect, it } from "vitest";
import { assertSystemOnlyTransitionToSent, assertValidTransition } from "./stateMachine.js";
import { ApiError } from "./errors.js";

describe("assertValidTransition", () => {
  it("allows a valid forward transition", () => {
    expect(() => assertValidTransition("draft_ready", "pending_approval")).not.toThrow();
  });

  it("allows transitioning to lost from most active stages", () => {
    expect(() => assertValidTransition("qualified", "lost")).not.toThrow();
    expect(() => assertValidTransition("proposal", "lost")).not.toThrow();
  });

  it("rejects skipping stages", () => {
    expect(() => assertValidTransition("imported", "draft_ready")).toThrow(ApiError);
  });

  it("rejects transitions out of terminal states", () => {
    expect(() => assertValidTransition("won", "proposal")).toThrow(ApiError);
    expect(() => assertValidTransition("lost", "qualified")).toThrow(ApiError);
  });

  it("is a no-op when the status does not change", () => {
    expect(() => assertValidTransition("approved", "approved")).not.toThrow();
  });
});

describe("assertSystemOnlyTransitionToSent", () => {
  it("blocks any direct user-triggered transition to sent", () => {
    expect(() => assertSystemOnlyTransitionToSent("sent")).toThrow(ApiError);
  });

  it("allows every other target status", () => {
    expect(() => assertSystemOnlyTransitionToSent("approved")).not.toThrow();
  });
});
