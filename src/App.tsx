import { useState, useEffect } from "react";
import { Mic, History, Sparkles, X, Trash2, CheckCircle2, LayoutDashboard, LogOut, Radio, ClipboardList, Sun, Moon } from "lucide-react";
import { RecordItem } from "./types";
import MeetingRecorder from "./components/MeetingRecorder";
import MeetingHistory from "./components/MeetingHistory";
import MeetingDetail from "./components/MeetingDetail";
import RecycleBin from "./components/RecycleBin";
import LoginScreen from "./components/LoginScreen";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

// Initial Seed Record to showcase the point-form format on first launch
const SEED_RECORDS: RecordItem[] = [
  {
    id: "seed-project-genesis-kickoff",
    title: "Project Genesis Technical Kickoff",
    date: "Wednesday, July 1, 2026 at 02:30 PM",
    duration: 245,
    category: "Engineering",
    points: [
      "Sarah welcomed the team to the Project Genesis Technical Kickoff to align on core architecture.",
      "Marcus proposed utilizing a relational database model for core transaction state.",
      "Elena confirmed that a modular React + Express server structure delivers low-latency performance.",
      "The team agreed to deploy Gemini 3.5-flash server-side for secure meeting transcription."
    ],
    summary: "Sarah welcomed the team to the Project Genesis Technical Kickoff to align on core architecture. The team agreed to use a relational database for core transaction state, React + Express modular backend, and Gemini 3.5-flash server-side for secure meeting transcription.",
    keyPoints: [
      "ACID-compliant relational database model will be used for transactions.",
      "Application architecture consists of a React frontend and modular Express backend.",
      "Gemini 3.5-flash will be deployed server-side for transcription and summaries."
    ],
    transcript: "Sarah: Hello everyone, welcome to the technical kickoff for Project Genesis. Our goal today is to align on the core architecture and establish our deliverables for Sprint 1. Marcus, do you want to start with the database design?\n\nMarcus: Sure, Sarah. For the core transaction state, I highly recommend using a relational database model to guarantee data integrity.\n\nElena: On the application side, I propose a modular React frontend communicating with an Express backend server.",
    languageHint: "English",
    actionItems: [
      { task: "Set up the deployment environment and container configuration", owner: "Elena", deadline: "Friday EOD", completed: true },
      { task: "Complete initial relational database schemas and migration scripts", owner: "Marcus", deadline: "Next Wednesday", completed: false }
    ],
    emailDraft: "Hi Team,\n\nHere is a recap of our Technical Kickoff:\n- Relational DB model selected for core state.\n- React + Express modular architecture approved.\n- Gemini 3.5-flash deployed server-side.\n\nAction Items:\n- Elena: Set up container deployment\n- Marcus: Complete relational DB schemas\n\nBest regards,\nAI Meeting Assistant",
    isDeleted: false
  },
  {
    id: "seed-marketing-q3-strategy",
    title: "Q3 Product Marketing Strategy Sync",
    date: "Monday, August 3, 2026 at 11:15 AM",
    duration: 180,
    category: "Marketing",
    points: [
      "Alex presented the Q3 launch schedule for the AI Meeting Assistant platform.",
      "David reviewed customer acquisition channels and landing page conversion targets.",
      "The team agreed to highlight manual note fallback and 11-language translation features."
    ],
    summary: "Marketing sync focused on Q3 video marketing campaigns, social media assets, and positioning the platform's unique manual entry and 11-language translation capabilities.",
    keyPoints: [
      "Q3 product launch scheduled for late August.",
      "Highlight 11-language translation engine in marketing materials."
    ],
    transcript: "Alex: We are launching our Q3 video ads next week. David, have you reviewed the landing copy?\nDavid: Yes, the focus on manual notes fallback and translation is spot-on.",
    languageHint: "English",
    actionItems: [
      { task: "Finalize social media copy and ad creatives", owner: "Alex", deadline: "Wednesday", completed: false }
    ],
    emailDraft: "Hi Marketing Team,\n\nSummary of today's sync:\n- Q3 launch on schedule.\n- Landing page highlighting multi-language capabilities approved.\n\nBest regards,\nAI Meeting Assistant",
    isDeleted: false
  }
];

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
        setMeetings(SEED_RECORDS);
      }
    } else {
      setMeetings(SEED_RECORDS);
      localStorage.setItem("meeting_recorder_summarizer_meetings", JSON.stringify(SEED_RECORDS));
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
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const saveMeetings = (updatedMeetings: RecordItem[]) => {
    setMeetings(updatedMeetings);
    localStorage.setItem("meeting_recorder_summarizer_meetings", JSON.stringify(updatedMeetings));
  };

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
    localStorage.removeItem("meeting_recorder_token");
    setRecorderViewState("lobby");
    showToast("Signed Out", "You have been logged out of the session.", "info");
  };

  const handleMeetingProcessed = (newMeeting: RecordItem) => {
    const nextMeetings = [newMeeting, ...meetings];
    saveMeetings(nextMeetings);
    setSelectedMeeting(newMeeting);
    showToast("Conversion Complete", `"${newMeeting.title}" recap dossier generated successfully.`, "success");
  };

  const handleUpdateMeeting = (updated: RecordItem) => {
    const nextMeetings = meetings.map((m) => (m.id === updated.id ? updated : m));
    saveMeetings(nextMeetings);
  };

  const handleDeleteMeeting = (id: string) => {
    const meetingToRecycle = meetings.find((m) => m.id === id);
    if (!meetingToRecycle) return;

    const nextMeetings = meetings.filter((m) => m.id !== id);
    saveMeetings(nextMeetings);

    const recycledRecord = { ...meetingToRecycle, isDeleted: true, deletedAt: new Date().toISOString() };
    const nextRecycled = [recycledRecord, ...recycledMeetings];
    saveRecycledMeetings(nextRecycled);

    if (selectedMeeting?.id === id) setSelectedMeeting(null);
    showToast("Moved to Recycle Bin", `"${meetingToRecycle.title}" moved to Recycle Bin.`, "info");
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
      showToast("Permanently Deleted", `"${deletedMeeting.title}" has been permanently removed.`, "error");
    }
    setDeleteConfirmId(null);
  };

  const handleRestoreMeeting = (id: string) => {
    const meetingToRestore = recycledMeetings.find((m) => m.id === id);
    if (!meetingToRestore) return;

    const nextRecycled = recycledMeetings.filter((m) => m.id !== id);
    saveRecycledMeetings(nextRecycled);

    const restoredRecord = { ...meetingToRestore, isDeleted: false };
    const nextMeetings = [restoredRecord, ...meetings];
    saveMeetings(nextMeetings);

    showToast("Session Restored", `"${meetingToRestore.title}" has been restored.`, "success");
  };

  const handleEmptyBin = () => {
    saveRecycledMeetings([]);
    showToast("Recycle Bin Emptied", "All deleted sessions permanently purged.", "error");
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
                AI Meeting Assistant
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
      </div>
    );
  }

  // ================= RENDER AUTHENTICATED STATE =================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Top Header Navigation */}
      {!isMeetingMode && (
        <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-indigo-600 to-sky-500 p-2.5 rounded-xl shadow-lg shadow-indigo-600/10">
                <Mic className="w-5 h-5 text-white animate-pulse" />
              </div>
              <h1 id="app-logo-title" className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                AI Meeting Assistant
                <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                  Gemini API
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-1.5 rounded-xl overflow-x-auto">
                <button
                  id="nav-dashboard-button"
                  onClick={() => { setSelectedMeeting(null); setCurrentView("dashboard"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    currentView === "dashboard" && !selectedMeeting ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </button>
                <button
                  id="nav-record-button"
                  onClick={() => { setSelectedMeeting(null); setRecorderViewState("lobby"); setCurrentView("record"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    currentView === "record" && !selectedMeeting ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Capture & Notes</span>
                </button>
                <button
                  id="nav-history-button"
                  onClick={() => { setSelectedMeeting(null); setCurrentView("history"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    currentView === "history" && !selectedMeeting ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>History & Search</span>
                  <span className="bg-slate-950 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {meetings.length}
                  </span>
                </button>
                <button
                  id="nav-recycle-button"
                  onClick={() => { setSelectedMeeting(null); setCurrentView("recycle"); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    currentView === "recycle" && !selectedMeeting ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Recycle Bin</span>
                  {recycledMeetings.length > 0 && (
                    <span className="bg-slate-950 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {recycledMeetings.length}
                    </span>
                  )}
                </button>

                <div className="h-4 w-[1px] bg-slate-800 mx-1 shrink-0"></div>
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-all shrink-0"
                >
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0">
                <div className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-300 text-xs font-mono truncate max-w-[100px]" title={userEmail}>
                  {userEmail}
                </span>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-all p-0.5">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content View */}
      <main className={`flex-1 w-full ${isMeetingMode ? "max-w-none p-0" : "max-w-5xl mx-auto px-4 py-8"}`}>
        {selectedMeeting ? (
          <MeetingDetail
            meeting={selectedMeeting}
            onBack={() => { setSelectedMeeting(null); setCurrentView("history"); }}
            onUpdateMeeting={handleUpdateMeeting}
          />
        ) : (
          <div>
            {currentView === "dashboard" ? (
              <AnalyticsDashboard meetings={meetings} />
            ) : currentView === "record" ? (
              <MeetingRecorder
                onMeetingProcessed={handleMeetingProcessed}
                onViewStateChange={setRecorderViewState}
                localOnlyMode={localOnlyMode}
                onRecordingStatusChange={(active, duration) => {
                  setIsRecordingActive(active);
                  setRecordingDuration(duration);
                }}
              />
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

      {/* Permanent Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete Record?</h3>
                <p className="text-slate-400 text-xs mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/10"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border rounded-2xl shadow-2xl p-4 flex items-center gap-3.5 max-w-sm border-l-4 ${
            toast.type === "error" ? "border-l-red-500" : toast.type === "success" ? "border-l-emerald-500" : "border-l-indigo-500"
          }`}
        >
          <div className="flex-1 space-y-0.5 pr-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{toast.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-500 hover:text-slate-300 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
