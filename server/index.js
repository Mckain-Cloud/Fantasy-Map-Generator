import express from "express";
import compression from "compression";
import {fileURLToPath} from "url";
import {dirname, join} from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");
const MAPS_DIR = join(ROOT_DIR, "saved-maps");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(compression());
app.use(express.json({limit: "100mb"}));

// Ensure maps directory exists
await fs.mkdir(MAPS_DIR, {recursive: true});

// ============= MAP STORAGE API =============

// List all saved maps
app.get("/api/maps", async (req, res) => {
  try {
    const files = await fs.readdir(MAPS_DIR);
    const maps = await Promise.all(
      files
        .filter(f => f.endsWith(".map") || f.endsWith(".gz"))
        .map(async f => {
          const stats = await fs.stat(join(MAPS_DIR, f));
          return {
            name: f,
            size: stats.size,
            modified: stats.mtime
          };
        })
    );
    res.json({maps: maps.sort((a, b) => b.modified - a.modified)});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Get a specific map
app.get("/api/maps/:name", async (req, res) => {
  try {
    const filePath = join(MAPS_DIR, req.params.name);
    // Security: ensure path is within MAPS_DIR
    if (!filePath.startsWith(MAPS_DIR)) {
      return res.status(403).json({error: "Access denied"});
    }
    const data = await fs.readFile(filePath);
    res.type("application/octet-stream").send(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).json({error: "Map not found"});
    } else {
      res.status(500).json({error: error.message});
    }
  }
});

// Save a map
app.post("/api/maps", async (req, res) => {
  try {
    const {name, data} = req.body;
    if (!name || !data) {
      return res.status(400).json({error: "Name and data required"});
    }
    // Sanitize filename
    const safeName = name.replace(/[^a-z0-9._-]/gi, "_");
    const filename = safeName.endsWith(".map") || safeName.endsWith(".gz") ? safeName : `${safeName}.map`;
    const filePath = join(MAPS_DIR, filename);

    // Security: ensure path is within MAPS_DIR
    if (!filePath.startsWith(MAPS_DIR)) {
      return res.status(403).json({error: "Access denied"});
    }

    await fs.writeFile(filePath, data, "base64");
    res.json({success: true, filename});
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

// Delete a map
app.delete("/api/maps/:name", async (req, res) => {
  try {
    const filePath = join(MAPS_DIR, req.params.name);
    // Security: ensure path is within MAPS_DIR
    if (!filePath.startsWith(MAPS_DIR)) {
      return res.status(403).json({error: "Access denied"});
    }
    await fs.unlink(filePath);
    res.json({success: true});
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).json({error: "Map not found"});
    } else {
      res.status(500).json({error: error.message});
    }
  }
});

// ============= AI PROXY API (for future use) =============

app.post("/api/ai/generate", async (req, res) => {
  // Placeholder for AI API proxy
  // This will forward requests to OpenAI/Anthropic/Ollama
  // while keeping API keys server-side
  res.status(501).json({error: "AI proxy not yet implemented"});
});

// ============= STATIC FILE SERVING =============

// In production, serve the built dist folder
// In development, use Vite dev server instead
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(ROOT_DIR, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(join(ROOT_DIR, "dist", "index.html"));
  });
} else {
  // Development: serve source files directly
  app.use(express.static(ROOT_DIR));
}

app.listen(PORT, () => {
  console.log(`Fantasy Map Generator server running on http://localhost:${PORT}`);
  console.log(`Maps directory: ${MAPS_DIR}`);
  if (process.env.NODE_ENV !== "production") {
    console.log("Note: For development with HMR, use 'npm run dev' instead");
  }
});
