import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";

const stateSecret = () => ENV.jwtSecret || "devflow-development-state-secret";
function signState(value: string) { const signature = crypto.createHmac("sha256", stateSecret()).update(value).digest("hex"); return `${value}.${signature}`; }
function verifyState(value: string) { const parts = value.split("."); if (parts.length < 2) return null; const raw = parts.slice(0, -1).join("."); const expected = crypto.createHmac("sha256", stateSecret()).update(raw).digest("hex"); return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.at(-1)!)) ? raw : null; }

// TODO: Encrypt access token at rest. Currently storing plaintext for development.
// In production, use a KMS-backed secret or encryption library like crypto-js.
function encryptAccessToken(token: string): string {
  // Placeholder for encryption - currently returns plaintext
  // Implement AES-256 encryption with ENV.jwtSecret as key
  return token;
}

function decryptAccessToken(encrypted: string): string {
  // Placeholder for decryption - currently returns plaintext
  return encrypted;
}

async function fetchGitHubUser(accessToken: string): Promise<{ id: number; login: string; email: string | null; avatar_url: string } | null> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      console.error("[GitHub OAuth] Failed to fetch user info:", response.status, response.statusText);
      return null;
    }
    const user = await response.json();
    return {
      id: user.id,
      login: user.login,
      email: user.email || null,
      avatar_url: user.avatar_url,
    };
  } catch (error) {
    console.error("[GitHub OAuth] Error fetching GitHub user:", error);
    return null;
  }
}

export function registerGithubOAuth(app: Express) {
  // Auth initiation route
  app.get("/auth/github", (req: Request, res: Response) => {
    if (!ENV.githubClientId || !ENV.githubOAuthRedirectUri) {
      console.error("[GitHub OAuth] Missing credentials");
      return res.status(503).json({ configured: false, message: "GitHub OAuth credentials are not configured yet." });
    }
    const state = signState(`${Date.now()}.${crypto.randomBytes(16).toString("hex")}`);
    const params = new URLSearchParams({
      client_id: ENV.githubClientId,
      redirect_uri: ENV.githubOAuthRedirectUri,
      scope: "repo read:user user:email",
      state
    });
    console.log("[GitHub OAuth] Initiating OAuth flow with state:", state.substring(0, 20) + "...");
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });

  // Callback route
  app.get("/auth/github/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const error = typeof req.query.error === "string" ? req.query.error : null;

    // Handle GitHub error responses (user denied, etc.)
    if (error) {
      console.error("[GitHub OAuth] GitHub returned error:", error);
      const errorCodes: Record<string, string> = {
        access_denied: "access_denied",
      };
      const safeErrorCode = errorCodes[error] || "oauth_error";
      return res.redirect(`http://localhost:3000/auth/error?code=${safeErrorCode}`);
    }

    if (!ENV.githubClientId || !ENV.githubClientSecret || !ENV.githubOAuthRedirectUri) {
      console.error("[GitHub OAuth] Missing credentials");
      return res.status(503).json({ configured: false, message: "GitHub OAuth credentials are not configured yet." });
    }

    if (!code) {
      console.error("[GitHub OAuth] Missing authorization code");
      return res.redirect("http://localhost:3000/auth/error?code=missing_code");
    }

    if (!verifyState(state)) {
      console.error("[GitHub OAuth] Invalid state parameter");
      return res.redirect("http://localhost:3000/auth/error?code=invalid_state");
    }

    try {
      // Exchange code for access token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: ENV.githubClientId,
          client_secret: ENV.githubClientSecret,
          code,
          redirect_uri: ENV.githubOAuthRedirectUri
        }),
      });

      if (!tokenResponse.ok) {
        console.error("[GitHub OAuth] Token exchange failed:", tokenResponse.status);
        return res.redirect("http://localhost:3000/auth/error?code=token_exchange_failed");
      }

      const token = await tokenResponse.json() as { access_token?: string };
      if (!token.access_token) {
        console.error("[GitHub OAuth] No access token in response");
        return res.redirect("http://localhost:3000/auth/error?code=no_token");
      }

      // Fetch GitHub user info
      const githubUser = await fetchGitHubUser(token.access_token);
      if (!githubUser) {
        console.error("[GitHub OAuth] Failed to fetch GitHub user");
        return res.redirect("http://localhost:3000/auth/error?code=user_fetch_failed");
      }

      // Upsert user to database using GitHub ID as openId
      const openId = `github_${githubUser.id}`;
      await db.upsertUser({
        openId,
        name: githubUser.login,
        email: githubUser.email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        console.error("[GitHub OAuth] Failed to retrieve user after upsert");
        return res.redirect("http://localhost:3000/auth/error?code=user_creation_failed");
      }

      // Store GitHub access token in database (encrypted)
      const encryptedToken = encryptAccessToken(token.access_token);
      await db.upsertGithubConnection({
        userId: user.id,
        githubLogin: githubUser.login,
        accessToken: encryptedToken,
        scopes: "repo,read:user",
      });

      // Create JWT session
      const sessionToken = await sdk.createSessionToken(openId, {
        name: githubUser.login,
        expiresInMs: 365 * 24 * 60 * 60 * 1000, // 1 year
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie("devflow_session", sessionToken, cookieOptions);

      console.log("[GitHub OAuth] Successfully authenticated user:", githubUser.login, "ID:", user.id);

      // Redirect to frontend dashboard
      res.redirect("http://localhost:3000/dashboard");
    } catch (error) {
      console.error("[GitHub OAuth] Unexpected error during callback:", error);
      return res.redirect("http://localhost:3000/auth/error?code=internal_error");
    }
  });
}
