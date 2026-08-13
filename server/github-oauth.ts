import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";

const stateSecret = () => ENV.jwtSecret || "devflow-development-state-secret";
function signState(value: string) { const signature = crypto.createHmac("sha256", stateSecret()).update(value).digest("hex"); return `${value}.${signature}`; }
function verifyState(value: string) { const parts = value.split("."); if (parts.length < 2) return null; const raw = parts.slice(0, -1).join("."); const expected = crypto.createHmac("sha256", stateSecret()).update(raw).digest("hex"); return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.at(-1)!)) ? raw : null; }

export function registerGithubOAuth(app: Express) {
  app.get("/api/github/oauth/start", (req: Request, res: Response) => {
    if (!ENV.githubClientId || !ENV.githubOAuthRedirectUri) return res.status(503).json({ configured: false, message: "GitHub OAuth credentials are not configured yet." });
    const state = signState(`${Date.now()}.${crypto.randomBytes(16).toString("hex")}`);
    const params = new URLSearchParams({ client_id: ENV.githubClientId, redirect_uri: ENV.githubOAuthRedirectUri, scope: "repo read:user user:email", state });
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });

  app.get("/api/github/oauth/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!ENV.githubClientId || !ENV.githubClientSecret || !ENV.githubOAuthRedirectUri) return res.status(503).json({ configured: false, message: "GitHub OAuth credentials are not configured yet." });
    if (!code || !verifyState(state)) return res.status(400).json({ error: "Invalid GitHub OAuth callback state." });
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: ENV.githubClientId, client_secret: ENV.githubClientSecret, code, redirect_uri: ENV.githubOAuthRedirectUri }) });
    if (!tokenResponse.ok) return res.status(502).json({ error: "GitHub token exchange failed." });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) return res.status(502).json({ error: "GitHub did not return an access token." });
    res.cookie("devflow_github_token", token.access_token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30, path: "/" });
    res.redirect("/");
  });
}
