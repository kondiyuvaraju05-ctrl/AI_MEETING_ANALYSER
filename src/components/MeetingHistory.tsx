import { useState } from "react";
import { Search, Calendar, Clock, ArrowRight, Trash2, Clipboard, AlignLeft } from "lucide-react";
import { RecordItem } from "../types";

interface MeetingHistoryProps {
  meetings: RecordItem[];
  onSelectMeeting: (meeting: RecordItem) => void;
  onDeleteMeeting: (id: string) => void;
}

export default function MeetingHistory({ meetings, onSelectMeeting, onDeleteMeeting }: MeetingHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}m ${remainingSecs}s`;
  };

  const filteredMeetings = meetings.filter((meeting) => {
    const search = searchQuery.toLowerCase();
    const matchesTitle = meeting.title.toLowerCase().includes(search);
    const matchesPoints = meeting.points?.some((point) => point.toLowerCase().includes(search)) || false;
    return matchesTitle || matchesPoints;
  });

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Saved Sessions & Points
          </h2>
          <p className="text-slate-400 text-xs">
            Review and copy previously transcribed point-form sessions.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search titles or transcript points..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:translate-y-[-2px] transition-all relative overflow-hidden group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3
                      onClick={() => onSelectMeeting(meeting)}
                      className="text-base font-bold text-white group-hover:text-indigo-400 cursor-pointer transition-colors line-clamp-1"
                    >
                      {meeting.title}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-mono">{meeting.date}</p>
                  </div>

                  <button
                    onClick={() => onDeleteMeeting(meeting.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Short excerpt of the first transcribed point */}
                {meeting.points && meeting.points.length > 0 ? (
                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed pt-1">
                    • {meeting.points[0]}
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs italic">No points extracted.</p>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-slate-800/80 mt-4 pt-3 text-xs">
                <div className="flex items-center gap-3 font-mono text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500/70" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-slate-300 font-bold">
                      {meeting.points?.length || 0}
                    </span>
                    <span>points</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectMeeting(meeting)}
                  className="flex items-center gap-1 text-indigo-400 hover:text-white font-semibold transition-colors"
                >
                  View Points
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
            <h3 className="text-base font-semibold text-white">No Conversions Found</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              {searchQuery
                ? "We couldn't find any results matching your search terms. Try searching for other words."
                : "No recordings or audio transcriptions yet. Start recording above!"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
