import { useState } from "react";
import { ArrowLeft, Clock, Calendar, Globe, Copy, Check, Sparkles, ClipboardCheck, FileDown, Download, FileText, CheckCircle2 } from "lucide-react";
import { RecordItem } from "../types";
import { jsPDF } from "jspdf";

interface MeetingDetailProps {
  meeting: RecordItem;
  onBack: () => void;
}

export default function MeetingDetail({ meeting, onBack }: MeetingDetailProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedKeyPoints, setCopiedKeyPoints] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Three-Tab navigation
  const [activeTab, setActiveTab] = useState<"summary" | "keypoints" | "overall">("summary");

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copySummary = () => {
    if (!meeting.summary) return;
    navigator.clipboard.writeText(meeting.summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const copyKeyPoints = () => {
    if (!meeting.keyPoints) return;
    const text = meeting.keyPoints.map((p) => `• ${p}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedKeyPoints(true);
    setTimeout(() => setCopiedKeyPoints(false), 2000);
  };

  const copyTranscript = () => {
    if (!meeting.transcript) return;
    navigator.clipboard.writeText(meeting.transcript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const copyAll = () => {
    let allText = `${meeting.title}\nDate: ${meeting.date}\nDuration: ${formatDuration(meeting.duration)}\n\n`;
    if (meeting.summary) {
      allText += `RECORDING SUMMARY\n${meeting.summary}\n\n`;
    }
    if (meeting.keyPoints && meeting.keyPoints.length > 0) {
      allText += `KEY POINTS\n` + meeting.keyPoints.map((p) => `• ${p}`).join("\n") + `\n\n`;
    }
    allText += `OVERALL MATTER (TIMELINE)\n` + meeting.points.map((p) => `• ${p}`).join("\n");
    if (meeting.transcript) {
      allText += `\n\nOVERALL MATTER (FULL TRANSCRIPT)\n${meeting.transcript}`;
    }
    
    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const exportToPdf = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      // Document Title Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(15, 23, 42); // slate-900 (deep dark blue)
      
      const titleLines = doc.splitTextToSize(meeting.title, contentWidth);
      let y = 25;
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 4;

      // Metadata info row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      
      const metaText = `Session Date: ${meeting.date}   |   Duration: ${formatDuration(meeting.duration)}   |   Language: ${meeting.languageHint || "Auto-detect"}`;
      doc.text(metaText, margin, y);
      y += 8;

      // Horizontal Divider
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      // Render Recording Summary Section if available
      if (meeting.summary) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text("RECORDING SUMMARY", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // slate-700
        
        const summaryTextLines = doc.splitTextToSize(meeting.summary, contentWidth - 10);
        const textHeight = summaryTextLines.length * 5.5;
        const cardPadding = 10;
        const cardHeight = textHeight + cardPadding;

        if (y + cardHeight > 265) {
          doc.addPage();
          y = 25;
        }

        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, cardHeight, "F");

        doc.setFillColor(99, 102, 241);
        doc.rect(margin, y, 1.5, cardHeight, "F");

        doc.text(summaryTextLines, margin + 5, y + 7.5);
        y += cardHeight + 12;
      }

      // Render Key Points Section if available
      if (meeting.keyPoints && meeting.keyPoints.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text("KEY POINTS", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        meeting.keyPoints.forEach((point) => {
          const wrappedLines = doc.splitTextToSize(point, contentWidth - 6);
          const lineBlockHeight = wrappedLines.length * 5.5;

          if (y + lineBlockHeight > 265) {
            doc.addPage();
            y = 25;
          }

          doc.setFont("helvetica", "bold");
          doc.setTextColor(99, 102, 241);
          doc.text("•", margin, y + 1);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(wrappedLines, margin + 5, y);
          y += lineBlockHeight + 3;
        });
        y += 8;
      }

      // Render Audio Points Timeline Section (Overall Matter)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text("OVERALL MATTER (TIMELINE)", margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);

      if (meeting.points && meeting.points.length > 0) {
        meeting.points.forEach((point, index) => {
          const wrappedLines = doc.splitTextToSize(point, contentWidth - 8);
          const lineBlockHeight = wrappedLines.length * 5.5;

          if (y + lineBlockHeight > 265) {
            doc.addPage();
            y = 25;
          }

          doc.setFont("helvetica", "bold");
          doc.setTextColor(99, 102, 241);
          doc.text(`${index + 1}.`, margin, y);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(wrappedLines, margin + 8, y);
          
          y += lineBlockHeight + 3;
        });
      } else {
        doc.text("No timeline points extracted.", margin, y);
      }

      // Render Full Transcript Section if available
      if (meeting.transcript) {
        y += 8;
        
        if (y + 15 > 265) {
          doc.addPage();
          y = 25;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text("OVERALL MATTER (FULL TRANSCRIPT)", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        const paragraphs = meeting.transcript.split("\n");
        paragraphs.forEach((paragraph) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return;

          const wrappedLines = doc.splitTextToSize(trimmed, contentWidth);
          const blockHeight = wrappedLines.length * 5.5;

          if (y + blockHeight > 265) {
            doc.addPage();
            y = 25;
          }

          doc.text(wrappedLines, margin, y);
          y += blockHeight + 4;
        });
      }

      // Add Running Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(margin, 280, pageWidth - margin, 280);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        
        doc.text("Meeting Summary & Insights Report", margin, 285);
        
        const pageText = `Page ${i} of ${totalPages}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        doc.text(pageText, (pageWidth - pageTextWidth) / 2, 285);
        
        const dateString = new Date().toLocaleDateString();
        const stampText = `Exported: ${dateString}`;
        const stampTextWidth = doc.getTextWidth(stampText);
        doc.text(stampText, pageWidth - margin - stampTextWidth, 285);
      }

      const fileName = `${meeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-recap.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF document:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Back action bar */}
      <div className="flex items-center justify-between">
        <button
          id="back-to-list-button"
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sessions
        </button>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full w-fit">
          <Sparkles className="w-3.5 h-3.5" />
          Recap Ready
        </div>
      </div>

      {/* Header Info Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-4 relative">
          <div>
            <h1 id="meeting-detail-title" className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {meeting.title}
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {meeting.date}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-slate-300">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Duration: {formatDuration(meeting.duration)}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-slate-300">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>Language: {meeting.languageHint || "Auto-detect"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons panel */}
      <div className="bg-gradient-to-r from-indigo-950/30 to-sky-950/20 border border-indigo-500/15 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <h3 className="text-sm font-bold text-indigo-300 flex items-center justify-center sm:justify-start gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Recap Delivery Actions
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Copy the full meeting dossier to clipboard or download a stylized PDF recap document.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <button
            id="copy-all-points-button"
            onClick={copyAll}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all ${
              copiedAll
                ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300"
            }`}
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied dossier!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                Copy Full recap
              </>
            )}
          </button>

          <button
            id="export-pdf-button"
            onClick={exportToPdf}
            disabled={exporting}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md border border-indigo-500/35"
          >
            <FileDown className="w-4 h-4" />
            {exporting ? "Generating PDF..." : "Export to PDF"}
          </button>
        </div>
      </div>

      {/* THREE TABS NAV CONTROL */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("summary")}
          className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === "summary"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Summary
        </button>

        <button
          onClick={() => setActiveTab("keypoints")}
          className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === "keypoints"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Key Points
        </button>

        <button
          onClick={() => setActiveTab("overall")}
          className={`flex-1 pb-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
            activeTab === "overall"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          Overall Matter
        </button>
      </div>

      {/* ACTIVE TAB CONTENT WINDOW */}
      <div className="space-y-6">
        
        {/* Tab 1: Summary */}
        {activeTab === "summary" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                  Meeting Summary
                </h2>
                <p className="text-slate-400 text-[10px]">
                  An AI-generated executive digest highlighting core topics, contexts, and outcomes.
                </p>
              </div>
              
              <button
                onClick={copySummary}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  copiedSummary
                    ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSummary ? "Copied!" : "Copy Summary"}
              </button>
            </div>

            {meeting.summary ? (
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-3.5 border-l-2 border-indigo-500/40">
                {meeting.summary}
              </p>
            ) : (
              <p className="text-xs text-slate-500 italic">No summary generated.</p>
            )}
          </div>
        )}

        {/* Tab 2: Key Points */}
        {activeTab === "keypoints" && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="space-y-0.5">
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400" />
                  Takeaways & Key Points
                </h2>
                <p className="text-slate-400 text-[10px]">
                  A bulleted breakdown of crucial takeaways, decisions, and immediate actions.
                </p>
              </div>
              
              <button
                onClick={copyKeyPoints}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  copiedKeyPoints
                    ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {copiedKeyPoints ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKeyPoints ? "Copied!" : "Copy Key Points"}
              </button>
            </div>

            {meeting.keyPoints && meeting.keyPoints.length > 0 ? (
              <ul className="space-y-3 pl-1 text-sm text-slate-300">
                {meeting.keyPoints.map((point, index) => (
                  <li key={index} className="flex gap-3 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                    <span className="leading-relaxed flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">No key points extracted.</p>
            )}
          </div>
        )}

        {/* Tab 3: Overall Matter (Transcript & Timeline) */}
        {activeTab === "overall" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Timeline Segment */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <ClipboardCheck className="w-4.5 h-4.5 text-indigo-400" />
                  Chronological Timeline
                </h2>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  Flow diagram of meeting statements presented in the exact chronological sequence.
                </p>
              </div>

              {meeting.points && meeting.points.length > 0 ? (
                <div className="space-y-3.5">
                  {meeting.points.map((point, index) => (
                    <div
                      key={index}
                      className="group flex gap-3.5 items-start bg-slate-950/20 border border-slate-800/50 hover:border-slate-800 hover:bg-slate-900/30 p-3.5 rounded-xl transition-all"
                    >
                      <div className="w-5.5 h-5.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                        {index + 1}
                      </div>
                      
                      <p className="text-slate-300 text-xs leading-relaxed flex-1 pt-0.5">
                        {point}
                      </p>

                      <button
                        onClick={() => copyToClipboard(point, index)}
                        className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-850 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        {copiedIndex === index ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No timeline points extracted.</p>
              )}
            </div>

            {/* Full Word-for-Word Transcript */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-indigo-400" />
                    Overall Matter (Full Transcript)
                  </h2>
                  <p className="text-slate-400 text-[10px] mt-0.5">
                    Word-for-word dialogue records transcribed directly from the audio file.
                  </p>
                </div>
                
                <button
                  onClick={copyTranscript}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    copiedTranscript
                      ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedTranscript ? "Copied!" : "Copy Transcript"}
                </button>
              </div>

              {meeting.transcript ? (
                <div className="max-h-[340px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap pl-3.5 border-l-2 border-indigo-500/40 font-mono">
                    {meeting.transcript}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No transcript generated.</p>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
