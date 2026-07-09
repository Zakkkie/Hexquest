import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/oracle", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
          return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required. Please set it in the Settings > Secrets panel." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction: "You are the Oracle of Nebula. You answer queries about the HexQuest Economy game world, survival tactics, thermodynamics, and the Void. Provide deep, analytical, and highly structured answers to complex queries."
        }
      });
      
      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to consult the Oracle." });
    }
  });

  app.post("/api/music", async (req, res) => {
    try {
      const { prompt, length = "clip" } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
          return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required. Please set it in the Settings > Secrets panel." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const model = length === "pro" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";
      
      console.log(`Starting music generation with model ${model} for prompt: "${prompt}"`);
      
      const responseStream = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
        config: {
          responseModalities: ['AUDIO']
        }
      });
      
      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";
      
      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }
      
      if (!audioBase64) {
        return res.status(400).json({ error: "Music generation did not return any audio data." });
      }
      
      console.log(`Music generation completed. Base64 length: ${audioBase64.length}, MimeType: ${mimeType}`);
      
      res.json({
        audioBase64,
        lyrics,
        mimeType
      });
    } catch (e: any) {
      console.error("Music generation error:", e);
      res.status(500).json({ error: e.message || "Failed to generate music." });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
