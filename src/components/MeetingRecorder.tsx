import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Sparkles, Check, Globe, UploadCloud, Volume2, AlertCircle, Play, Pause, Radio, MessageSquare, Info, FileText, Key, Tag, FileVideo, Video } from "lucide-react";
import AudioVisualizer from "./AudioVisualizer";
import { RecordItem } from "../types";

interface MeetingRecorderProps {
  onMeetingProcessed: (record: RecordItem) => void;
  onViewStateChange?: (viewState: "lobby" | "meeting" | "processing") => void;
  localOnlyMode: boolean;
  onRecordingStatusChange?: (isRecording: boolean, duration: number) => void;
}

export default function MeetingRecorder({
  onMeetingProcessed,
  onViewStateChange,
  localOnlyMode,
  onRecordingStatusChange,
}: MeetingRecorderProps) {
  // Input pathway tabs: "record" | "upload" | "manual"
  const [activeTab, setActiveTab] = useState<"record" | "upload" | "manual">("record");
  const [isProcessing, setIsProcessing] = useState(false);

  // Common settings
  const [meetingTitle, setMeetingTitle] = useState("");
  const [languageHint, setLanguageHint] = useState("Auto-detect");
  const [category, setCategory] = useState<"Engineering" | "Marketing" | "Infrastructure" | "Sales" | "General">("General");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Manual Entry state
  const [manualNotes, setManualNotes] = useState("");

  // Recording controls
  const [micActive, setMicActive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Errors & loading steps
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);

  // Audio streams & Web Audio API AnalyserNode
  const streamRef = useRef<MediaStream | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Available Languages & Categories
  const languages = [
    "Auto-detect", "English", "Spanish", "French", "German",
    "Japanese", "Mandarin", "Hindi", "Portuguese", "Italian", "Russian", "Arabic"
  ];

  const categories = ["General", "Engineering", "Marketing", "Infrastructure", "Sales"];

  const processingSteps = [
    "Preparing session payload...",
    "Sending voice/notes stream to Express backend...",
    "Gemini is identifying speaker turns & structured summary...",
    "Drafting action items & professional follow-up email...",
    "Finalizing meeting documentation & indexing...",
  ];

  useEffect(() => {
    onViewStateChange?.(isProcessing ? "processing" : isRecording ? "meeting" : "lobby");
  }, [isProcessing, isRecording, onViewStateChange]);

  useEffect(() => {
    let interval: number;
    if (processingStep > 0 && processingStep < processingSteps.length) {
      interval = window.setInterval(() => {
        setProcessingStep((prev) => (prev < processingSteps.length ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [processingStep]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  useEffect(() => {
    return () => {
      stopAudioStream();
    };
  }, []);

  useEffect(() => {
    onRecordingStatusChange?.(isRecording, recordingTime);
  }, [isRecording, recordingTime, onRecordingStatusChange]);

  const stopAudioStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setActiveStream(null);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setActiveStream(stream);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (err: any) {
      setError("Microphone access denied. Please grant audio permissions or try file upload/manual entry.");
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!mediaRecorderRef.current) return;

    setIsRecording(false);
    setIsProcessing(true);
    setProcessingStep(1);

    mediaRecorderRef.current.stop();
    stopAudioStream();

    await new Promise((resolve) => setTimeout(resolve, 600));
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

    // Convert Blob to Base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      await processAudioWithBackend(base64Data, "audio/webm", recordingTime || 60);
    };
  };

  const handleFileUpload = (file: File) => {
    const isAudioOrVideo =
      file.type.startsWith("audio/") ||
      file.type.startsWith("video/") ||
      /\.(mp4|m4v|m4a|mov|mkv|webm|wav|mp3|aac|flac|ogg|opus|3gp)$/i.test(file.name);

    if (!isAudioOrVideo) {
      setError("Please select a valid audio or video file (MP4, MP3, WAV, WebM, M4A, MOV, etc.).");
      return;
    }
    setError(null);
    setUploadedFile(file);

    const isVideo = file.type.startsWith("video/") || /\.(mp4|m4v|mov|mkv)$/i.test(file.name);
    const mediaEl = document.createElement(isVideo ? "video" : "audio");
    const objectUrl = URL.createObjectURL(file);
    mediaEl.src = objectUrl;
    mediaEl.onloadedmetadata = () => {
      if (Number.isFinite(mediaEl.duration) && mediaEl.duration > 0) {
        setFileDuration(Math.round(mediaEl.duration));
      } else {
        setFileDuration(120);
      }
      URL.revokeObjectURL(objectUrl);
    };
    mediaEl.onerror = () => {
      setFileDuration(120);
      URL.revokeObjectURL(objectUrl);
    };
  };

  const processUploadedFile = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setProcessingStep(1);

    let mimeType = uploadedFile.type;
    if (!mimeType || mimeType === "application/octet-stream") {
      const ext = uploadedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "mp4") mimeType = "video/mp4";
      else if (ext === "m4a") mimeType = "audio/m4a";
      else if (ext === "wav") mimeType = "audio/wav";
      else if (ext === "mp3") mimeType = "audio/mp3";
      else if (ext === "webm") mimeType = "audio/webm";
      else if (ext === "mov") mimeType = "video/quicktime";
      else mimeType = "video/mp4";
    }

    const reader = new FileReader();
    reader.readAsDataURL(uploadedFile);
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      await processAudioWithBackend(base64Data, mimeType, fileDuration || 120);
    };
  };

  const processAudioWithBackend = async (base64Audio: string, mimeType: string, duration: number) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customApiKey.trim()) {
        headers["x-gemini-key"] = customApiKey.trim();
      }

      const defaultTitle = meetingTitle.trim()
        ? meetingTitle
        : uploadedFile
        ? uploadedFile.name.replace(/\.[^/.]+$/, "")
        : "Session Recording";

      const response = await fetch("/api/upload", {
        method: "POST",
        headers,
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
          meetingTitle: defaultTitle,
          languageHint,
          category,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process meeting file.");

      const newRecord: RecordItem = {
        id: `rec_${Date.now()}`,
        title: defaultTitle,
        date: new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        duration,
        points: data.points || [],
        summary: data.summary,
        keyPoints: data.keyPoints,
        transcript: data.transcript,
        languageHint,
        actionItems: data.actionItems,
        category,
        emailDraft: data.emailDraft,
        inputMode: "audio",
        isDeleted: false,
      };

      setIsProcessing(false);
      onMeetingProcessed(newRecord);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || "An error occurred during AI processing.");
    }
  };

  const processManualNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNotes.trim()) {
      setError("Please enter typed or pasted meeting notes before processing.");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProcessingStep(1);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customApiKey.trim()) {
        headers["x-gemini-key"] = customApiKey.trim();
      }

      const response = await fetch("/api/process-notes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: meetingTitle || "Manual Entry Session",
          notes: manualNotes,
          languageHint,
          category,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process manual notes.");

      const wordCount = manualNotes.trim().split(/\s+/).length;
      const estimatedDuration = Math.max(60, Math.round(wordCount * 2.5));

      const newRecord: RecordItem = {
        id: `rec_${Date.now()}`,
        title: meetingTitle || "Manual Entry Session",
        date: new Date().toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        duration: estimatedDuration,
        points: data.points || [],
        summary: data.summary,
        keyPoints: data.keyPoints,
        transcript: data.transcript,
        languageHint,
        actionItems: data.actionItems,
        category,
        emailDraft: data.emailDraft,
        manualEntryText: manualNotes,
        inputMode: "manual",
        isDeleted: false,
      };

      setIsProcessing(false);
      onMeetingProcessed(newRecord);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || "An error occurred while processing notes.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Render Loader overlay during processing
  if (isProcessing) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden text-center space-y-6 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold text-white tracking-tight">Gemini AI Studio Processing</h3>
          <p className="text-xs text-indigo-400 font-mono animate-pulse">
            {processingSteps[Math.min(processingStep - 1, processingSteps.length - 1)]}
          </p>
        </div>
        <div className="w-full max-w-xs bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full transition-all duration-500"
            style={{ width: `${Math.min((processingStep / processingSteps.length) * 100, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Meeting Capture Studio</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
              Dual-Input Pathways
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Capture live audio, upload MP4 video or audio files, or paste manual meeting notes for AI transcription & action extraction.
          </p>
        </div>

        {/* Override API Key button */}
        <button
          type="button"
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl font-mono self-start md:self-auto transition-all"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{customApiKey ? "Custom Key Set" : "Header API Key (x-gemini-key)"}</span>
        </button>
      </div>

      {/* Optional Custom API Key input banner */}
      {showApiKeyInput && (
        <div className="bg-slate-950 border border-indigo-500/30 p-4 rounded-2xl space-y-2 animate-fade-in">
          <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            Client API Key Override (x-gemini-key header)
          </label>
          <input
            type="password"
            value={customApiKey}
            onChange={(e) => setCustomApiKey(e.target.value)}
            placeholder="Enter custom Gemini API key (overrides server environment key for this request)"
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
          />
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-950/50 border border-red-800/80 text-red-200 rounded-2xl p-4 flex items-center gap-3 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Title */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
              Meeting Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. Q3 Roadmap Review"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-400" />
              Category Filter
            </label>
            <select
              value={category}
              onChange={(e: any) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
              <Globe className="w-3 h-3 text-indigo-400" />
              Target Language
            </label>
            <select
              value={languageHint}
              onChange={(e) => setLanguageHint(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-sm text-white outline-none"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Input Mode Navigation Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("record")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "record"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Live Recording</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "upload"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File (MP4 / Audio)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "manual"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Manual Entry</span>
          </button>
        </div>

        {/* TAB 1: LIVE RECORDING */}
        {activeTab === "record" && (
          <div className="space-y-6 pt-2 animate-fade-in">
            {/* Live Web Audio API Frequency Canvas Visualizer */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
              <AudioVisualizer stream={activeStream} isRecording={isRecording} />

              <div className="flex items-center justify-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="text-2xl font-mono font-bold text-white tracking-wider">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="py-3.5 px-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Live Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecordingAndProcess}
                  className="py-3.5 px-8 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 animate-pulse"
                >
                  <MicOff className="w-5 h-5" />
                  <span>Stop & Generate Recap</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: UPLOAD AUDIO / MP4 */}
        {activeTab === "upload" && (
          <div className="space-y-6 pt-2 animate-fade-in">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 transition-all ${
                dragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto animate-bounce" />
              <p className="text-sm font-semibold text-white">Drag & drop your audio or MP4 video file here</p>
              <p className="text-xs text-slate-500">Supports MP4, MP3, WAV, WebM, M4A, AAC, MOV</p>

              <label className="inline-block mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white rounded-xl cursor-pointer transition-all">
                Browse Audio & Video Files
                <input
                  type="file"
                  accept="audio/*,video/*,.mp4,.m4a,.mov,.mkv,.webm,.wav,.mp3"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedFile && (
              <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {uploadedFile.type.startsWith("video/") || /\.(mp4|mov|mkv)$/i.test(uploadedFile.name) ? (
                    <FileVideo className="w-6 h-6 text-indigo-400 shrink-0" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-indigo-400 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{uploadedFile.name}</h4>
                      {/\.(mp4|mov|mkv)$/i.test(uploadedFile.name) || uploadedFile.type.startsWith("video/") ? (
                        <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] font-bold rounded uppercase">
                          MP4 / Video
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Approx {formatTime(fileDuration)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={processUploadedFile}
                  className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Extract & Summarize Audio</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANUAL ENTRY PATHWAY */}
        {activeTab === "manual" && (
          <form onSubmit={processManualNotes} className="space-y-4 pt-2 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center justify-between">
                <span>Meeting Notes & Raw Minutes</span>
                <span className="text-[10px] text-indigo-400 font-normal">Type or paste notes below</span>
              </label>
              <textarea
                required
                rows={7}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder={`Example typed notes:\n\nSarah welcomed team to Sprint kickoff.\nMarcus proposed using PostgreSQL relational database model for transaction state.\nElena confirmed modular React + Express server setup.\nAction item: Elena to deploy container demo by Friday EOD.`}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-2xl p-4 text-xs font-mono text-slate-200 placeholder-slate-600 outline-none leading-relaxed"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={!manualNotes.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:from-slate-800 disabled:to-slate-850 text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Process Notes & Generate AI Recap</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
