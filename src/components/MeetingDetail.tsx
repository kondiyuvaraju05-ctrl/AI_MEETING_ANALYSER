import { useState } from "react";
import { ArrowLeft, Clock, Calendar, Globe, Copy, Check, Sparkles, ClipboardCheck, FileDown, Download, FileText } from "lucide-react";
import { RecordItem } from "../types";
import { jsPDF } from "jspdf";

interface MeetingDetailProps {
  meeting: RecordItem; // Simplified RecordItem
  onBack: () => void;
}

export default function MeetingDetail({ meeting, onBack }: MeetingDetailProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedKeyPoints, setCopiedKeyPoints] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    allText += `AUDIO POINTS TIMELINE\n` + meeting.points.map((p) => `• ${p}`).join("\n");
    if (meeting.transcript) {
      allText += `\n\nFULL TRANSCRIPT\n${meeting.transcript}`;
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

        // Draw professional card box for summary
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // slate-700
        
        // Wrap text leaving padding space inside the card (5mm on left and right)
        const summaryTextLines = doc.splitTextToSize(meeting.summary, contentWidth - 10);
        const textHeight = summaryTextLines.length * 5.5;
        const cardPadding = 10;
        const cardHeight = textHeight + cardPadding;

        // Check page overflow
        if (y + cardHeight > 265) {
          doc.addPage();
          y = 25;
        }

        // Draw card background
        doc.setFillColor(248, 250, 252); // slate-50 (light gray-blue fill)
        doc.rect(margin, y, contentWidth, cardHeight, "F");

        // Draw left highlight border (Indigo-500)
        doc.setFillColor(99, 102, 241);
        doc.rect(margin, y, 1.5, cardHeight, "F");

        // Print wrapped text
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
        doc.setTextColor(51, 65, 85); // slate-700

        meeting.keyPoints.forEach((point) => {
          const wrappedLines = doc.splitTextToSize(point, contentWidth - 6);
          const lineBlockHeight = wrappedLines.length * 5.5;

          if (y + lineBlockHeight > 265) {
            doc.addPage();
            y = 25;
          }

          doc.setFont("helvetica", "bold");
          doc.setTextColor(99, 102, 241); // Indigo-500
          doc.text("•", margin, y + 1);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85); // slate-700
          doc.text(wrappedLines, margin + 5, y);
          y += lineBlockHeight + 3;
        });
        y += 8;
      }

      // Render Audio Points Timeline Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text("AUDIO POINTS TIMELINE", margin, y);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700

      if (meeting.points && meeting.points.length > 0) {
        meeting.points.forEach((point, index) => {
          // Wrap bullet point text leaving space for index marker
          const wrappedLines = doc.splitTextToSize(point, contentWidth - 8);
          const lineBlockHeight = wrappedLines.length * 5.5;

          // Check overflow
          if (y + lineBlockHeight > 265) {
            doc.addPage();
            y = 25;
          }

          // Render numbered timeline marker
          doc.setFont("helvetica", "bold");
          doc.setTextColor(99, 102, 241); // Indigo-500
          doc.text(`${index + 1}.`, margin, y);

          // Render text content next to timeline number
          doc.setFont("helvetica", "normal");
          doc.setTextColor(51, 65, 85); // slate-700
          doc.text(wrappedLines, margin + 8, y);
          
          y += lineBlockHeight + 3; // spacing between timeline items
        });
      } else {
        doc.text("No timeline points extracted.", margin, y);
      }

      // Render Full Transcript Section if available
      if (meeting.transcript) {
        // Add a vertical buffer space before starting a new major section
        y += 8;
        
        // Check overflow for header
        if (y + 15 > 265) {
          doc.addPage();
          y = 25;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.text("FULL TRANSCRIPT", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // slate-700

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
          y += blockHeight + 4; // spacing between paragraphs
        });
      }

      // Add Running Footer on every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Draw thin page border divider
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.3);
        doc.line(margin, 280, pageWidth - margin, 280);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        
        // Footer left: document title
        doc.text("Meeting Summary & Key Points Report", margin, 285);
        
        // Footer center: Page numbers
        const pageText = `Page ${i} of ${totalPages}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        doc.text(pageText, (pageWidth - pageTextWidth) / 2, 285);
        
        // Footer right: Generated stamp
        const dateString = new Date().toLocaleDateString();
        const stampText = `Exported: ${dateString}`;
        const stampTextWidth = doc.getTextWidth(stampText);
        doc.text(stampText, pageWidth - margin - stampTextWidth, 285);
      }

      // Save PDF file safely
      const fileName = `${meeting.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-report.pdf`;
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
          Gemini Point Form
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

          {/* Metadata Grid */}
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

      {/* Interactive Options Callout Panel */}
      {meeting.points && meeting.points.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950/30 to-sky-950/20 border border-indigo-500/15 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Document Delivery Actions
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Save or distribute your point-form transcript instantly. Copy everything to clipboard or compile into a polished PDF report.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            {/* Copy All Button */}
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
                  Copied Report!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-400" />
                  Copy Full Report
                </>
              )}
            </button>

            {/* Export PDF Button */}
            <button
              id="export-pdf-button"
              onClick={exportToPdf}
              disabled={exporting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/10 border border-indigo-500/35"
            >
              <FileDown className="w-4 h-4" />
              {exporting ? "Generating PDF..." : "Export to PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Recording Summary Section */}
      {meeting.summary && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Recording Summary
              </h2>
              <p className="text-slate-400 text-xs">
                Concise and well-structured summary of the conversation.
              </p>
            </div>
            
            <button
              onClick={copySummary}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copiedSummary
                  ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white"
              }`}
              title="Copy summary text"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Summary!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Summary
                </>
              )}
            </button>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-indigo-500/40">
            {meeting.summary}
          </p>
        </div>
      )}

      {/* Key Takeaways Section */}
      {meeting.keyPoints && meeting.keyPoints.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Key Points
              </h2>
              <p className="text-slate-400 text-xs">
                Essential takeaways, action items, and main decisions.
              </p>
            </div>
            
            <button
              onClick={copyKeyPoints}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copiedKeyPoints
                  ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white"
              }`}
              title="Copy key points text"
            >
              {copiedKeyPoints ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Key Points!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Key Points
                </>
              )}
            </button>
          </div>

          <ul className="space-y-3.5 pl-1.5 text-sm text-slate-300">
            {meeting.keyPoints.map((point, index) => (
              <li key={index} className="flex gap-2.5 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                <span className="leading-relaxed flex-1">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audio Points Timeline */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-400" />
              Audio Points Timeline
            </h2>
            <p className="text-slate-400 text-xs">
              Chronological statements showing the sequence of events as they were spoken.
            </p>
          </div>
        </div>

        {/* The List */}
        {meeting.points && meeting.points.length > 0 ? (
          <div className="space-y-4">
            {meeting.points.map((point, index) => (
              <div
                key={index}
                className="group flex gap-4 items-start bg-slate-950/30 border border-slate-800/60 hover:border-slate-800 hover:bg-slate-900/40 p-4 rounded-xl transition-all"
              >
                {/* Custom Point-form bullet marker */}
                <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-xs select-none">
                  {index + 1}
                </div>

                {/* Point text */}
                <p className="text-slate-200 text-sm leading-relaxed flex-1 pt-0.5">
                  {point}
                </p>

                {/* Individual point copy button */}
                <button
                  onClick={() => copyToClipboard(point, index)}
                  className="p-1.5 text-slate-500 hover:text-white rounded-md hover:bg-slate-800 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
                  title="Copy point to clipboard"
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
          <div className="text-center py-12 text-slate-500 text-sm">
            No text could be extracted in point form from this recording.
          </div>
        )}
      </div>

      {/* Full Transcript Section */}
      {meeting.transcript && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Full Transcript
              </h2>
              <p className="text-slate-400 text-xs">
                Detailed dialogue and speech transcribed directly from the audio file.
              </p>
            </div>
            
            <button
              onClick={copyTranscript}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copiedTranscript
                  ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                  : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white"
              }`}
              title="Copy transcript text"
            >
              {copiedTranscript ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied Transcript!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Transcript
                </>
              )}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-indigo-500/40">
              {meeting.transcript}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
