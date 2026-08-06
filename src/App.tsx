import { useState, useEffect } from "react";
import { Mic, History, Sparkles, X, Trash2, CheckCircle2, Info, Sun, Moon, LayoutDashboard, LogOut, Radio, ClipboardList } from "lucide-react";
import { RecordItem } from "./types";
import MeetingRecorder from "./components/MeetingRecorder";
import MeetingHistory from "./components/MeetingHistory";
import MeetingDetail from "./components/MeetingDetail";
import RecycleBin from "./components/RecycleBin";
import LoginScreen from "./components/LoginScreen";

// Default Seed Record to showcase the point-form format on first launch
const SEED_RECORD: RecordItem = {
  id: "seed-project-genesis-kickoff",
  title: "Project Genesis Technical Kickoff",
  date: "Wednesday, July 1, 2026 at 02:30 PM",
  duration: 245, // 4m 5s
  points: [
    "Sarah welcomed the team to the Project Genesis Technical Kickoff to align on core architecture and Sprint 1 targets.",
    "Marcus proposed utilizing a relational database model for core transaction state, keeping log data denormalized to avoid joins.",
    "Elena confirmed that a modular React + Express server structure delivers low-latency performance and fits container workloads.",
    "The team agreed to deploy Gemini 3.5-flash server-side for secure meeting transcription and prompt processing.",
    "Elena took the task to set up the container configuration, aiming to have a working container demo live by Friday EOD.",
    "Marcus committed to completing the initial relational schemas and schema migrations by next Wednesday."
  ],
  summary: "Sarah welcomed the team to the Project Genesis Technical Kickoff to align on core architecture and Sprint 1 targets. The team discussed and agreed to use a relational database for core transaction state while keeping log data denormalized. Elena and Marcus will lead container setup and relational schema definitions, respectively, with prototypes expected by Friday and next Wednesday.",
  keyPoints: [
    "ACID-compliant relational database model will be used for transactions.",
    "Denormalized tables will be used for logs to optimize retrieval performance.",
    "Application architecture consists of a React frontend and modular Express backend.",
    "Gemini 3.5-flash will be deployed server-side for transcription and summaries.",
    "Elena will deploy the initial container demo by this Friday EOD.",
    "Marcus will write relational schemas and migrations by next Wednesday."
  ],
  transcript: "Sarah: Hello everyone, welcome to the technical kickoff for Project Genesis. Our goal today is to align on the core architecture and establish our deliverables for Sprint 1. Marcus, do you want to start with the database design?\n\nMarcus: Sure, Sarah. For the core transaction state, I highly recommend using a relational database model to guarantee data integrity and strict ACID compliance. For log data and audits, however, we should keep it denormalized to avoid performance bottlenecks and complex SQL joins.\n\nElena: That makes sense, Marcus. On the application side, I propose a modular React frontend communicating with an Express backend server. This structure is lightweight, provides low-latency API routes, and fits neatly into containerized container workloads.\n\nSarah: Excellent. What about transcription and AI features? Are we using the Gemini API?\n\nElena: Yes. We will deploy Gemini 3.5-flash server-side. This keeps our API keys secure and allows us to send audio data directly for speech-to-text processing. I will take on the task of setting up the containerized deployment environment and hope to have a working container demo live by this Friday EOD.\n\nMarcus: Sounds perfect. I'll take the action item to complete the initial relational database schemas and write the migration scripts. I will have those ready by next Wednesday.\n\nSarah: Fantastic. Let's get to work!",
  languageHint: "English",
  actionItems: [
    { task: "Set up the containerized deployment environment and run container demo", owner: "Elena", deadline: "Friday EOD" },
    { task: "Complete initial relational database schemas and write migration scripts", owner: "Marcus", deadline: "Next Wednesday" },
    { task: "Coordinate Sprint 1 planning and check-in on demo progress", owner: "Sarah", deadline: "Friday Afternoon" }
  ],
  localOnly: false
};

