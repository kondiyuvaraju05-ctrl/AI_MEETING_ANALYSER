import React from "react";
import { Server, Users, ShieldAlert, Database, HelpCircle, HardDrive, Wifi, Radio, Cpu, Network } from "lucide-react";

export type VisualizerState = 
  | "idle"
  | "login"
  | "join"
  | "invite"
  | "signaling"
  | "media_sfu"
  | "gemini_process";

interface ArchitectureVisualizerProps {
  activeState: VisualizerState;
}

export default function ArchitectureVisualizer({ activeState }: ArchitectureVisualizerProps) {
  // Helpers to check active path highlights
  const isPathActive = (states: VisualizerState[]) => states.includes(activeState);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col gap-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-400" />
            Live WebRTC SFU Architecture Visualizer
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Real-time interactive rendering of the microservices signaling & media plane pipelines.
          </p>
        </div>
        
        {/* Status Indicator Badges */}
        <div className="flex gap-2">
          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase border transition-all ${
            activeState === "idle"
              ? "bg-slate-950 text-slate-500 border-slate-800"
              : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse"
          }`}>
            Status: {activeState === "idle" ? "Standby" : activeState.toUpperCase().replace("_", " ")}
          </span>
        </div>
      </div>

      {/* SVG Diagram Canvas Container */}
      <div className="relative w-full overflow-x-auto p-4 flex justify-center bg-slate-950/40 rounded-2xl border border-slate-800/60">
        <div className="min-w-[700px] h-[550px] relative text-slate-300 font-mono text-[10px] select-none">
          
          {/* Nodes Container */}

          {/* Row 1: Users */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-2.5 shadow-lg relative z-10 transition-all hover:border-slate-700">
            <Users className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="font-bold text-white text-[11px]">User Client Application</div>
              <div className="text-[9px] text-slate-500 font-sans">Web / Mobile / Desktop</div>
            </div>
          </div>

          {/* Row 2: Load Balancer */}
          <div className={`absolute top-20 left-1/2 -translate-x-1/2 w-44 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["login", "join", "invite"]) ? "border-indigo-500 shadow-indigo-600/10 ring-1 ring-indigo-500/10" : "border-slate-800"
          }`}>
            <Server className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-bold text-white text-[11px]">Load Balancer</div>
              <div className="text-[8px] text-slate-500">Reverse Proxy / Gateway</div>
            </div>
          </div>

          {/* Row 3: Microservices */}
          {/* Authentication */}
          <div className={`absolute top-36 left-4 w-44 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["login"]) ? "border-emerald-500 shadow-emerald-500/10 ring-1 ring-emerald-500/10" : "border-slate-800"
          }`}>
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-bold text-white text-[11px]">Auth Service</div>
              <div className="text-[8px] text-slate-500">Login & Session Gate</div>
            </div>
          </div>

          {/* Meeting Service */}
          <div className={`absolute top-36 left-1/2 -translate-x-1/2 w-44 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["join", "gemini_process"]) ? "border-indigo-500 shadow-indigo-500/10 ring-1 ring-indigo-500/10" : "border-slate-800"
          }`}>
            <Server className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-bold text-white text-[11px]">Meeting Service</div>
              <div className="text-[8px] text-slate-500">Rooms & summaries controller</div>
            </div>
          </div>

          {/* Notification Service */}
          <div className={`absolute top-36 right-4 w-44 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["invite"]) ? "border-amber-500 shadow-amber-500/10 ring-1 ring-amber-500/10" : "border-slate-800"
          }`}>
            <HardDrive className="w-4 h-4 text-amber-400" />
            <div>
              <div className="font-bold text-white text-[11px]">Notification Service</div>
              <div className="text-[8px] text-slate-500">Mail / Invitations Engine</div>
            </div>
          </div>

          {/* Row 4: Databases */}
          {/* SQL database */}
          <div className={`absolute top-56 left-4 w-40 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["login"]) ? "border-emerald-500 shadow-emerald-500/10" : "border-slate-800"
          }`}>
            <Database className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-bold text-white text-[10px]">User DB (SQL)</div>
              <div className="text-[8px] text-slate-500">Relational Credentials</div>
            </div>
          </div>

          {/* MongoDB database */}
          <div className={`absolute top-56 right-4 w-44 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["join", "gemini_process"]) ? "border-indigo-500 shadow-indigo-500/10" : "border-slate-800"
          }`}>
            <Database className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-bold text-white text-[10px]">Meeting DB (MongoDB)</div>
              <div className="text-[8px] text-slate-500">JSON recap documents</div>
            </div>
          </div>

          {/* Row 5: Signaling Server */}
          <div className={`absolute top-72 left-1/2 -translate-x-1/2 w-52 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["signaling"]) ? "border-indigo-400 shadow-indigo-500/10" : "border-slate-800"
          }`}>
            <Wifi className="w-4 h-4 text-indigo-400 animate-pulse" />
            <div>
              <div className="font-bold text-white text-[11px]">WebSocket Signaling Server</div>
              <div className="text-[8px] text-slate-500">SDP Relay / Socket.IO Gateway</div>
            </div>
          </div>

          {/* Row 6: WebRTC participants */}
          <div className="absolute top-96 left-1/2 -translate-x-1/2 flex gap-4 relative z-10">
            {["A", "B", "C"].map((p) => (
              <div 
                key={p} 
                className={`w-20 bg-slate-900 border p-2 rounded-xl flex flex-col items-center justify-center text-center shadow-lg transition-all ${
                  isPathActive(["signaling", "media_sfu"]) ? "border-indigo-500 shadow-indigo-500/10" : "border-slate-800"
                }`}
              >
                <Users className="w-4 h-4 text-slate-400 mb-1" />
                <span className="font-bold text-white text-[9px]">Peer {p}</span>
                <span className="text-[7px] text-slate-500">WebRTC Client</span>
              </div>
            ))}
          </div>

          {/* Row 7: STUN / TURN NAT Traversal */}
          <div className={`absolute top-[430px] left-12 w-44 bg-slate-900 border p-2 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["media_sfu"]) ? "border-indigo-500 shadow-indigo-500/10" : "border-slate-800"
          }`}>
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
            <div>
              <div className="font-bold text-white text-[10px]">STUN / TURN Server</div>
              <div className="text-[8px] text-slate-500">NAT Traversal & Relay</div>
            </div>
          </div>

          {/* Row 8: SFU Media Server */}
          <div className={`absolute top-[430px] right-12 w-48 bg-slate-900 border p-2.5 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["media_sfu", "gemini_process"]) ? "border-indigo-500 shadow-indigo-500/10 ring-1 ring-indigo-500/10" : "border-slate-800"
          }`}>
            <Cpu className="w-4.5 h-4.5 text-indigo-400" />
            <div>
              <div className="font-bold text-white text-[11px]">SFU Media Server</div>
              <div className="text-[8px] text-slate-500">Selective Forwarding Unit</div>
            </div>
          </div>

          {/* Row 9: Gemini Analyzer Engine */}
          <div className={`absolute top-[496px] right-12 w-48 bg-slate-900 border p-2 rounded-xl flex items-center gap-2 shadow-lg relative z-10 transition-all ${
            isPathActive(["gemini_process"]) ? "border-indigo-400 shadow-indigo-500/20 ring-1 ring-indigo-400/20 animate-pulse" : "border-slate-800"
          }`}>
            <Cpu className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
            <div>
              <div className="font-bold text-white text-[10px]">Meeting Recorder & Analyser</div>
              <div className="text-[8px] text-slate-400 font-bold uppercase font-sans">Gemini 3.5 Flash</div>
            </div>
          </div>

          {/* ================= BACKING SVG CONNECTOR PIPELINES ================= */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Path 1: User Client ➔ Load Balancer */}
            <path
              d="M 350,45 L 350,80"
              stroke={isPathActive(["login", "join", "invite"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["login", "join", "invite"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["login", "join", "invite"]) ? "url(#arrow-active)" : "url(#arrow)"}
              className={isPathActive(["login", "join", "invite"]) ? "stroke-dasharray-anim" : ""}
            />

            {/* Path 2: LB ➔ Auth Service */}
            <path
              d="M 262,95 L 96,95 L 96,144"
              stroke={isPathActive(["login"]) ? "#10b981" : "#334155"}
              strokeWidth={isPathActive(["login"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["login"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 3: LB ➔ Meeting Service */}
            <path
              d="M 350,116 L 350,144"
              stroke={isPathActive(["join"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["join"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["join"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 4: LB ➔ Notification Service */}
            <path
              d="M 438,95 L 604,95 L 604,144"
              stroke={isPathActive(["invite"]) ? "#f59e0b" : "#334155"}
              strokeWidth={isPathActive(["invite"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["invite"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 5: Auth Service ➔ User DB (SQL) */}
            <path
              d="M 96,180 L 96,224"
              stroke={isPathActive(["login"]) ? "#10b981" : "#334155"}
              strokeWidth={isPathActive(["login"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["login"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 6: Meeting Service ➔ Meeting DB (MongoDB) */}
            <path
              d="M 350,180 L 350,200 L 590,200 L 590,224"
              stroke={isPathActive(["join", "gemini_process"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["join", "gemini_process"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["join", "gemini_process"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 7: Meeting DB ➔ Signaling Server */}
            <path
              d="M 590,265 L 590,285 L 350,285 L 350,288"
              stroke={isPathActive(["signaling"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["signaling"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["signaling"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 8: Signaling Server ➔ Participants (Bi-directional WebSocket links) */}
            <path
              d="M 350,314 L 350,384"
              stroke={isPathActive(["signaling"]) ? "#818cf8" : "#334155"}
              strokeWidth={isPathActive(["signaling"]) ? "1.8" : "1"}
              fill="none"
            />
            <path
              d="M 350,314 L 280,384"
              stroke={isPathActive(["signaling"]) ? "#818cf8" : "#334155"}
              strokeWidth={isPathActive(["signaling"]) ? "1.8" : "1"}
              fill="none"
            />
            <path
              d="M 350,314 L 420,384"
              stroke={isPathActive(["signaling"]) ? "#818cf8" : "#334155"}
              strokeWidth={isPathActive(["signaling"]) ? "1.8" : "1"}
              fill="none"
            />

            {/* Path 9: Participants ➔ STUN/TURN */}
            <path
              d="M 280,422 L 140,430"
              stroke={isPathActive(["media_sfu"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["media_sfu"]) ? "1.8" : "1"}
              fill="none"
              markerEnd={isPathActive(["media_sfu"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 10: Participants ➔ SFU Media Server */}
            <path
              d="M 420,422 L 546,430"
              stroke={isPathActive(["media_sfu", "gemini_process"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["media_sfu", "gemini_process"]) ? "1.8" : "1"}
              fill="none"
              markerEnd={isPathActive(["media_sfu", "gemini_process"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 11: SFU Media Server ➔ Meeting Recorder / Gemini Analyser */}
            <path
              d="M 546,470 L 546,496"
              stroke={isPathActive(["gemini_process"]) ? "#818cf8" : "#334155"}
              strokeWidth={isPathActive(["gemini_process"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["gemini_process"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />

            {/* Path 12: Meeting Recorder ➔ MongoDB */}
            <path
              d="M 590,496 L 590,265"
              stroke={isPathActive(["gemini_process"]) ? "#6366f1" : "#334155"}
              strokeWidth={isPathActive(["gemini_process"]) ? "2" : "1.2"}
              fill="none"
              markerEnd={isPathActive(["gemini_process"]) ? "url(#arrow-active)" : "url(#arrow)"}
            />
          </svg>
          
        </div>
      </div>

      {/* Visualizer Interactive Control Guide */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-[11px] leading-relaxed text-slate-400 space-y-2">
        <div className="font-bold text-white flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          Interactive Path Guide
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 font-sans text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Auth Service query logs to SQL user database.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <span>Meeting Service records summaries in MongoDB.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            <span>WebSockets Signaling coordinates WebRTC SDPs.</span>
          </div>
          <div className="flex items-center gap-2 col-span-1 md:col-span-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-300"></span>
            <span>SFU routes participant voices & pipes streams to Gemini.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
