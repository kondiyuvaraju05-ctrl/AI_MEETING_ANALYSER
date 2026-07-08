import express from "express";
import path from "path";
import dotenv from "dotenv";
import http from "http";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { initSignalingServer } from "./server/services/signalingServer";
import { authService } from "./server/services/authService";
import { meetingService } from "./server/services/meetingService";
import { notificationService } from "./server/services/notificationService";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Enable large body sizes for audio upload (base64)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Gemini client to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required to run AI features. Please configure it in your Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Authentication route (User Database SQL query)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.handleLogin(email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notification Service route
app.post("/api/notifications/invite", async (req, res) => {
  try {
    const { roomCode, emails } = req.body;
    const result = await notificationService.sendMeetingInvitation(roomCode, emails);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Meeting Database CRUD routes (MongoDB)
app.get("/api/meetings", async (req, res) => {
  try {
    const list = await meetingService.getAllMeetings();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/meetings/recycled", async (req, res) => {
  try {
    const list = await meetingService.getRecycledMeetings();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/meetings", async (req, res) => {
  try {
    const doc = await meetingService.saveMeetingRecord(req.body);
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/meetings/:id/bin", async (req, res) => {
  try {
    const success = await meetingService.moveMeetingToBin(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/meetings/:id/restore", async (req, res) => {
  try {
    const success = await meetingService.restoreMeetingFromBin(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/meetings/:id", async (req, res) => {
  try {
    const success = await meetingService.deleteMeetingPermanently(req.params.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// API endpoint to process audio
app.post("/api/upload", async (req, res) => {
  try {
    const { audio, mimeType, languageHint, meetingTitle } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "Missing 'audio' data in request body. It should be a base64-encoded string." });
    }

    const ai = getGeminiClient();

    // Construct the prompt with instructions
    const prompt = `Please process this audio recording of a meeting/session and generate:
1. A highly accurate, detailed, and comprehensive transcription or detailed text representation of everything spoken in the audio, capturing the complete dialogue or content.
2. A concise, well-structured executive summary of the entire conversation. The summary should capture the overall context, main discussion topics, important decisions, and the outcome of the conversation, allowing users to understand the recording without listening to the full audio.
3. The most important takeaways/key points from the conversation in a clear bullet-point or numbered format. These points should highlight critical information, decisions, action items, and significant discussion topics, avoiding unnecessary minor details.
4. A chronological list of Audio Points. These points must represent the chronological statements extracted from the recording in the exact order they were spoken, providing users with a timeline of the conversation and preserving the sequence of events.
5. An explicit list of action items discussed during the session, identifying the task, the owner assigned to it, and any deadline or timeline mentioned.

Format and Style Guidelines:
1. The output MUST be written entirely in the target language specified in the Language Context below. For example, if "Japanese" is specified, write the transcript, summary, keyPoints, chronological points, and action items in natural, professional Japanese.
2. Keep the phrasing highly professional, polished, clear, direct, and easily digestible. Avoid stutters and filler.
3. Structure each bullet point with active phrasing appropriate for the target language.
4. Each point in keyPoints and points must represent a clear, distinct, and complete statement.
5. SPEAKER DIARIZATION: You MUST identify and label different speakers in the transcription and the chronological points (e.g. 'Sarah: Hello', 'Marcus: We need...', 'Elena: ...' or 'Speaker A: ...', 'Speaker B: ...' if names are not explicitly mentioned). Do not merge different speakers' statements into single blocks.

The recording title or context is: "${meetingTitle || "Untitled Recording"}".
Language context: The selected target language for the output text is "${languageHint || "Auto-detect"}".

Return a JSON object matching the requested schema.`;

    // Call Gemini API with the audio part and text prompt
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: audio,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.STRING,
              description: "A detailed, comprehensive transcription or detailed text representation of the spoken contents in the audio, capturing the flow of the discussion."
            },
            summary: {
              type: Type.STRING,
              description: "A concise and well-structured summary of the entire conversation capturing the context, main topics, decisions, and outcomes."
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A bulleted list of the most important takeaways, critical information, decisions, and action items, avoiding minor details."
            },
            points: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A chronological list of statements extracted from the recording in the order they were spoken, serving as a timeline."
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING, description: "The description of the task or action item." },
                  owner: { type: Type.STRING, description: "The person assigned to the task, or 'Unassigned' if none." },
                  deadline: { type: Type.STRING, description: "The deadline or timeline for the task, or 'TBD' if none." }
                },
                required: ["task", "owner", "deadline"]
              },
              description: "A structured list of action items, owners, and deadlines extracted from the meeting."
            }
          },
          required: ["transcript", "summary", "keyPoints", "points", "actionItems"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("No response received from the Gemini model.");
    }

    // Parse the JSON block returned from Gemini
    const result = JSON.parse(textResult.trim());
    return res.json(result);

  } catch (error: any) {
    console.error("Error processing meeting audio:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while transcribing and summarizing the audio.",
      details: error.stack
    });
  }
});

// Setup Vite Dev Server / Static files
async function startServer() {
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

  initSignalingServer(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
