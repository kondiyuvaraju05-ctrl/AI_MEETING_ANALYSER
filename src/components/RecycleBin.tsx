import { useState } from "react";
import { Trash2, RotateCcw, Search, Calendar, Clock, AlignLeft, Info, AlertTriangle } from "lucide-react";
import { RecordItem } from "../types";

interface RecycleBinProps {
  recycledMeetings: RecordItem[];
  onRestoreMeeting: (id: string) => void;
  onDeletePermanently: (id: string) => void;
  onEmptyBin: () => void;
}

export default function RecycleBin({
  recycledMeetings,
  onRestoreMeeting,
  onDeletePermanently,
  onEmptyBin,
}: RecycleBinProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const filteredMeetings = recycledMeetings.filter((meeting) => {
    const search = searchQuery.toLowerCase();
    const matchesTitle = meeting.title.toLowerCase().includes(search);
    const matchesPoints = meeting.points?.some((point) => point.toLowerCase().includes(search)) || false;
    return matchesTitle || matchesPoints;
  });

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header section with optional empty bin action */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Recycle Bin
          </h2>
          <p className="text-slate-400 text-xs">
            Recover deleted sessions or permanently delete them.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {recycledMeetings.length > 0 && (
            <button
              id="empty-recycle-bin-button"
              type="button"
              onClick={() => setShowEmptyConfirm(true)}
              className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Empty Bin
            </button>
          )}

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search deleted sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {recycledMeetings.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex gap-3 text-xs text-slate-400 items-start">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            Items in the Recycle Bin will remain saved in your browser cache. You can recover them at any time, or click <span className="text-white font-medium">Permanently Delete</span> to free up storage space.
          </div>
        </div>
      )}

      {/* Content Grid */}
      {filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-300 line-clamp-1">
                      {meeting.title}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-mono">{meeting.date}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRestoreMeeting(meeting.id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                      title="Restore Session"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePermanently(meeting.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Excerpt of the first transcribed point */}
                {meeting.points && meeting.points.length > 0 ? (
                  <p className="text-slate-400/80 text-xs line-clamp-2 leading-relaxed pt-1 italic">
                    • {meeting.points[0]}
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs italic">No points extracted.</p>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-800/60 mt-4 pt-3 text-xs">
                <div className="flex items-center gap-3 font-mono text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500/50" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <AlignLeft className="w-3.5 h-3.5 text-indigo-400/70" />
                    <span className="text-slate-400 font-bold">
                      {meeting.points?.length || 0}
                    </span>
                    <span>points</span>
                  </div>
                </div>

                <span className="text-[10px] bg-red-950/10 text-red-400 border border-red-950/30 font-mono font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Recycled
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800/40 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
          <div className="bg-slate-950 p-4 rounded-full border border-slate-800 text-slate-600">
            <Trash2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-300">Recycle Bin is Empty</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              {searchQuery
                ? "No deleted sessions match your search terms."
                : "When you delete a recording, it will appear here. You can recover them or delete them permanently."}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation modal for emptying the entire bin */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden space-y-4 animate-scale-up">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-3">
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Empty Recycle Bin?
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed pt-1">
              Are you sure you want to permanently delete <span className="text-white font-semibold">all {recycledMeetings.length} sessions</span> in the Recycle Bin? All transcriptions and original details will be lost forever.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                id="cancel-empty-bin-button"
                type="button"
                onClick={() => setShowEmptyConfirm(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-empty-bin-button"
                type="button"
                onClick={() => {
                  onEmptyBin();
                  setShowEmptyConfirm(false);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/10"
              >
                Permanently Empty
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