export default function App() {
  const [meetings, setMeetings] = useState<RecordItem[]>([]);
  const [recycledMeetings, setRecycledMeetings] = useState<RecordItem[]>([]);
  const [currentView, setCurrentView] = useState<"dashboard" | "record" | "history" | "recycle">("dashboard");
  const [selectedMeeting, setSelectedMeeting] = useState<RecordItem | null>(null);

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("meeting_recorder_summarizer_user_email");
  });

  const [recorderViewState, setRecorderViewState] = useState<"lobby" | "meeting" | "processing">("lobby");
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [localOnlyMode, setLocalOnlyMode] = useState<boolean>(() => {
    return localStorage.getItem("meeting_recorder_local_only") === "true";
  });
  const isMeetingMode = userEmail && currentView === "record" && recorderViewState === "meeting";
  const [toast, setToast] = useState<{ title: string; message: string; type: "success" | "error" | "info" } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("meeting_recorder_summarizer_theme");
    return (saved as "dark" | "light") || "dark";
  });

  // Apply theme to document classes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === "light") {
      root.classList.add("light-mode");
      body.classList.add("light-mode");
    } else {
      root.classList.remove("light-mode");
      body.classList.remove("light-mode");
    }
    localStorage.setItem("meeting_recorder_summarizer_theme", theme);
  }, [theme]);

  // Load meetings from LocalStorage on initialization
  useEffect(() => {
    const stored = localStorage.getItem("meeting_recorder_summarizer_meetings");
    if (stored) {
      try {
        setMeetings(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to parse stored meetings:", err);
        setMeetings([SEED_RECORD]);
      }
    } else {
      // Seed default meeting on very first open
      setMeetings([SEED_RECORD]);
      localStorage.setItem("meeting_recorder_summarizer_meetings", JSON.stringify([SEED_RECORD]));
    }

    const storedRecycled = localStorage.getItem("meeting_recorder_summarizer_recycled_meetings");
    if (storedRecycled) {
      try {
        setRecycledMeetings(JSON.parse(storedRecycled));
      } catch (err) {
        console.error("Failed to parse stored recycled meetings:", err);
        setRecycledMeetings([]);
      }
    }
  }, []);

  // Auto-dismiss toast notification after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Save meetings helper
  const saveMeetings = (updatedMeetings: RecordItem[]) => {
    setMeetings(updatedMeetings);
    localStorage.setItem("meeting_recorder_summarizer_meetings", JSON.stringify(updatedMeetings));
  };

  // Save recycled meetings helper
  const saveRecycledMeetings = (updatedRecycled: RecordItem[]) => {
    setRecycledMeetings(updatedRecycled);
    localStorage.setItem("meeting_recorder_summarizer_recycled_meetings", JSON.stringify(updatedRecycled));
  };

  const showToast = (title: string, message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ title, message, type });
  };

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    localStorage.setItem("meeting_recorder_summarizer_user_email", email);
    showToast("Access Verified", `Welcome, ${email}!`, "success");
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    setUserEmail(null);
    localStorage.removeItem("meeting_recorder_summarizer_user_email");
    setRecorderViewState("lobby");
    showToast("Signed Out", "You have been logged out of the session.", "info");
  };

  const handleMeetingProcessed = (newMeeting: RecordItem) => {
    const nextMeetings = [newMeeting, ...meetings];
    saveMeetings(nextMeetings);
    setSelectedMeeting(newMeeting);
    showToast(
      "Conversion Complete",
      `"${newMeeting.title}" recap dossier generated successfully.`,
      "success"
    );
  };

  const handleDeleteMeeting = (id: string) => {
    const meetingToRecycle = meetings.find((m) => m.id === id);
    if (!meetingToRecycle) return;

    const nextMeetings = meetings.filter((m) => m.id !== id);
    saveMeetings(nextMeetings);

    const nextRecycled = [meetingToRecycle, ...recycledMeetings];
    saveRecycledMeetings(nextRecycled);

    if (selectedMeeting?.id === id) {
      setSelectedMeeting(null);
    }

    showToast(
      "Moved to Recycle Bin",
      `"${meetingToRecycle.title}" has been moved to the Recycle Bin.`,
      "info"
    );
  };

  const handleDeletePermanently = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const deletedMeeting = recycledMeetings.find((m) => m.id === deleteConfirmId);
    if (deletedMeeting) {
      const nextRecycled = recycledMeetings.filter((m) => m.id !== deleteConfirmId);
      saveRecycledMeetings(nextRecycled);
      showToast(
        "Permanently Deleted",
        `"${deletedMeeting.title}" has been permanently removed.`,
        "error"
      );
    }
    setDeleteConfirmId(null);
  };

  const handleRestoreMeeting = (id: string) => {
    const meetingToRestore = recycledMeetings.find((m) => m.id === id);
    if (!meetingToRestore) return;

    const nextRecycled = recycledMeetings.filter((m) => m.id !== id);
    saveRecycledMeetings(nextRecycled);

    const nextMeetings = [meetingToRestore, ...meetings];
    saveMeetings(nextMeetings);

    showToast(
      "Session Restored",
      `"${meetingToRestore.title}" has been restored to Saved Sessions.`,
      "success"
    );
  };

  const handleEmptyBin = () => {
    saveRecycledMeetings([]);
    showToast(
      "Recycle Bin Emptied",
      "All sessions in the Recycle Bin have been permanently deleted.",
      "error"
    );
  };

  // ================= RENDER UNAUTHENTICATED STATE =================
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-sky-500 p-2.5 rounded-xl shadow-lg shadow-indigo-600/10">
                <Mic className="w-5 h-5 text-white animate-pulse" />
              </div>
              <h1 id="app-logo-title" className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Audio to Point Form
                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                  Gemini API
                </span>
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        </main>

        {/* Global Toast Notifications */}
        {toast && (
          <div
            id="toast-notification"
            className={`fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex items-center gap-3.5 max-w-sm animate-fade-in transition-all duration-300 border-l-4 ${toast.type === "error"
                ? "border-slate-800 border-l-red-500"
                : toast.type === "success"
                  ? "border-slate-800 border-l-emerald-500"
                  : "border-slate-800 border-l-indigo-500"
              }`}
          >
            <div className="flex-1 space-y-0.5 pr-2">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              id="dismiss-toast-button"
              onClick={() => setToast(null)}
              className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= RENDER AUTHENTICATED STATE =================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Banner and Navigation */}
      {!isMeetingMode && (
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-sky-500 p-2.5 rounded-xl shadow-lg shadow-indigo-600/10">
                <Mic className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h1 id="app-logo-title" className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Audio to Point Form
                  <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                    Gemini API
                  </span>
                </h1>
              </div>
            </div>

            {/* Right Group: Nav Links + Profile initials bubble + logout */}
            <div className="flex items-center gap-3.5">

              {/* Nav Links */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 p-1.5 rounded-xl">
                <button
                  id="nav-dashboard-button"
                  onClick={() => {
                    setSelectedMeeting(null);
                    setCurrentView("dashboard");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentView === "dashboard" && !selectedMeeting
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                <button
                  id="nav-record-button"
                  onClick={() => {
                    setSelectedMeeting(null);
                    setRecorderViewState("lobby");
                    setCurrentView("record");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentView === "record" && !selectedMeeting
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  {isRecordingActive && (
                    <span className="flex h-1.5 w-1.5 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                    </span>
                  )}
                  New Recording
                  {isRecordingActive && (
                    <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/20 px-1 py-0.5 rounded font-mono ml-1 font-bold">
                      {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                </button>
                <button
                  id="nav-history-button"
                  onClick={() => {
                    setSelectedMeeting(null);
                    setCurrentView("history");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentView === "history" && !selectedMeeting
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Saved Sessions
                  <span className="bg-slate-950 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                    {meetings.length}
                  </span>
                </button>

                <button
                  id="nav-recycle-button"
                  onClick={() => {
                    setSelectedMeeting(null);
                    setCurrentView("recycle");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${currentView === "recycle" && !selectedMeeting
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Recycle Bin
                  {recycledMeetings.length > 0 && (
                    <span className="bg-slate-950 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
                      {recycledMeetings.length}
                    </span>
                  )}
                </button>

                <div className="h-4 w-[1px] bg-slate-800 mx-1 shrink-0"></div>

                <button
                  id="theme-toggle-button"
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all focus:outline-none shrink-0"
                  title={theme === "dark" ? "Switch to Light Gold & Cream Mode" : "Switch to Dark Gold & Black Mode"}
                >
                  {theme === "dark" ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </button>
              </div>

              {/* User Profile Pill Badge + Logout */}
              <div className="hidden sm:flex items-center gap-2.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0">
                <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-300 text-xs font-medium font-mono truncate max-w-[110px]" title={userEmail}>
                  {userEmail}
                </span>
                <div className="h-4.5 w-[1px] bg-slate-800/80"></div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 transition-all p-0.5 hover:bg-red-500/10 rounded"
                  title="Log Out Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full ${isMeetingMode ? "max-w-none p-0" : "max-w-4xl mx-auto px-4 py-8"}`}>
        {selectedMeeting ? (
          <div className="animate-fade-in">
            <MeetingDetail
              meeting={selectedMeeting}
              onBack={() => {
                setSelectedMeeting(null);
                setCurrentView("history");
              }}
            />
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">

            {/* Dashboard View */}
            {currentView === "dashboard" ? (
              <div className="space-y-8 animate-fade-in">
                {/* Welcome Card banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="space-y-3.5 relative">
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold px-3 py-1 rounded-full w-fit uppercase font-mono tracking-wider">
                      Meeting Manager Console
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      Welcome, <span className="text-indigo-400 font-mono text-xl md:text-2xl">{userEmail}</span>
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm max-w-xl leading-relaxed">
                      Your central workspace for recording calls and extracting automated meeting dossiers. Create simulated sessions or explore archived records using Gemini AI.
                    </p>
                  </div>
                </div>

                {/* Statistics & Settings Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Saved */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow flex flex-col justify-between">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Total Saved Sessions</span>
                    <span className="text-3xl font-extrabold text-white mt-2 font-mono">{meetings.length}</span>
                  </div>
                  
                  {/* Card 2: Recycle Bin */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow flex flex-col justify-between">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Recycle Bin Items</span>
                    <span className="text-3xl font-extrabold text-indigo-400 mt-2 font-mono">{recycledMeetings.length}</span>
                  </div>

                  {/* Card 3: Offline PWA cache */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow flex flex-col justify-between relative overflow-hidden group">
                    <div>
                      <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">Offline Cache</span>
                      <span className="text-xs font-bold text-emerald-400 mt-2.5 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PWA Cache Active
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono mt-2 block">
                      Local database access enabled offline.
                    </span>
                  </div>

                  {/* Card 4: Local-Only Processing Toggle (Privacy) */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow flex flex-col justify-between relative overflow-hidden">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Privacy & Processing</span>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-medium text-slate-300">
                        {localOnlyMode ? "🔒 Local-Only" : "☁️ Gemini Cloud"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !localOnlyMode;
                          setLocalOnlyMode(nextState);
                          localStorage.setItem("meeting_recorder_local_only", String(nextState));
                          showToast(
                            nextState ? "Local-Only Processing Enabled" : "Cloud Processing Enabled",
                            nextState 
                              ? "Transcriptions will run in-browser. Audio data will not leave your device."
                              : "Transcriptions and summaries will use secure Gemini server API.",
                            "info"
                          );
                        }}
                        className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-350 ${
                          localOnlyMode ? "bg-indigo-600 justify-end" : "bg-slate-800 justify-start"
                        }`}
                        title={localOnlyMode ? "Switch to Cloud Processing" : "Switch to Local-Only Processing"}
                      >
                        <span className="bg-white w-4 h-4 rounded-full shadow-md transition-all duration-300"></span>
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono mt-2 block">
                      {localOnlyMode ? "Maximum Privacy: Web Speech API active." : "Deep Summaries: Gemini API active."}
                    </span>
                  </div>
                </div>

                {/* Quick actions cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

                  {/* Action 1: Create audio recording */}
                  <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/35 p-6 rounded-3xl shadow-xl flex flex-col justify-between transition-all group hover:scale-[1.01]">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm md:text-base font-bold text-white group-hover:text-amber-400 transition-colors">Live Audio Recorder</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Start live audio recording with your microphone or upload an audio file. Gemini AI will automatically transcribe speech and compile point-form summaries and action items.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeeting(null);
                        setRecorderViewState("lobby");
                        setCurrentView("record");
                      }}
                      className="mt-6 w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      Launch Audio Recorder
                    </button>
                  </div>

                  {/* Action 2: History dossiers */}
                  <div className="bg-slate-900 border border-slate-800 hover:border-indigo-500/35 p-6 rounded-3xl shadow-xl flex flex-col justify-between transition-all group hover:scale-[1.01]">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm md:text-base font-bold text-white group-hover:text-indigo-400 transition-colors">Saved History & Recaps</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Review and manage your saved meeting records. Access summary digests, bullet takeaways, and full transcript texts. Export reports to PDF or copy meeting details to your clipboard.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMeeting(null);
                        setCurrentView("history");
                      }}
                      className="mt-6 w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5" />
                      Open Saved History
                    </button>
                  </div>

                </div>
              </div>
            ) : currentView === "record" ? (
              <div className={isMeetingMode ? "w-full h-full flex-1 flex flex-col" : "space-y-8"}>
                {/* Visual Intro banner */}
                {!isMeetingMode && (
                  <div className="text-center max-w-xl mx-auto space-y-3 pt-4">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      Audio to Text Point Form
                    </h2>
                  </div>
                )}
                <MeetingRecorder
                  onMeetingProcessed={handleMeetingProcessed}
                  onViewStateChange={setRecorderViewState}
                  localOnlyMode={localOnlyMode}
                  onRecordingStatusChange={(active, duration) => {
                    setIsRecordingActive(active);
                    setRecordingDuration(duration);
                  }}
                />
              </div>
            ) : currentView === "history" ? (
              <MeetingHistory
                meetings={meetings}
                onSelectMeeting={(m) => setSelectedMeeting(m)}
                onDeleteMeeting={handleDeleteMeeting}
              />
            ) : (
              <RecycleBin
                recycledMeetings={recycledMeetings}
                onRestoreMeeting={handleRestoreMeeting}
                onDeletePermanently={handleDeletePermanently}
                onEmptyBin={handleEmptyBin}
              />
            )}
          </div>
        )}
      </main>

      {/* Custom Confirmation Modal for Deletion */}
      {deleteConfirmId && (() => {
        const meetingToDelete = recycledMeetings.find(m => m.id === deleteConfirmId);
        return (
          <div
            id="delete-confirmation-modal"
            className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex items-center gap-3">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Delete Recording Session?
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed pt-1">
                Are you sure you want to permanently delete <span className="text-white font-semibold">"{meetingToDelete?.title || 'this session'}"</span>? This will remove all extracted point-form transcriptions immediately.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  id="cancel-delete-button"
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-button"
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/10"
                >
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Interactive Toast Notifications */}
      {toast && (
        <div
          id="toast-notification"
          className={`fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex items-center gap-3.5 max-w-sm animate-fade-in transition-all duration-300 border-l-4 ${toast.type === "error"
              ? "border-slate-800 border-l-red-500"
              : toast.type === "success"
                ? "border-slate-800 border-l-emerald-500"
                : "border-slate-800 border-l-indigo-500"
            }`}
        >
          <div className="flex-1 space-y-0.5 pr-2">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
              {toast.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {toast.message}
            </p>
          </div>

          <button
            id="dismiss-toast-button"
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
