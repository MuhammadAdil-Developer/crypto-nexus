import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.set('etag', false);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Security Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path.toLowerCase();

  // 1. Block sensitive files and directories
  if (
    path.includes('/.env') ||
    path.includes('/.git') ||
    path.includes('/.vscode') ||
    path.includes('docker-compose') ||
    path.includes('credentials')
  ) {
    return res.status(403).send('Forbidden');
  }

  // 2. Block backend source files extensions (if somehow exposed)
  if (path.endsWith('.py') || path.endsWith('.sql') || path.endsWith('.sh') || path.endsWith('.log')) {
    return res.status(403).send('Forbidden');
  }

  // 3. Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 4. Block Frontend Source Code in Production
  // If we are on the live domain, we should NEVER serve src files.
  // The user should be using the built assets (dist).
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    req.get('host')?.includes('accountzclub.com') ||
    req.get('host')?.includes('accsclub.cc') ||
    req.get('host')?.includes('accountz.club') ||
    req.get('host')?.includes('accountz2.club');

  if (isProduction) {
    if (
      path.startsWith('/src/') ||
      path.startsWith('/client/src/') ||
      path.includes('/vite.config') ||
      path.endsWith('.tsx') ||
      path.endsWith('.ts') // Be careful with .ts if used for video, but likely not
    ) {
      log(`Blocking source code access: ${req.path}`, "security");
      return res.status(403).send('Source code access denied');
    }
  }

  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
