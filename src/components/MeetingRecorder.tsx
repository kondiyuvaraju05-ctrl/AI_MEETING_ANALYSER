import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, Sparkles, Check, Globe, UploadCloud, Trash2, Volume2, AlertCircle, Play, Pause, Radio, Users, MessageSquare, Info, Star, CheckCircle2, Network } from "lucide-react";
import AudioVisualizer from "./AudioVisualizer";
import { RecordItem } from "../types";
import ArchitectureVisualizer, { VisualizerState } from "./ArchitectureVisualizer";

interface MeetingRecorderProps {
  onMeetingProcessed: (record: RecordItem) => void;
  onViewStateChange?: (viewState: "lobby" | "meeting" | "processing") => void;
  localOnlyMode: boolean;
  onRecordingStatusChange?: (isRecording: boolean, duration: number) => void;
  onVisualStateChange?: (state: VisualizerState) => void;
}

export default function MeetingRecorder({
  onMeetingProcessed,
  onViewStateChange,
  localOnlyMode,
  onRecordingStatusChange,
  onVisualStateChange
}: MeetingRecorderProps) {
  // Navigation states
  const [viewState, setViewState] = useState<"lobby" | "meeting" | "processing">("lobby");
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");
  const [showVisualizerOverlay, setShowVisualizerOverlay] = useState(false);
  const [visualState, setLocalVisualState] = useState<VisualizerState>("idle");

  const setVisualState = (state: VisualizerState) => {
    setLocalVisualState(state);
    onVisualStateChange?.(state);
  };
  
  // Lobby settings
  const [meetingTitle, setMeetingTitle] = useState("");
  const [languageHint, setLanguageHint] = useState("Auto-detect");
  
  // Call controls
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSimulatedRecording, setIsSimulatedRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTimeString, setCurrentTimeString] = useState("");

  // Error and loader steps
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Refs for audio/video stream and recording
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement | null>(null);
  
  // Simulated speech detection for pulsing avatars
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const audioIntervalRef = useRef<number | null>(null);

  // Enhancements states and refs
  interface LiveTranscriptEntry {
    speaker: string;
    text: string;
    timestamp: string;
  }
  const [liveTranscript, setLiveTranscript] = useState<LiveTranscriptEntry[]>([]);
  const [lobbyMicLevel, setLobbyMicLevel] = useState(0);
  const lobbyAnalyserRef = useRef<AnalyserNode | null>(null);
  const lobbyAudioIntervalRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

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

  // Gemini steps
  const processingSteps = [
    "Compiling meeting audio bytes...",
    "Sending voice stream to Express backend...",
    "Gemini is transcribing speech into point form...",
    "Structuring summary & action items...",
    "Finalizing meeting documentation...",
  ];

  // Timer for current time in Google Meet bottom bar
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeString(now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Notify parent of viewState changes
  useEffect(() => {
    onViewStateChange?.(viewState);
  }, [viewState, onViewStateChange]);

  // Rotate Gemini steps
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

  // Sync recording timer
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

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      stopAllTracks();
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // Bubble up recording state to parent App.tsx
  useEffect(() => {
    onRecordingStatusChange?.(isRecording, recordingTime);
  }, [isRecording, recordingTime, onRecordingStatusChange]);

  // Lobby microphone amplitude analyser
  useEffect(() => {
    if (viewState === "lobby" && streamRef.current && micActive && activeTab === "record") {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        const source = audioCtx.createMediaStreamSource(streamRef.current);
        source.connect(analyser);
        lobbyAnalyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        lobbyAudioIntervalRef.current = window.setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setLobbyMicLevel(avg);
        }, 100);
      } catch (e) {
        console.warn("Lobby audio checker not started:", e);
      }
    } else {
      if (lobbyAudioIntervalRef.current) {
        clearInterval(lobbyAudioIntervalRef.current);
        lobbyAudioIntervalRef.current = null;
      }
      setLobbyMicLevel(0);
    }

    return () => {
      if (lobbyAudioIntervalRef.current) {
        clearInterval(lobbyAudioIntervalRef.current);
        lobbyAudioIntervalRef.current = null;
      }
    };
  }, [viewState, micActive, activeTab]);

  // Speech Recognition control
  const startSpeechRecognition = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = languageHint === "Auto-detect" ? "en-US" : 
                       languageHint === "Spanish" ? "es-ES" :
                       languageHint === "French" ? "fr-FR" :
                       languageHint === "German" ? "de-DE" :
                       languageHint === "Japanese" ? "ja-JP" : "en-US";

      recognition.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const transcriptText = event.results[resultIndex][0].transcript.trim();
        if (transcriptText) {
          addTranscriptEntry("You", transcriptText);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
      };

      recognition.onend = () => {
        if (isRecording && micActive && recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch (err) {
            console.error("Failed to restart speech recognition:", err);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("SpeechRecognition not supported or failed to start:", err);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const addTranscriptEntry = (speaker: string, text: string) => {
    const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLiveTranscript((prev) => [...prev, { speaker, text, timestamp: timeStr }]);
  };

  // Live simulation of meeting conversations & start speech recognition
  useEffect(() => {
    if (!isRecording) {
      stopSpeechRecognition();
      return;
    }

    if (micActive) {
      startSpeechRecognition();
    } else {
      stopSpeechRecognition();
    }

    const simulatedDialogues = [
      { speaker: "Sarah", text: "Welcome to the meeting, everyone! Let's align on Sprint 1 goals." },
      { speaker: "Marcus", text: "For the backend database, a relational model is highly recommended for transactional state." },
      { speaker: "Elena", text: "Agreed. I can containerize the Express backend with React by Friday." },
      { speaker: "Sarah", text: "Excellent! Do we have any action items for database schema definition?" },
      { speaker: "Marcus", text: "Yes, I will create the SQL schemas and migrations by next Wednesday." },
      { speaker: "Elena", text: "And I will set up the pipeline script and push a demo build." },
      { speaker: "Sarah", text: "Great, let's wrap this up. We have clear deliverables." }
    ];

    let index = 0;
    const initialTimeout = setTimeout(() => {
      if (index < simulatedDialogues.length) {
        addTranscriptEntry(simulatedDialogues[index].speaker, simulatedDialogues[index].text);
        index++;
      }
    }, 3000);

    const interval = setInterval(() => {
      if (index < simulatedDialogues.length) {
        addTranscriptEntry(simulatedDialogues[index].speaker, simulatedDialogues[index].text);
        index++;
      } else {
        const randomRemarks = [
          { speaker: "Marcus", text: "We should check the API limits for Gemini requests." },
          { speaker: "Elena", text: "I'll double check the ENV keys on the server." },
          { speaker: "Sarah", text: "Sounds good, make sure to write unit tests for the schema helpers." }
        ];
        const randomIdx = Math.floor(Math.random() * randomRemarks.length);
        addTranscriptEntry(randomRemarks[randomIdx].speaker, randomRemarks[randomIdx].text);
      }
    }, 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      stopSpeechRecognition();
    };
  }, [isRecording, micActive]);

  // Auto-scroll transcription feed to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveTranscript]);

  // Local-only summarization logic fallback
  const generateLocalSummary = (transcript: LiveTranscriptEntry[]) => {
    const text = transcript.map(e => `${e.speaker}: ${e.text}`).join("\n\n");
    const points = transcript.map(e => `${e.speaker} stated: "${e.text}"`);
    
    const summary = transcript.length > 0
      ? `This private meeting was summarized locally on your device. Dialogue included contributions from ${Array.from(new Set(transcript.map(t => t.speaker))).join(", ")}. Primary discussion points: ${transcript.slice(0, 3).map(t => t.text).join(". ")}`
      : "A private local meeting session was completed with no vocal dialogue captured.";
    
    const keyPoints = transcript.length > 0 
      ? transcript.filter(t => t.text.length > 15).slice(0, 5).map(t => t.text)
      : ["No local dialogue recorded."];
    
    const actionItems: { task: string; owner: string; deadline: string }[] = [];
    transcript.forEach((t) => {
      const lower = t.text.toLowerCase();
      if (lower.includes("action item") || lower.includes("task") || lower.includes("will") || lower.includes("set up") || lower.includes("complete") || lower.includes("create")) {
        let owner = t.speaker === "You" ? "You (Presenter)" : t.speaker;
        let deadline = "TBD";
        if (lower.includes("by next wednesday") || lower.includes("wednesday")) deadline = "Next Wednesday";
        if (lower.includes("by friday") || lower.includes("friday")) deadline = "Friday EOD";
        
        actionItems.push({
          task: t.text,
          owner,
          deadline
        });
      }
    });

    if (actionItems.length === 0) {
      actionItems.push({ task: "Review local transcript logs for unassigned tasks", owner: "You (Presenter)", deadline: "TBD" });
    }

    return {
      transcript: text,
      summary,
      keyPoints,
      points: points.length > 0 ? points : ["Local recording finalized."],
      actionItems
    };
  };

  // Handle local preview stream for Lobby
  useEffect(() => {
    if (viewState === "lobby" && activeTab === "record") {
      setupLobbyPreview();
    } else {
      // stop lobby stream if leaving lobby
      if (streamRef.current && viewState !== "meeting") {
        stopAllTracks();
      }
    }
  }, [viewState, activeTab]);

  const stopAllTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const setupLobbyPreview = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: cameraActive,
      });
      streamRef.current = stream;
      if (lobbyVideoRef.current) {
        lobbyVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Failed to get video for lobby preview:", err);
      // fallback to audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = audioStream;
      } catch (aErr) {
        console.error("No mic found either:", aErr);
        setError("Microphone permission is required to start live recording.");
      }
    }
  };

  // Join meeting room
  const joinMeeting = async () => {
    setError(null);
    setViewState("meeting");
    
    // Trigger visualizer path animations for Auth/Gateway -> Signaling -> Media
    setVisualState("join");
    setTimeout(() => setVisualState("signaling"), 1200);
    setTimeout(() => setVisualState("media_sfu"), 2800);
    
    // Create the session stream
    try {
      // If we already have a stream from lobby, reuse or refresh it
      stopAllTracks();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: cameraActive,
      });
      streamRef.current = stream;
      
      // Apply initial mic setting
      stream.getAudioTracks().forEach(track => track.enabled = micActive);

      // Connect to local video tile
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }, 100);

      // Start ambient speaking visual effects
      startSpeechDetection(stream);

    } catch (err) {
      console.error("Error setting up meeting streams:", err);
      setError("Unable to initialize meeting media device setup.");
    }
  };

  // Simulated Speech pulse indicator based on live microphone volume
  const startSpeechDetection = (stream: MediaStream) => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioIntervalRef.current = window.setInterval(() => {
        if (!micActive) {
          setIsUserSpeaking(false);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // If average voice volume exceeds threshold, show user speaking state
        setIsUserSpeaking(avg > 25);

        // Periodically fake bot speaking for live Meet atmosphere
        if (Math.random() > 0.95) {
          setIsBotSpeaking(true);
          setTimeout(() => setIsBotSpeaking(false), 2000);
        }
      }, 150);
    } catch (err) {
      console.warn("Speech detection not started:", err);
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    const nextState = !micActive;
    setMicActive(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => track.enabled = nextState);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    const nextState = !cameraActive;
    setCameraActive(nextState);
    
    if (streamRef.current) {
      if (nextState) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoTrack = videoStream.getVideoTracks()[0];
          streamRef.current.addTrack(videoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
          }
        } catch (err) {
          console.error("Could not start camera track:", err);
          setCameraActive(false);
        }
      } else {
        streamRef.current.getVideoTracks().forEach(track => {
          track.stop();
          streamRef.current?.removeTrack(track);
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
    }
  };

  // Generates a 1-second silent WAV file to bypass mic errors in simulated testing environments
  const createSilentAudioBlob = () => {
    const sampleRate = 8000;
    const numSamples = sampleRate; // 1 second of audio
    const buffer = new Uint8Array(44 + numSamples);
    
    // RIFF header
    buffer.set([82, 73, 70, 70], 0); // "RIFF"
    const fileLength = 36 + numSamples;
    buffer[4] = fileLength & 0xFF;
    buffer[5] = (fileLength >> 8) & 0xFF;
    buffer[6] = (fileLength >> 16) & 0xFF;
    buffer[7] = (fileLength >> 24) & 0xFF;
    
    buffer.set([87, 65, 86, 69], 8); // "WAVE"
    buffer.set([102, 109, 116, 32], 12); // "fmt "
    buffer.set([16, 0, 0, 0], 16); // Subchunk1Size (16)
    buffer.set([1, 0], 20); // AudioFormat (1)
    buffer.set([1, 0], 22); // NumChannels (1)
    
    // SampleRate (8000)
    buffer[24] = sampleRate & 0xFF;
    buffer[25] = (sampleRate >> 8) & 0xFF;
    buffer[26] = (sampleRate >> 16) & 0xFF;
    buffer[27] = (sampleRate >> 24) & 0xFF;
    
    // ByteRate (8000)
    buffer[28] = sampleRate & 0xFF;
    buffer[29] = (sampleRate >> 8) & 0xFF;
    buffer[30] = (sampleRate >> 16) & 0xFF;
    buffer[31] = (sampleRate >> 24) & 0xFF;
    
    buffer.set([1, 0], 32); // BlockAlign (1)
    buffer.set([8, 0], 34); // BitsPerSample (8)
    buffer.set([100, 97, 116, 97], 36); // "data"
    
    // Subchunk2Size (numSamples)
    buffer[40] = numSamples & 0xFF;
    buffer[41] = (numSamples >> 8) & 0xFF;
    buffer[42] = (numSamples >> 16) & 0xFF;
    buffer[43] = (numSamples >> 24) & 0xFF;
    
    // Silence bytes (128 for 8-bit PCM)
    for (let i = 0; i < numSamples; i++) {
      buffer[44 + i] = 128;
    }
    
    return new Blob([buffer], { type: "audio/wav" });
  };

  // Start active recording
  const startRecording = async () => {
    if (!streamRef.current) {
      await joinMeeting();
    }
    
    setError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);

    // Fallback: If no mic stream could be acquired, run in simulated recording mode
    if (!streamRef.current || streamRef.current.getAudioTracks().length === 0) {
      console.warn("No active audio track found. Enabling Simulated Recording Mode.");
      setIsRecording(true);
      setIsPaused(false);
      setIsSimulatedRecording(true);
      return;
    }

    try {
      setIsSimulatedRecording(false);
      // Create a separate audio stream specifically for recording to prevent browser video encoding
      const recordingAudioStream = new MediaStream(streamRef.current.getAudioTracks());

      let options = { mimeType: "audio/webm" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/ogg" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "audio/mp4" };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "" };
      }

      const mediaRecorder = new MediaRecorder(recordingAudioStream, options);
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

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      setError("Unable to record microphone stream. Make sure the microphone is active.");
    }
  };

  // Pause / Resume recording
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

  // Stop recording
  const stopRecording = () => {
    if (isSimulatedRecording) {
      setIsRecording(false);
      setIsPaused(false);
      setIsSimulatedRecording(false);
      
      const silentBlob = createSilentAudioBlob();
      processAudio(silentBlob, "audio/wav");
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // End Call: auto stop recording and exit meeting
  const endCall = () => {
    if (isRecording) {
      // Stop recording will trigger mediaRecorder.onstop, which calls processAudio
      setViewState("processing");
      stopRecording();
    } else {
      // Simply return to lobby
      setViewState("lobby");
    }
    stopAllTracks();
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
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

  // Process Recording with Gemini
  const processAudio = async (audioBlob: Blob, mimeType: string, durationOverride?: number) => {
    setViewState("processing");
    setProcessingStep(1);
    setStatusMessage("Converting recording stream...");
    setVisualState("gemini_process");

    try {
      if (localOnlyMode) {
        setProcessingStep(1);
        setStatusMessage("Synthesizing local transcript...");
        await new Promise(r => setTimeout(r, 1200));

        setProcessingStep(3);
        setStatusMessage("Parsing diarized speaker dialogs...");
        await new Promise(r => setTimeout(r, 800));

        setProcessingStep(4);
        setStatusMessage("Compiling private meeting dossier...");
        await new Promise(r => setTimeout(r, 600));

        const localData = generateLocalSummary(liveTranscript);
        const newRecord: RecordItem = {
          id: crypto.randomUUID(),
          title: meetingTitle.trim() || (activeTab === "upload" && uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : `Local Call - ${new Date().toLocaleDateString()}`),
          date: new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          duration: durationOverride !== undefined ? durationOverride : recordingTime,
          points: localData.points,
          summary: localData.summary,
          keyPoints: localData.keyPoints,
          transcript: localData.transcript,
          languageHint,
          actionItems: localData.actionItems,
          localOnly: true
        };

        onMeetingProcessed(newRecord);
        setVisualState("idle");

        // Reset layout states
        setMeetingTitle("");
        setRecordingTime(0);
        setUploadedFile(null);
        setFileDuration(0);
        setProcessingStep(0);
        setLiveTranscript([]);
        setViewState("lobby");
        return;
      }

      const base64Audio = await blobToBase64(audioBlob);

      setProcessingStep(2);
      setStatusMessage("Uploading voice data...");

      const payload = {
        audio: base64Audio,
        mimeType: mimeType || "audio/webm",
        languageHint,
        meetingTitle: meetingTitle.trim() || (activeTab === "upload" && uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "Google Meet Sync"),
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

      setProcessingStep(4);
      setStatusMessage("Finalizing document blocks...");

      const data = await response.json();

      const newRecord: RecordItem = {
        id: crypto.randomUUID(),
        title: meetingTitle.trim() || (activeTab === "upload" && uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : `Google Meet Call - ${new Date().toLocaleDateString()}`),
        date: new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        duration: durationOverride !== undefined ? durationOverride : recordingTime,
        points: data.points || ["No point-form items could be extracted."],
        summary: data.summary || "",
        keyPoints: data.keyPoints || [],
        transcript: data.transcript || "",
        languageHint,
        actionItems: data.actionItems || [],
        localOnly: false
      };

      onMeetingProcessed(newRecord);
      setVisualState("idle");
      
      // Reset layout states
      setMeetingTitle("");
      setRecordingTime(0);
      setUploadedFile(null);
      setFileDuration(0);
      setProcessingStep(0);
      setLiveTranscript([]);
      setViewState("lobby");
    } catch (err: any) {
      console.error("Gemini meeting processing error:", err);
      setError(err.message || "Failed to process audio. Please ensure GEMINI_API_KEY is configured.");
      setViewState("lobby");
      setProcessingStep(0);
      setVisualState("idle");
    }
  };

  // Helper for Upload
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
        resolve(0);
        URL.revokeObjectURL(objectUrl);
      });
    });
  };

  const handleFileChange = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("audio/")) {
      const name = file.name.toLowerCase();
      const isAudio = name.endsWith(".mp3") || name.endsWith(".wav") || name.endsWith(".m4a") || name.endsWith(".ogg") || name.endsWith(".webm") || name.endsWith(".aac");
      if (!isAudio) {
        setError("Invalid format. Please select an audio file.");
        return;
      }
    }
    setUploadedFile(file);
    if (!meetingTitle) {
      setMeetingTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    const duration = await getAudioDuration(file);
    setFileDuration(duration);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // ================= RENDER LOBBY STATE =================
  if (viewState === "lobby") {
    return (
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Left Column: Camera Preview and Audio visual check */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
            Lobby: Setup Media
          </h2>
          
          <div className="relative w-full aspect-video bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden group">
            {cameraActive && activeTab === "record" ? (
              <video
                ref={lobbyVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-2xl shadow-lg">
                  Y
                </div>
                <p className="text-xs text-slate-500 font-mono">Camera is turned off</p>
              </div>
            )}

            {/* Quick toggles on top of preview */}
            {activeTab === "record" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur border border-slate-800 px-4 py-2 rounded-full shadow-2xl">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2.5 rounded-full border transition-all ${
                    micActive
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  }`}
                  title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`p-2.5 rounded-full border transition-all ${
                    cameraActive
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                      : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                  }`}
                  title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
          
          {/* Mic Quality check bar */}
          {activeTab === "record" && (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span className="flex items-center gap-1">
                  <Mic className={`w-3.5 h-3.5 ${lobbyMicLevel > 10 ? "text-indigo-400 animate-pulse" : "text-slate-500"}`} />
                  Lobby Microphone Check
                </span>
                <span className="font-mono text-slate-500">
                  {micActive ? (lobbyMicLevel > 40 ? "Excellent Input" : lobbyMicLevel > 10 ? "Good Input" : "Speak to test mic...") : "Microphone Muted"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex items-center">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-400 transition-all duration-75"
                  style={{ width: `${micActive ? Math.min(100, (lobbyMicLevel / 80) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-2xl p-3 flex gap-2.5 text-xs animate-fade-in">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Right Column: Title, language, join button */}
        <div className="flex flex-col gap-6">
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/85 w-fit">
            <button
              onClick={() => setActiveTab("record")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "record" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Start Simulated Call
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Upload Audio File
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="title-inp" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Meeting Session Title
              </label>
              <input
                id="title-inp"
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Sprint Sync / Design Sync"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="lang-sel" className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Primary Language Context
              </label>
              <select
                id="lang-sel"
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none transition-all"
                style={{
                  backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeTab === "record" ? (
            <button
              onClick={joinMeeting}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99]"
            >
              Join and Start Simulated Call
            </button>
          ) : (
            <div className="space-y-4">
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    await handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById("lobby-uploader")?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive ? "border-indigo-500 bg-indigo-600/10" : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                }`}
              >
                <input
                  id="lobby-uploader"
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
                  <div className="space-y-3">
                    <Volume2 className="w-8 h-8 text-indigo-400 mx-auto animate-pulse" />
                    <p className="text-white text-xs font-bold truncate max-w-[200px] mx-auto">{uploadedFile.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Duration: {formatTime(fileDuration)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-white font-semibold">Drag audio file or browse</p>
                    <p className="text-[9px] text-slate-500 font-mono">MP3, WAV, M4A, OGG, WEBM</p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <button
                  onClick={() => processAudio(uploadedFile, uploadedFile.type, fileDuration)}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Analyze and Recap Audio
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= RENDER PROCESSING STATE =================
  if (viewState === "processing") {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center text-center">
        <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
          <div className="absolute -inset-2 bg-gradient-to-tr from-indigo-500 to-sky-400 rounded-full opacity-30 animate-spin" style={{ animationDuration: "12s" }}></div>
          <div className="relative bg-slate-950 border border-indigo-500/50 p-5 rounded-full shadow-lg">
            <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
          Generating Meeting Insights
        </h3>
        <p className="text-indigo-300 text-sm font-medium mb-8 animate-pulse">
          {processingSteps[Math.min(processingStep - 1, processingSteps.length - 1)]}
        </p>

        {/* Progress bar timeline */}
        <div className="flex items-center gap-2 max-w-md w-full px-6">
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
                  <div className={`flex-1 h-[2px] transition-colors duration-500 ${processingStep > step ? "bg-emerald-500" : "bg-slate-800"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= RENDER ACTIVE MEETING STATE (Google Meet UI) =================
  return (
    <div className={`w-full bg-slate-900 overflow-hidden flex flex-col relative transition-all ${
      viewState === "meeting" ? "h-screen border-none rounded-none" : "border border-slate-800 rounded-3xl h-[580px] shadow-2xl"
    }`}>
      
      {/* Recording indicator pill top-left */}
      {isRecording && (
        <div className="absolute top-4 left-4 z-40 bg-red-600/90 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-2 animate-pulse shadow-lg">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>{isSimulatedRecording ? "SIM REC" : "REC"}: {formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Main meeting area: Video grid and Right Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left/Center: Video Conferencing Grid */}
        <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 bg-slate-950 overflow-y-auto items-stretch">
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl w-full">
            
            {/* Tile 1: User (You) */}
            <div className={`aspect-video rounded-xl bg-slate-900 border overflow-hidden flex items-center justify-center relative transition-all duration-300 ${
              isUserSpeaking ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-800"
            }`}>
              {cameraActive ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="relative">
                  {isUserSpeaking && (
                    <div className="absolute inset-0 -m-3 bg-indigo-500/10 rounded-full animate-ping"></div>
                  )}
                  <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-lg relative z-10">
                    Y
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium flex items-center gap-1.5">
                <span>You (Presenter)</span>
                {!micActive && <MicOff className="w-3 h-3 text-red-400" />}
              </div>
            </div>

            {/* Tile 2: Gemini Companion Bot */}
            <div className={`aspect-video rounded-xl bg-slate-900 border overflow-hidden flex items-center justify-center relative transition-all duration-300 ${
              isBotSpeaking || isRecording ? "border-indigo-400" : "border-slate-800"
            }`}>
              <div className="relative">
                {isRecording && (
                  <div className="absolute -inset-4 bg-indigo-500/20 rounded-full animate-pulse"></div>
                )}
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg relative z-10">
                  <Star className={`w-8 h-8 text-white ${isRecording ? "animate-spin" : ""}`} style={{ animationDuration: isRecording ? '8s' : '0s' }} />
                </div>
              </div>

              <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-indigo-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                <span>Gemini Assistant</span>
              </div>
            </div>

            {/* Tile 3: Sarah (Mock Product Lead) */}
            <div className="aspect-video rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center relative">
              <div className="w-16 h-16 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xl shadow-lg">
                S
              </div>
              <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium flex items-center gap-1.5">
                <span>Sarah (Product Lead)</span>
              </div>
            </div>

            {/* Tile 4: Marcus (Mock Engineer) */}
            <div className="aspect-video rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center relative">
              <div className="w-16 h-16 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-xl shadow-lg">
                M
              </div>
              <div className="absolute bottom-2 left-2 z-10 bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium flex items-center gap-1.5">
                <span>Marcus (Tech Lead)</span>
              </div>
            </div>

          </div>
        </div>

        {showVisualizerOverlay && (
          <div className="w-full lg:w-[460px] shrink-0 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-y-auto p-1.5 scrollbar-thin">
            <ArchitectureVisualizer activeState={visualState} />
          </div>
        )}
      </div>

        {/* Right Sidebar: Dedicated Recording and Transcription controls */}
        {sidebarOpen && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full animate-fade-in relative z-30 shrink-0">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
                Record Meeting
              </h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-md text-xs font-medium"
              >
                Hide
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto">
              
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                  <p className="text-white text-xs font-bold mb-1">
                    {meetingTitle || "Simulated Google Meet Room"}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Globe className="w-3 h-3 text-slate-600" />
                    Language: {languageHint}
                  </p>
                </div>

                {isRecording ? (
                  <div className="space-y-4">
                    {/* Active Wave Visualizer */}
                    <div className="h-20 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-2">
                      <AudioVisualizer stream={streamRef.current} isRecording={isRecording} />
                    </div>

                    <div className="text-center py-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        {isSimulatedRecording ? "Simulated Rec Time" : "Recording Time"}
                      </p>
                      <p className="text-3xl font-mono font-bold text-white mt-1">{formatTime(recordingTime)}</p>
                      <p className={`text-[9px] mt-1 uppercase font-mono ${isSimulatedRecording ? "text-amber-500 font-bold" : "text-slate-500"}`}>
                        {isSimulatedRecording ? "⚠️ Simulated (No Mic)" : "Mic feed is active"}
                      </p>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={pauseRecording}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                          isPaused
                            ? "bg-amber-500/15 border-amber-500/20 text-amber-300"
                            : "bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300"
                        }`}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        {isPaused ? "Resume" : "Pause"}
                      </button>

                      <button
                        onClick={stopRecording}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                        Stop Rec
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 border-dashed text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white font-semibold">Live Transcription Ready</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Start live recording to transcribe and summarize using Gemini AI.
                      </p>
                    </div>
                    <button
                      onClick={startRecording}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Play className="w-3.5 h-3.5 animate-pulse" />
                      Start Live Recording
                    </button>
                  </div>
                )}
              </div>

              {/* Live Transcript scrolling panel */}
              <div className="flex-1 min-h-[140px] max-h-[220px] flex flex-col mt-4 border border-slate-800 bg-slate-950/40 rounded-xl overflow-hidden">
                <div className="bg-slate-950 p-2 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-indigo-400 animate-pulse" />
                    Live Transcript Feed
                  </span>
                  <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1 py-0.5 rounded font-mono font-bold">
                    {localOnlyMode ? "Offline Local" : "Cloud Diarized"}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  {liveTranscript.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic text-center py-6">
                      {isRecording ? "Waiting for conversation... Speak now." : "Join call & start rec to view feed."}
                    </p>
                  ) : (
                    liveTranscript.map((entry, idx) => (
                      <div key={idx} className="text-[10px] leading-relaxed border-b border-slate-950/30 pb-1 last:border-0">
                        <span className={`font-bold ${
                          entry.speaker === 'You' ? 'text-indigo-400' : 
                          entry.speaker === 'Sarah' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {entry.speaker} ({entry.timestamp}):
                        </span>{' '}
                        <span className="text-slate-300">{entry.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-500 leading-relaxed flex gap-2 mt-4 shrink-0">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  Ending the call via the bottom panel will automatically terminate the recording and generate summaries.
                </p>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between select-none z-40 shrink-0">
        
        {/* Left section: time and room code */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono">
          <span>{currentTimeString}</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-300 font-semibold tracking-wider uppercase">gem-ini-meet</span>
        </div>

        {/* Center section: round media controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full border transition-all ${
              micActive
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:text-white"
                : "bg-red-600 border-red-500 text-white hover:bg-red-500"
            }`}
            title={micActive ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-3 rounded-full border transition-all ${
              cameraActive
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:text-white"
                : "bg-red-600 border-red-500 text-white hover:bg-red-500"
            }`}
            title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
          >
            {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            className="p-3 rounded-full border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            title="Present Now (Mocked)"
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          <button
            onClick={endCall}
            className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/10 active:scale-95"
            title="End Meeting"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs font-bold">End Call</span>
          </button>
        </div>

        {/* Right section: Sidebar and Visualizer toggles */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowVisualizerOverlay(!showVisualizerOverlay)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              showVisualizerOverlay
                ? "bg-indigo-600/15 border-indigo-500/25 text-indigo-400"
                : "bg-slate-850 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="Toggle Live WebRTC SFU Architecture Flow"
          >
            <Network className={`w-4 h-4 ${showVisualizerOverlay ? "text-indigo-400 animate-pulse" : "text-slate-400"}`} />
            <span>Architecture Flow</span>
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              sidebarOpen
                ? "bg-indigo-600/15 border-indigo-500/25 text-indigo-400"
                : "bg-slate-850 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Radio className={`w-4 h-4 ${isRecording ? "text-red-400 animate-pulse" : "text-indigo-400"}`} />
            <span>Rec Panel</span>
          </button>
        </div>

      </div>

    </div>
  );
}
