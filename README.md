# 🎙️ AI Meeting Recorder & Summarizer

An elegant, secure, and production-ready meeting recording, transcription, and summarization platform. It enables teams and individuals to capture conversations live or upload existing audio recordings, transcribing them and generating structured summaries, action items, and timelines using the **Gemini 3.5-Flash** model.

---

## ✨ Key Features

- **🎙️ Real-time Recording & Visualizer:** Record live meetings directly from your browser with a responsive and fluid HTML5 Canvas audio waveform visualizer.
- **📤 Audio File Upload:** Upload pre-recorded audio files (`.mp3`, `.wav`, `.m4a`, `.webm`, etc.) for quick transcription and synthesis.
- **🧠 Gemini 3.5-Flash Integration:** Leverages the latest Gemini models for highly accurate speech-to-text transcription, executive summaries, and timeline extractions.
- **📅 Chronological Timelines:** Extracts key points from the meeting and organizes them in the exact chronological order in which they were discussed.
- **🌐 Multi-Language Support:** Specify target output languages including English, Spanish, French, German, Japanese, Mandarin, Hindi, Portuguese, and Italian.
- **📄 Professional Exports:** Copy specific summary components to your clipboard or download fully styled and formatted PDF summaries using `jsPDF`.
- **🗑️ Recycle Bin System:** Features a non-destructive delete option with a dedicated Recycle Bin to restore accidental deletes or purge meetings permanently.
- **🌓 Premium High-Contrast Theme System:** Easily switch between a modern slate-dark mode and an accessible, WCAG-compliant high-contrast light mode.
- **💾 Local Storage Persistence:** Saves meeting histories locally in the user's browser, preventing data loss on reloads.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS (v4), Motion (Framer Motion), Lucide React (Icons).
- **Backend:** Express.js, TypeScript, TSX (TypeScript Execute).
- **AI Engine:** Google GenAI SDK (`@google/genai`) running `gemini-3.5-flash`.
- **PDF Exporter:** `jsPDF` for client-side PDF document compilation.

---

## 📁 Project Structure

```
meeting-recorder-&-summarizer/
├── src/                      # Frontend Application (React)
│   ├── components/           # Reusable UI Elements
│   │   ├── AudioVisualizer.tsx  # Waveform renderer utilizing Web Audio API
│   │   ├── MeetingDetail.tsx    # Detailed summary, takeaways, copy & PDF export
│   │   ├── MeetingHistory.tsx   # History list, filter options, and search
│   │   ├── MeetingRecorder.tsx  # Audio recorder and file drag-and-drop upload
│   │   └── RecycleBin.tsx       # Restore deleted meetings or delete permanently
│   ├── types.ts              # TypeScript schemas (RecordItem interface)
│   ├── App.tsx               # Main application container and view router
│   ├── main.tsx              # React mounting file
│   └── index.css             # Tailwind imports & CSS theme system override
├── server.ts                 # Express Server (API endpoints & Vite Dev Middleware)
├── package.json              # Scripts & dependencies configuration
├── tsconfig.json             # TypeScript compiler settings
└── vite.config.ts            # Vite build and plugin configs
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** Ensure you have Node.js installed (v18 or higher recommended).
- **Gemini API Key:** An active Google AI Studio Gemini API Key.

### Installation

1. Clone the repository and navigate into the directory:
   ```bash
   cd meeting-recorder-&-summarizer
   ```

2. Install the package dependencies:
   ```bash
   npm install
   ```

3. Configure your Environment Variables:
   Create a `.env` file in the root directory (you can copy `.env.example` as a template):
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and insert your API Key:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   APP_URL="http://localhost:3000"
   ```

### Running Locally

To start both the frontend and backend in development mode:
```bash
npm run dev
```

This starts the Express server on **`http://localhost:3000`** with Vite running in middleware mode. Open the address in your browser to start recording.

---

## 📦 Production Build & Deployment

To build the application for deployment or staging environments:

1. Compile the React frontend assets and package the Express server:
   ```bash
   npm run build
   ```

2. Start the optimized production server:
   ```bash
   npm run start
   ```

---

## 🧠 AI Prompting & Schema

The application structures requests to Gemini using defined JSON Schemas to ensure output stability. It prompts the model to return:
1. **`transcript`**: A comprehensive verbatim transcription of everything spoken.
2. **`summary`**: A concise Executive Summary outlining context and decisions.
3. **`keyPoints`**: Critical actions, takeaways, and bulleted meeting decisions.
4. **`points`**: A sequence of statements structured in a chronological timeline format.

This ensures that the output is clean, readable, and structured for export.
