import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { fileURLToPath } from 'url';
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: fs.existsSync(path.resolve(__dirname, "../vite.config.ts"))
      ? path.resolve(__dirname, "../vite.config.ts")
      : undefined,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        // Don't exit on all errors, especially not in production or for common requests
        const message = msg as any;
        if (message.indexOf("failed to load config") !== -1 || message.indexOf("Could not resolve") !== -1) {
          // console.warn(`Vite check: ${msg}`);
        }
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Force no-cache for all Vite assets to bypass corrupted browser disk cache
  app.use((req: any, res: any, next: any) => {
    if (req.url && !req.url.startsWith('/api')) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      // Remove conditional headers from request to prevent 304s
      const headers = req.headers as any;
      if (headers) {
        delete headers['if-none-match'];
        delete headers['if-modified-since'];
      }
    }
    next();
  });

  app.use(vite.middlewares);

  // Only serve index.html for non-API routes to avoid conflicts with React Router
  app.use("*", async (req: any, res: any, next: any) => {
    const url = req.originalUrl;

    // Skip API routes
    if (url.startsWith('/api')) {
      return next();
    }

    // Skip common static file extensions if they reach here (meaning Vite didn't handle them)
    if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|map|json|tsx|ts)$/i)) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Guard against malformed URLs that would crash decodeURIComponent inside Vite
      try {
        const decoded = (global as any).decodeURIComponent(url);
      } catch (e) {
        log(`Malformed URL detected: ${url}`, "vite");
        return res.status(400).send("Bad Request: Malformed URL");
      }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
