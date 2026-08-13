import type { Express, Request, Response } from "express";

const subscribers = new Set<Response>();

export function registerEventStream(app: Express) {
  app.get("/api/events", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    res.write(`event: ready\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);
    subscribers.add(res);
    const heartbeat = setInterval(() => res.write(`event: heartbeat\ndata: {}\n\n`), 25_000);
    req.on("close", () => { clearInterval(heartbeat); subscribers.delete(res); });
  });
}

export function publishEvent(event: string, payload: unknown) {
  const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  subscribers.forEach(response => { try { response.write(frame); } catch { subscribers.delete(response); } });
}
