import React, { useState } from "react";
import { Search, Calendar, Clock, ArrowRight, Trash2, Clipboard, AlignLeft, Sparkles, Filter, CheckCircle2 } from "lucide-react";
import { RecordItem } from "../types";

interface MeetingHistoryProps {
  meetings: RecordItem[];
  onSelectMeeting: (meeting: RecordItem) => void;
  onDeleteMeeting: (id: string) => void;
}

export default function MeetingHistory({ meetings, onSelectMeeting, onDeleteMeeting }: MeetingHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"keyword" | "semantic">("keyword");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);

  const activeMeetings = meetings.filter((m) => !m.isDeleted);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSemanticResults(null);
      return;
    }

    if (searchMode === "keyword") return;

    setIsSearchingSemantic(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          mode: "semantic",
          category: categoryFilter,
        }),
      });

      const data = await response.json();
      if (response.ok && data.results) {
        setSemanticResults(data.results);
      }
    } catch (err) {
      console.error("Semantic search error:", err);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const displayMeetings = (searchMode === "semantic" && semanticResults)
    ? semanticResults
    : activeMeetings.filter((meeting) => {
        const search = searchQuery.toLowerCase();
        const matchesCategory = categoryFilter === "All" || meeting.category === categoryFilter;

        const matchesSearch = !searchQuery.trim() ||
          meeting.title.toLowerCase().includes(search) ||
          (meeting.summary?.toLowerCase().includes(search) || false) ||
          (meeting.points?.some((point) => point.toLowerCase().includes(search)) || false) ||
          (meeting.transcript?.toLowerCase().includes(search) || false);

        return matchesCategory && matchesSearch;
      });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Saved Meeting History</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                Dual-Mode Search
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Search past meetings using instant keyword matching or Gemini semantic scoring.
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              onClick={() => { setSearchMode("keyword"); setSemanticResults(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                searchMode === "keyword" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Keyword Search
            </button>
            <button
              onClick={() => setSearchMode("semantic")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                searchMode === "semantic" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-300" />
              <span>Semantic AI</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSemanticSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder={searchMode === "semantic" ? "Enter semantic topic, query, or decision..." : "Search titles, text, action items..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchMode === "semantic") setSemanticResults(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200 px-3.5 py-2.5 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Engineering">Engineering</option>
            <option value="Marketing">Marketing</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Sales">Sales</option>
            <option value="General">General</option>
          </select>

          {searchMode === "semantic" && (
            <button
              type="submit"
              disabled={isSearchingSemantic || !searchQuery.trim()}
              className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSearchingSemantic ? "Scoring..." : "Run AI Search"}</span>
            </button>
          )}
        </form>
      </div>

      {displayMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayMeetings.map((meeting: any) => (
            <div
              key={meeting.id || meeting._id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:translate-y-[-2px] transition-all relative overflow-hidden group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                        {meeting.category || "General"}
                      </span>
                      {meeting.relevanceScore !== undefined && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono">
                          Relevance: {meeting.relevanceScore}%
                        </span>
                      )}
                    </div>
                    <h3
                      onClick={() => onSelectMeeting(meeting)}
                      className="text-base font-bold text-white group-hover:text-indigo-400 cursor-pointer transition-colors line-clamp-1"
                    >
                      {meeting.title}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-mono">{meeting.date}</p>
                  </div>

                  <button
                    onClick={() => onDeleteMeeting(meeting.id || meeting._id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Move to Recycle Bin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                  {meeting.summary || meeting.points?.[0] || "No summary available."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 mt-4 pt-3 text-xs">
                <div className="flex items-center gap-3 font-mono text-slate-500 text-[11px]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500/70" />
                    <span>{formatDuration(meeting.duration || 120)}</span>
                  </div>
                  {meeting.actionItems && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{meeting.actionItems.length} tasks</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectMeeting(meeting)}
                  className="flex items-center gap-1 text-indigo-400 hover:text-white font-semibold transition-colors"
                >
                  View Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
          <div className="bg-slate-950 p-4 rounded-full border border-slate-800 text-slate-600">
            <Clipboard className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-white">No Sessions Found</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              No matching records for your search terms or category filter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
