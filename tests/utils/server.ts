import http from "node:http";
import type { IncomingHttpHeaders } from "node:http";

type RouteHandler = (request: Request) => Promise<Response> | Response;

type RouteModule = {
  GET?: RouteHandler;
  POST?: RouteHandler;
  PUT?: RouteHandler;
  PATCH?: RouteHandler;
  DELETE?: RouteHandler;
};

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function createHeaders(nodeHeaders: IncomingHttpHeaders) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value == null) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
    } else {
      headers.append(key, value);
    }
  }

  return headers;
}

export function createRouteTestServer(routes: Record<string, RouteModule>) {
  return http.createServer(async (req, res) => {
    try {
      const method = (req.method ?? "GET").toUpperCase();
      const url = new URL(req.url ?? "/", "http://localhost");
      const route = routes[url.pathname];
      const handler = METHODS.includes(method) ? route?.[method as keyof RouteModule] : undefined;

      if (!route || !handler) {
        res.statusCode = route ? 405 : 404;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ error: route ? "Method Not Allowed" : "Not Found" }));
        return;
      }

      const chunks: Buffer[] = [];
      req.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      req.on("end", async () => {
        const bodyBuffer = Buffer.concat(chunks);
        const hasBody = bodyBuffer.length > 0 && method !== "GET" && method !== "HEAD";
        const request = new Request(`http://localhost${req.url ?? "/"}`, {
          method,
          headers: createHeaders(req.headers),
          body: hasBody ? bodyBuffer : undefined,
        });

        try {
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const arrayBuffer = await response.arrayBuffer();
          res.end(Buffer.from(arrayBuffer));
        } catch (error) {
          console.error(error);
          res.statusCode = 500;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "Handler execution failed" }));
        }
      });
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Server error" }));
    }
  });
}
