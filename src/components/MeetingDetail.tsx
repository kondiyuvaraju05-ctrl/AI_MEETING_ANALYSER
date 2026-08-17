import { useState } from "react";
import { ArrowLeft, Clock, Calendar, Globe, Copy, Check, Sparkles, FileDown, Download, FileText, CheckCircle2, Mail, RefreshCw, Tag } from "lucide-react";
import { RecordItem } from "../types";
import { jsPDF } from "jspdf";

interface MeetingDetailProps {
  meeting: RecordItem;
  onBack: () => void;
  onUpdateMeeting?: (updated: RecordItem) => void;
}

export default function MeetingDetail({ meeting, onBack, onUpdateMeeting }: MeetingDetailProps) {
  const [currentMeeting, setCurrentMeeting] = useState<RecordItem>(meeting);
  const [activeTab, setActiveTab] = useState<"summary" | "keypoints" | "actionitems" | "email" | "transcript">("summary");
  
  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProvider, setTranslationProvider] = useState<string | null>(null);

  // Copy states
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const languages = [
    "English", "Spanish", "French", "German", "Mandarin",
    "Japanese", "Hindi", "Portuguese", "Italian", "Russian", "Arabic"
  ];

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  // Toggle Action Item Checkbox
  const toggleActionItem = (index: number) => {
    if (!currentMeeting.actionItems) return;
    const updatedItems = [...currentMeeting.actionItems];
    updatedItems[index] = {
      ...updatedItems[index],
      completed: !updatedItems[index].completed,
    };
    const updated = { ...currentMeeting, actionItems: updatedItems };
    setCurrentMeeting(updated);
    onUpdateMeeting?.(updated);
  };

  // Execute 11-Language Translation API with Fallback
  const handleTranslate = async (targetLang: string) => {
    if (targetLang === selectedLanguage) return;
    setSelectedLanguage(targetLang);

    if (targetLang === "English" && meeting.languageHint === "English") {
      setCurrentMeeting(meeting);
      setTranslationProvider(null);
      return;
    }

    setIsTranslating(true);
    setTranslationProvider(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLanguage: targetLang,
          summary: currentMeeting.summary,
          transcript: currentMeeting.transcript,
          keyPoints: currentMeeting.keyPoints,
          actionItems: currentMeeting.actionItems,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Translation server error (${response.status}): ${responseText.slice(0, 100) || response.statusText}`);
      }
      if (!response.ok || !data.translated) {
        throw new Error(data.error || "Translation failed.");
      }

      setCurrentMeeting((prev) => ({
        ...prev,
        summary: data.translated.summary || prev.summary,
        transcript: data.translated.transcript || prev.transcript,
        keyPoints: data.translated.keyPoints || prev.keyPoints,
        actionItems: data.translated.actionItems || prev.actionItems,
      }));
      setTranslationProvider(data.provider || "Translation Service");
    } catch (err: any) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const copyEmail = () => {
    const text = currentMeeting.emailDraft || `Subject: Recap for ${currentMeeting.title}\n\nSummary:\n${currentMeeting.summary}`;
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const copySummary = () => {
    if (!currentMeeting.summary) return;
    navigator.clipboard.writeText(currentMeeting.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const exportToTxt = () => {
    let text = `${currentMeeting.title.toUpperCase()}\n`;
    text += `Date: ${currentMeeting.date}\nDuration: ${formatDuration(currentMeeting.duration)}\nCategory: ${currentMeeting.category || "General"}\n\n`;
    text += `SUMMARY:\n${currentMeeting.summary || ""}\n\n`;
    text += `KEY POINTS:\n` + (currentMeeting.keyPoints || []).map((p) => `• ${p}`).join("\n") + `\n\n`;
    text += `ACTION ITEMS:\n` + (currentMeeting.actionItems || []).map((a) => `• [${a.completed ? "X" : " "}] ${a.task} (${a.owner} - ${a.deadline})`).join("\n") + `\n\n`;
    text += `TRANSCRIPT:\n${currentMeeting.transcript || ""}\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentMeeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-recap.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(16);
      doc.text(currentMeeting.title, 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.text(`Date: ${currentMeeting.date} | Duration: ${formatDuration(currentMeeting.duration)}`, 14, y);
      y += 12;

      if (currentMeeting.summary) {
        doc.setFontSize(12);
        doc.text("Executive Summary", 14, y);
        y += 6;
        doc.setFontSize(10);
        const splitSummary = doc.splitTextToSize(currentMeeting.summary, 180);
        doc.text(splitSummary, 14, y);
        y += splitSummary.length * 5 + 8;
      }

      if (currentMeeting.actionItems && currentMeeting.actionItems.length > 0) {
        doc.setFontSize(12);
        doc.text("Action Items", 14, y);
        y += 6;
        doc.setFontSize(10);
        currentMeeting.actionItems.forEach((item) => {
          doc.text(`• [${item.completed ? "X" : " "}] ${item.task} - Owner: ${item.owner} (${item.deadline})`, 14, y);
          y += 6;
        });
      }

      doc.save(`${currentMeeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-dossier.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sessions</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToTxt}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>TXT</span>
          </button>
          <button
            onClick={exportToPdf}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Dossier Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Title & Metadata */}
        <div className="space-y-3 border-b border-slate-800 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider">
              {currentMeeting.category || "General"}
            </span>
            <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-mono">
              {currentMeeting.inputMode === "manual" ? "Manual Notes Entry" : "Audio Capture"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {currentMeeting.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentMeeting.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{formatDuration(currentMeeting.duration)}</span>
            </div>
          </div>
        </div>

        {/* 11-Language Translation Selector */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="font-bold">11-Language Engine:</span>
            {isTranslating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
            {translationProvider && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Via {translationProvider}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => handleTranslate(e.target.value)}
              disabled={isTranslating}
              className="bg-slate-900 border border-slate-800 text-xs font-bold text-white px-3 py-1.5 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Five Tab Navigation */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "summary" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab("keypoints")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "keypoints" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Key Takeaways
          </button>
          <button
            onClick={() => setActiveTab("actionitems")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "actionitems" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Action Items ({currentMeeting.actionItems?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1 ${
              activeTab === "email" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Follow-up Email</span>
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "transcript" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            Transcript
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. Summary */}
        {activeTab === "summary" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Executive Summary
              </h3>
              <button
                onClick={copySummary}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
              {currentMeeting.summary || "No summary available for this record."}
            </p>
          </div>
        )}

        {/* 2. Key Takeaways */}
        {activeTab === "keypoints" && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Key Takeaways
            </h3>
            <ul className="space-y-2.5">
              {(currentMeeting.keyPoints || currentMeeting.points || []).map((kp, idx) => (
                <li key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-200 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. Action Items with Completion Checkboxes */}
        {activeTab === "actionitems" && (
          <div className="space-y-3 animate-fade-in">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Action Items & Assignments
            </h3>
            {!currentMeeting.actionItems || currentMeeting.actionItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4">No action items were assigned in this meeting.</p>
            ) : (
              <div className="space-y-2.5">
                {currentMeeting.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => toggleActionItem(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                      item.completed
                        ? "bg-emerald-950/20 border-emerald-800/50 text-slate-400"
                        : "bg-slate-950 border-slate-800 text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!item.completed}
                        onChange={() => {}} // Handled by parent div onClick
                        className="w-4 h-4 mt-0.5 accent-indigo-500 rounded cursor-pointer"
                      />
                      <div className="space-y-1">
                        <p className={`text-xs font-semibold ${item.completed ? "line-through text-slate-400" : "text-white"}`}>
                          {item.task}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                          <span>Owner: <strong className="text-indigo-300">{item.owner}</strong></span>
                          <span>•</span>
                          <span>Deadline: <strong className="text-amber-300">{item.deadline}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Follow-up Email Draft */}
        {activeTab === "email" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                Automated Follow-up Email Draft
              </h3>
              <button
                onClick={copyEmail}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? "Copied Draft" : "Copy Email Draft"}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {currentMeeting.emailDraft ||
                `Subject: Meeting Recap: ${currentMeeting.title}\n\nHi Team,\n\nHere is a recap of our recent session:\n\nSummary:\n${currentMeeting.summary}\n\nAction Items:\n` +
                  (currentMeeting.actionItems || []).map((a) => `- ${a.task} (Owner: ${a.owner}, Deadline: ${a.deadline})`).join("\n") +
                  `\n\nBest regards,\nAI Meeting Assistant`}
            </pre>
          </div>
        )}

        {/* 5. Full Speaker Transcript */}
        {activeTab === "transcript" && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Speaker Turn Transcript
            </h3>
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {currentMeeting.transcript || "No transcript available."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
