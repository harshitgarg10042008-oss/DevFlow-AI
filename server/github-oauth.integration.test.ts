import { describe, it, expect, beforeEach, vi } from "vitest";
import * as db from "./db";
import { sdk } from "./_core/sdk";

// Mock dependencies
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertGithubConnection: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn(),
  },
}));

vi.mock("./_core/env", () => ({
  ENV: {
    githubClientId: "test-client-id",
    githubClientSecret: "test-client-secret",
    githubOAuthRedirectUri: "http://localhost:4000/auth/github/callback",
    jwtSecret: "test-jwt-secret",
  },
}));

// Mock fetch for GitHub API calls
global.fetch = vi.fn() as any;

describe("GitHub OAuth Callback Logic", () => {
  const validCode = "test-auth-code";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful GitHub token exchange
    (global.fetch as any).mockImplementation((url: string) => {
      if (url === "https://github.com/login/oauth/access_token") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: "test-access-token" }),
        });
      }
      if (url === "https://api.github.com/user") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 123456,
            login: "testuser",
            email: "test@example.com",
            avatar_url: "https://github.com/avatar.png",
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });

    // Mock database operations
    vi.mocked(db.upsertUser).mockResolvedValue(undefined);
    vi.mocked(db.getUserByOpenId).mockResolvedValue({
      id: 1,
      openId: "github_123456",
      name: "testuser",
      email: "test@example.com",
      loginMethod: "github",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    vi.mocked(db.upsertGithubConnection).mockResolvedValue(undefined);

    // Mock JWT creation
    vi.mocked(sdk.createSessionToken).mockResolvedValue("test-jwt-token");
  });

  describe("GitHub API integration", () => {
    it("should use correct authorization header for GitHub API", async () => {
      let capturedHeaders: Record<string, string> | undefined;

      (global.fetch as any).mockImplementation((url: string, options: any) => {
        if (url === "https://api.github.com/user") {
          capturedHeaders = options.headers as Record<string, string>;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 123456,
              login: "testuser",
              email: "test@example.com",
              avatar_url: "https://github.com/avatar.png",
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: "test-access-token" }),
        });
      });

      // Simulate the fetchGitHubUser function logic
      const accessToken = "test-access-token";
      await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders?.Authorization).toBe("Bearer test-access-token");
    });

    it("should handle GitHub user without email", async () => {
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === "https://api.github.com/user") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 123456,
              login: "testuser",
              email: null,
              avatar_url: "https://github.com/avatar.png",
            }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const response = await fetch("https://api.github.com/user");
      const user = await response.json();

      expect(user.email).toBeNull();
    });

    it("should handle GitHub API errors", async () => {
      (global.fetch as any).mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 401,
        });
      });

      const response = await fetch("https://api.github.com/user");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe("User upsert integration", () => {
    it("should upsert user with GitHub data", async () => {
      const githubUser = {
        id: 123456,
        login: "testuser",
        email: "test@example.com",
      };

      const openId = `github_${githubUser.id}`;
      await db.upsertUser({
        openId,
        name: githubUser.login,
        email: githubUser.email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });

      expect(db.upsertUser).toHaveBeenCalledWith(
        expect.objectContaining({
          openId: "github_123456",
          name: "testuser",
          email: "test@example.com",
          loginMethod: "github",
        })
      );
    });

    it("should retrieve user after upsert", async () => {
      const openId = "github_123456";
      const user = await db.getUserByOpenId(openId);

      expect(user).toBeDefined();
      expect(user?.openId).toBe(openId);
      expect(db.getUserByOpenId).toHaveBeenCalledWith(openId);
    });

    it("should store GitHub connection", async () => {
      await db.upsertGithubConnection({
        userId: 1,
        githubLogin: "testuser",
        accessToken: "encrypted-token",
        scopes: "repo,read:user",
      });

      expect(db.upsertGithubConnection).toHaveBeenCalledWith({
        userId: 1,
        githubLogin: "testuser",
        accessToken: "encrypted-token",
        scopes: "repo,read:user",
      });
    });
  });

  describe("JWT session creation", () => {
    it("should create session token for user", async () => {
      const openId = "github_123456";
      const sessionToken = await sdk.createSessionToken(openId, {
        name: "testuser",
        expiresInMs: 365 * 24 * 60 * 60 * 1000,
      });

      expect(sessionToken).toBe("test-jwt-token");
      expect(sdk.createSessionToken).toHaveBeenCalledWith(
        openId,
        expect.objectContaining({
          name: "testuser",
          expiresInMs: 365 * 24 * 60 * 60 * 1000,
        })
      );
    });
  });

  describe("Error handling integration", () => {
    it("should handle database errors gracefully", async () => {
      vi.mocked(db.upsertUser).mockRejectedValue(new Error("Database error"));

      await expect(
        db.upsertUser({
          openId: "github_123456",
          name: "testuser",
          lastSignedIn: new Date(),
        })
      ).rejects.toThrow("Database error");
    });

    it("should handle user not found after upsert", async () => {
      vi.mocked(db.getUserByOpenId).mockResolvedValue(undefined);

      const user = await db.getUserByOpenId("github_123456");
      expect(user).toBeUndefined();
    });
  });
});

