import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Pause, Play, AlertCircle, Sparkles, Check, Globe, UploadCloud, FileAudio, Trash2, Music, Volume2 } from "lucide-react";
import AudioVisualizer from "./AudioVisualizer";
import { RecordItem } from "../types";

interface MeetingRecorderProps {
  onMeetingProcessed: (record: RecordItem) => void;
}

export default function MeetingRecorder({ onMeetingProcessed }: MeetingRecorderProps) {
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [languageHint, setLanguageHint] = useState("Auto-detect");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);

  // Audio Upload specific states
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Available Languages
  const languages = [
    "Auto-detect",
    "English",
    "Spanish",
    "French",
    "German",
    "Japanese",
    "Mandarin",
    "Hindi",
    "Portuguese",
    "Italian",
  ];

  // Steps shown during Gemini AI generation
  const processingSteps = [
    "Preparing audio bytes for transmission...",
    "Sending voice stream to Express backend...",
    "Gemini is transcribing speech into point form...",
    "Formatting bullet-point response...",
    "Finalizing documentation points...",
  ];

  // Rotate processing steps dynamically to provide a highly interactive experience
  useEffect(() => {
    let interval: number;
    if (processingStep > 0 && processingStep < processingSteps.length) {
      interval = window.setInterval(() => {
        setProcessingStep((prev) => {
          if (prev < processingSteps.length) {
            return prev + 1;
          }
          return prev;
        });
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [processingStep]);

  // Sync state update for recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Stop recording tracks safely on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      audio.addEventListener("loadedmetadata", () => {
        resolve(Math.round(audio.duration));
        URL.revokeObjectURL(objectUrl);
      });
      audio.addEventListener("error", () => {
        resolve(0); // fallback if browser cannot decode metadata directly
        URL.revokeObjectURL(objectUrl);
      });
    });
  };

  const handleFileChange = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("audio/")) {
      const name = file.name.toLowerCase();
      const isAudioExt = name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".m4a") || name.endsWith(".ogg") || name.endsWith(".webm") || name.endsWith(".aac") || name.endsWith(".flac");
      if (!isAudioExt) {
        setError("Invalid file type. Please upload an audio file (.mp3, .wav, .m4a, .ogg, .webm, .aac, .flac).");
        return;
      }
    }
    
    setUploadedFile(file);
    // Auto-fill meeting title with filename if empty
    if (!meetingTitle || meetingTitle.trim() === "") {
      const baseName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      setMeetingTitle(baseName);
    }

    const duration = await getAudioDuration(file);
    setFileDuration(duration);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Find supported MIME type
      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/ogg" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/mp4" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "" }; // fallback to default browser encoder
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        await processAudio(audioBlob, mediaRecorder.mimeType);
      };

      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      console.error("Failed to start MediaRecorder:", err);
      setError("Unable to access microphone. Please check your browser permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        const base64 = resultString.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processAudio = async (audioBlob: Blob, mimeType: string, durationOverride?: number) => {
    setProcessingStep(1);
    setStatusMessage("Converting recording stream...");

    try {
      const base64Audio = await blobToBase64(audioBlob);

      setProcessingStep(2);
      setStatusMessage("Uploading sound bite to server...");

      const payload = {
        audio: base64Audio,
        mimeType: mimeType || "audio/webm",
        languageHint,
        meetingTitle: meetingTitle.trim() || (activeTab === "upload" && uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "Weekly Meeting Sync"),
      };

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      setProcessingStep(5);
      setStatusMessage("Finalizing point-form documentation...");

      const data = await response.json();

      // Create a full RecordItem object
      const newRecord: RecordItem = {
        id: crypto.randomUUID(),
        title: meetingTitle.trim() || (activeTab === "upload" && uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : `Session - ${new Date().toLocaleDateString()}`),
        date: new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        duration: durationOverride !== undefined ? durationOverride : recordingTime,
        points: data.points || ["No points could be extracted from the audio."],
        summary: data.summary || "",
        keyPoints: data.keyPoints || [],
        transcript: data.transcript || "",
        languageHint,
      };

      onMeetingProcessed(newRecord);
      // Reset state
      setMeetingTitle("");
      setRecordingTime(0);
      setUploadedFile(null);
      setFileDuration(0);
      setProcessingStep(0);
      setStatusMessage("");
    } catch (err: any) {
      console.error("AI processing error:", err);
      setError(err.message || "An error occurred while calling the Gemini API. Please make sure the API Key is set correctly in Settings.");
      setProcessingStep(0);
      setStatusMessage("");
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {processingStep > 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {/* Pulsing AI core */}
          <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
            <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-sky-400 rounded-full opacity-30 animate-spin" style={{ animationDuration: "12s" }}></div>
            <div className="relative bg-slate-950 border border-indigo-500/50 p-5 rounded-full shadow-lg">
              <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>
          </div>

          <h3 className="text-xl font-semibold text-white tracking-tight mb-3">
            Converting Audio to Point Form
          </h3>

          <p className="text-indigo-300 text-sm font-medium mb-6 animate-pulse">
            {processingSteps[Math.min(processingStep - 1, processingSteps.length - 1)]}
          </p>

          {/* Progress timeline */}
          <div className="flex items-center gap-2 max-w-md w-full px-8">
            {[1, 2, 3, 4, 5].map((step) => {
              const isActive = processingStep >= step;
              const isCompleted = processingStep > step;
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-indigo-500 text-white ring-4 ring-indigo-500/20"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step}
                  </div>
                  {step < 5 && (
                    <div
                      className={`flex-1 h-[2px] transition-colors duration-500 ${
                        processingStep > step ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    ></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header & Description */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              New Audio Conversion
            </h2>
            <p className="text-slate-400 text-xs">
              Record conversations, meetings, or voice memos, or upload existing audio files to convert them into point-form text instantly.
            </p>
          </div>

          {/* MODE SELECTOR TABS */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 w-fit">
            <button
              id="tab-record-mode"
              type="button"
              onClick={() => {
                setError(null);
                setActiveTab("record");
              }}
              disabled={isRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "record"
                  ? "bg-indigo-600/20 border border-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Mic className="w-3.5 h-3.5" />
              Record Live Audio
            </button>

            <button
              id="tab-upload-mode"
              type="button"
              onClick={() => {
                setError(null);
                setActiveTab("upload");
              }}
              disabled={isRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === "upload"
                  ? "bg-indigo-600/20 border border-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white"
              } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Audio File
            </button>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-2xl p-4 flex gap-3 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <div className="space-y-1">
                <p className="font-semibold">Action Required</p>
                <p className="text-red-300/80 leading-relaxed text-xs">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* Title & Language Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="meeting-title-input" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Session Title
                </label>
                <input
                  id="meeting-title-input"
                  type="text"
                  placeholder={activeTab === "upload" && uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "e.g. Design Sync / Sprint Planning"}
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="language-hint-select" className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Primary Language
                </label>
                <select
                  id="language-hint-select"
                  value={languageHint}
                  onChange={(e) => setLanguageHint(e.target.value)}
                  disabled={isRecording}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white transition-all outline-none appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px'
                  }}
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang} className="bg-slate-950 text-white">
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CONDITIONAL RENDER BY ACTIVE MODE TAB */}
            {activeTab === "record" ? (
              <div className="space-y-5">
                {/* Live Audio Visualizer Canvas */}
                <AudioVisualizer stream={streamRef.current} isRecording={isRecording} />

                {/* Big Timer and controls */}
                <div className="flex flex-col items-center justify-center py-4 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                  <div className="text-4xl font-mono font-semibold tracking-wider text-white mb-6 select-none">
                    {formatTime(recordingTime)}
                  </div>

                  <div className="flex items-center gap-4">
                    {isRecording ? (
                      <>
                        <button
                          id="pause-recording-button"
                          onClick={pauseRecording}
                          type="button"
                          className={`p-3.5 rounded-full border transition-all duration-200 flex items-center justify-center ${
                            isPaused
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                          }`}
                          title={isPaused ? "Resume Recording" : "Pause Recording"}
                        >
                          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                        </button>

                        <button
                          id="stop-recording-button"
                          onClick={stopRecording}
                          type="button"
                          className="p-5 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95"
                          title="Stop Recording"
                        >
                          <Square className="w-6 h-6 fill-white" />
                        </button>
                      </>
                    ) : (
                      <button
                        id="start-recording-button"
                        onClick={startRecording}
                        type="button"
                        className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:scale-[1.03] active:scale-[0.97]"
                      >
                        <Mic className="w-5 h-5 animate-pulse" />
                        Start Session Recording
                      </button>
                    )}
                  </div>

                  {isRecording && (
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-4">
                      {isPaused ? "Recording Paused" : "Actively Recording Microphone Stream"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* FILE UPLOAD VIEW MODE */
              <div className="space-y-5">
                {/* Drag and Drop Zone Container */}
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("audio-file-uploader")?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 relative ${
                    dragActive
                      ? "border-indigo-500 bg-indigo-600/10"
                      : "border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60"
                  }`}
                >
                  <input
                    id="audio-file-uploader"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {uploadedFile ? (
                    <div className="space-y-4">
                      <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                        <Volume2 className="w-6 h-6 animate-pulse" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-white text-sm font-bold line-clamp-1 max-w-sm">
                          {uploadedFile.name}
                        </p>
                        <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                          <span>
                            Size: {
                              uploadedFile.size > 1024 * 1024
                                ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`
                                : `${(uploadedFile.size / 1024).toFixed(2)} KB`
                            }
                          </span>
                          <span>•</span>
                          <span>Duration: {formatTime(fileDuration)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          setFileDuration(0);
                        }}
                        className="mx-auto flex items-center gap-1.5 px-3 py-1 bg-red-950/30 border border-red-900/50 text-red-400 text-xs rounded-lg hover:bg-red-900/20 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <p className="text-white text-sm font-semibold">
                          Drag and drop your audio file here
                        </p>
                        <p className="text-slate-400 text-xs">
                          or click to browse from local files
                        </p>
                      </div>

                      <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                        Supports MP3, WAV, M4A, OGG, WEBM, AAC (Max 25MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Audio Button */}
                {uploadedFile && (
                  <button
                    id="convert-audio-file-button"
                    type="button"
                    onClick={() => processAudio(uploadedFile, uploadedFile.type, fileDuration)}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-indigo-600/10 border border-indigo-500/25 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Convert Uploaded Audio to Point Form
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
