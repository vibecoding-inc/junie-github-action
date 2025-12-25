import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as github from "@actions/github";
import { checkHumanActor } from "../src/github/validation/actor";
import type { Octokit } from "@octokit/rest";

describe("Actor Validation", () => {
  let getUserByUsernameSpy: any;
  let mockOctokit: Octokit;
  let originalActor: string;

  beforeEach(() => {
    mockOctokit = {
      users: {
        getByUsername: async () => ({ data: { type: "User" } }),
      },
    } as any;
    // Save original actor
    originalActor = github.context.actor;
  });

  afterEach(() => {
    if (getUserByUsernameSpy) {
      getUserByUsernameSpy.mockRestore();
    }
    // Restore original actor
    (github.context as any).actor = originalActor;
  });

  describe("checkHumanActor", () => {
    test("should return true for human actor (type: User)", async () => {
      // Mock github.context.actor
      (github.context as any).actor = "contributor-user";
      
      getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockResolvedValue({
        data: { type: "User", login: "contributor-user" },
      } as any);

      const result = await checkHumanActor(mockOctokit);
      expect(result).toBe(true);
      expect(getUserByUsernameSpy).toHaveBeenCalledWith({
        username: "contributor-user",
      });
    });

    test("should return false for bot actor (type: Bot)", async () => {
      // Mock github.context.actor
      (github.context as any).actor = "dependabot[bot]";
      
      getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockResolvedValue({
        data: { type: "Bot", login: "dependabot[bot]" },
      } as any);

      const result = await checkHumanActor(mockOctokit);
      expect(result).toBe(false);
    });

    test("should return false for github-actions bot", async () => {
      // Mock github.context.actor
      (github.context as any).actor = "github-actions[bot]";
      
      getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockResolvedValue({
        data: { type: "Bot", login: "github-actions[bot]" },
      } as any);

      const result = await checkHumanActor(mockOctokit);
      expect(result).toBe(false);
    });

    test("should call GitHub API with correct username", async () => {
      // Mock github.context.actor
      (github.context as any).actor = "alice";
      
      getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockResolvedValue({
        data: { type: "User", login: "alice" },
      } as any);

      const result = await checkHumanActor(mockOctokit);

      expect(result).toBe(true);
      expect(getUserByUsernameSpy).toHaveBeenCalledWith({
        username: "alice",
      });
      expect(getUserByUsernameSpy).toHaveBeenCalledTimes(1);
    });

    test("should return false on API errors", async () => {
      // Mock github.context.actor
      (github.context as any).actor = "contributor-user";
      
      getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      const result = await checkHumanActor(mockOctokit);
      expect(result).toBe(false);
    });

    test("should return false on 404 user not found", async () => {
      // Mock github.context.actor
      (github.context as any).actor = "contributor-user";
      
      getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockRejectedValue({
        status: 404,
        message: "Not Found",
      });

      const result = await checkHumanActor(mockOctokit);
      expect(result).toBe(false);
    });

    test("should work with different actor names", async () => {
      const actors = ["john-doe", "jane_smith", "user123", "test-user-42"];

      for (const actor of actors) {
        // Mock github.context.actor for each actor
        (github.context as any).actor = actor;
        
        getUserByUsernameSpy = spyOn(mockOctokit.users, "getByUsername").mockResolvedValue({
          data: { type: "User", login: actor },
        } as any);

        const result = await checkHumanActor(mockOctokit);
        expect(result).toBe(true);

        getUserByUsernameSpy.mockRestore();
      }
    });
  });
});
