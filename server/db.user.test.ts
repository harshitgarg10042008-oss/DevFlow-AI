import { describe, it, expect, beforeEach, vi } from "vitest";
import { upsertUser, getUserByOpenId } from "./db";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Mock the database
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe("User Upsert Logic", () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  describe("upsertUser", () => {
    it("should throw error if openId is missing", async () => {
      await expect(upsertUser({} as any)).rejects.toThrow("User openId is required for upsert");
    });

    it("should insert new user when openId does not exist", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const userData = {
        openId: "github_123456",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "github",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockDb.insert).toHaveBeenCalledWith(users);
      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          openId: "github_123456",
          name: "Test User",
          email: "test@example.com",
          loginMethod: "github",
        })
      );
    });

    it("should update existing user when openId already exists", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const userData = {
        openId: "github_123456",
        name: "Updated Name",
        email: "updated@example.com",
        loginMethod: "github",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.onDuplicateKeyUpdate).toHaveBeenCalledWith({
        set: expect.objectContaining({
          name: "Updated Name",
          email: "updated@example.com",
          loginMethod: "github",
        }),
      });
    });

    it("should handle partial updates (only name)", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const userData = {
        openId: "github_123456",
        name: "New Name",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.onDuplicateKeyUpdate).toHaveBeenCalledWith({
        set: expect.objectContaining({
          name: "New Name",
        }),
      });
    });

    it("should handle partial updates (only email)", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const userData = {
        openId: "github_123456",
        email: "newemail@example.com",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.onDuplicateKeyUpdate).toHaveBeenCalledWith({
        set: expect.objectContaining({
          email: "newemail@example.com",
        }),
      });
    });

    it("should set admin role for owner openId", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      // Mock ENV to have ownerOpenId
      vi.mock("./_core/env", () => ({
        ENV: { ownerOpenId: "owner_123" },
      }));

      const userData = {
        openId: "owner_123",
        name: "Owner User",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "admin",
        })
      );
    });

    it("should set user role for non-owner openId", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const userData = {
        openId: "github_123456",
        name: "Regular User",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "user",
        })
      );
    });

    it("should handle null values correctly", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const userData = {
        openId: "github_123456",
        name: null,
        email: null,
        loginMethod: null,
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          name: null,
          email: null,
          loginMethod: null,
        })
      );
    });
  });

  describe("getUserByOpenId", () => {
    it("should return user when found", async () => {
      const mockUser = {
        id: 1,
        openId: "github_123456",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "github",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const user = await getUserByOpenId("github_123456");

      expect(user).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(users);
      expect(mockSelect.where).toHaveBeenCalledWith(eq(users.openId, "github_123456"));
    });

    it("should return undefined when user not found", async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const user = await getUserByOpenId("nonexistent");

      expect(user).toBeUndefined();
    });

    it("should return undefined when database is not available", async () => {
      vi.mocked(getDb).mockResolvedValue(null);

      const user = await getUserByOpenId("github_123456");

      expect(user).toBeUndefined();
    });
  });

  describe("GitHub user upsert integration", () => {
    it("should handle GitHub user with ID as openId prefix", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const githubUser = {
        id: 123456,
        login: "githubuser",
        email: "github@example.com",
      };

      const userData = {
        openId: `github_${githubUser.id}`,
        name: githubUser.login,
        email: githubUser.email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          openId: "github_123456",
          name: "githubuser",
          email: "github@example.com",
          loginMethod: "github",
        })
      );
    });

    it("should handle GitHub user without email", async () => {
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const githubUser = {
        id: 123456,
        login: "githubuser",
        email: null,
      };

      const userData = {
        openId: `github_${githubUser.id}`,
        name: githubUser.login,
        email: githubUser.email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      };

      await upsertUser(userData);

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          email: null,
        })
      );
    });
  });
});
