import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middleware
  app.use(express.json());

  // API Route: Send invoice to Cloudflare worker (bypass CORS)
  app.post("/api/send-invoice", async (req, res) => {
    try {
      const response = await fetch("https://sushi-bae-invoice.gayemmartin.workers.dev", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (response.ok) {
        res.status(response.status).json({ success: true, message: "Invoice sent to kitchen successfully" });
      } else {
        const text = await response.text();
        res.status(response.status).json({ success: false, message: text || "Worker returned non-OK status" });
      }
    } catch (error: any) {
      console.error("Error proxying invoice request:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to contact kitchen email server" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
