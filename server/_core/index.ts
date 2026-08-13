import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerGithubWebhook } from "../webhooks";
import { startAnalysisWorker } from "../queue";
import { registerEventStream } from "../events";
import { registerGithubOAuth } from "../github-oauth";
import { rateLimit } from "../rate-limit";

function isPortAvailable(port: number): Promise<boolean> { return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => server.close(() => resolve(true))); server.on("error", () => resolve(false)); }); }
async function findAvailablePort(startPort = 3000) { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error("No available port found"); }

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use((req, res, next) => { const requestId = crypto.randomUUID(); res.setHeader("x-request-id", requestId); res.setHeader("x-content-type-options", "nosniff"); res.setHeader("x-frame-options", "DENY"); res.setHeader("referrer-policy", "same-origin"); res.setHeader("content-security-policy", "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'"); const started = Date.now(); res.on("finish", () => { if (!req.path.includes("/oauth/callback")) console.info(JSON.stringify({ event: "http_request", requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - started })); }); next(); });
  app.post("/api/webhooks/github", rateLimit(30), express.raw({ type: "application/json", limit: "5mb" }));
  app.use("/api/trpc", rateLimit(240));
  registerGithubWebhook(app);
  registerEventStream(app);
  registerGithubOAuth(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  startAnalysisWorker();
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}
startServer().catch(console.error);
