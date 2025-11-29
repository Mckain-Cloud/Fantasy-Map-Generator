import fs from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.join(__dirname, "..", "saved-maps");

export default function apiPlugin() {
  return {
    name: "fmg-api",
    configureServer(server) {
      // Ensure maps directory exists
      fs.mkdir(MAPS_DIR, {recursive: true}).catch(() => {});

      // Parse JSON body for POST requests
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.headers["content-type"]?.includes("application/json")) {
          let body = "";
          req.on("data", chunk => (body += chunk));
          await new Promise(resolve => req.on("end", resolve));
          try {
            req.body = JSON.parse(body);
          } catch {
            req.body = {};
          }
        }
        next();
      });

      // List maps
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "GET" && req.url === "/api/maps") {
          try {
            const files = await fs.readdir(MAPS_DIR);
            const maps = await Promise.all(
              files
                .filter(f => f.endsWith(".map") || f.endsWith(".gz"))
                .map(async f => {
                  const stats = await fs.stat(path.join(MAPS_DIR, f));
                  return {name: f, size: stats.size, modified: stats.mtime};
                })
            );
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({maps: maps.sort((a, b) => b.modified - a.modified)}));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({error: error.message}));
          }
          return;
        }
        next();
      });

      // Get specific map
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/maps\/(.+)$/);
        if (req.method === "GET" && match) {
          try {
            const filename = decodeURIComponent(match[1]);
            const filePath = path.join(MAPS_DIR, filename);
            if (!filePath.startsWith(MAPS_DIR)) {
              res.statusCode = 403;
              res.end(JSON.stringify({error: "Access denied"}));
              return;
            }
            const data = await fs.readFile(filePath);
            res.setHeader("Content-Type", "application/octet-stream");
            res.end(data);
          } catch (error) {
            res.statusCode = error.code === "ENOENT" ? 404 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.code === "ENOENT" ? "Map not found" : error.message}));
          }
          return;
        }
        next();
      });

      // Save map
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/maps") {
          try {
            const {name, data} = req.body || {};
            if (!name || !data) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({error: "Name and data required"}));
              return;
            }
            const safeName = name.replace(/[^a-z0-9._-]/gi, "_");
            const filename = safeName.endsWith(".map") || safeName.endsWith(".gz") ? safeName : `${safeName}.map`;
            const filePath = path.join(MAPS_DIR, filename);
            if (!filePath.startsWith(MAPS_DIR)) {
              res.statusCode = 403;
              res.end(JSON.stringify({error: "Access denied"}));
              return;
            }
            await fs.writeFile(filePath, data, "base64");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({success: true, filename}));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.message}));
          }
          return;
        }
        next();
      });

      // Delete map
      server.middlewares.use(async (req, res, next) => {
        const match = req.url?.match(/^\/api\/maps\/(.+)$/);
        if (req.method === "DELETE" && match) {
          try {
            const filename = decodeURIComponent(match[1]);
            const filePath = path.join(MAPS_DIR, filename);
            if (!filePath.startsWith(MAPS_DIR)) {
              res.statusCode = 403;
              res.end(JSON.stringify({error: "Access denied"}));
              return;
            }
            await fs.unlink(filePath);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({success: true}));
          } catch (error) {
            res.statusCode = error.code === "ENOENT" ? 404 : 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({error: error.code === "ENOENT" ? "Map not found" : error.message}));
          }
          return;
        }
        next();
      });

      // AI proxy placeholder
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/ai/generate") {
          res.statusCode = 501;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({error: "AI proxy not yet implemented"}));
          return;
        }
        next();
      });
    }
  };
}
