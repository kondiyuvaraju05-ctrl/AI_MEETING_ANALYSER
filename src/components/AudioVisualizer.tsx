import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
  isMuted?: boolean;
}

export default function AudioVisualizer({ stream, isRecording, isMuted = false }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resize canvas to its actual container width and height
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);

    // If recording and stream is available, connect Web Audio
    if (isRecording && stream) {
      try {
        // Initialize AudioContext
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch((e) => console.warn("Failed to resume AudioContext:", e));
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // Smaller fftSize gives a chunkier, cooler look
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;
      } catch (err) {
        console.error("Failed to initialize Web Audio Analyser:", err);
      }
    }

    let lastVoiceState = false;

    // Drawing function
    const draw = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear the canvas
      ctx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

      if (analyser && dataArray && !isMuted) {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average audio level for voice detection
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = dataArray.length ? sum / dataArray.length : 0;
        const speakingNow = avg > 8;

        if (speakingNow !== lastVoiceState) {
          lastVoiceState = speakingNow;
          setIsVoiceActive(speakingNow);
        }

        const barCount = 32;
        const barWidth = (width / barCount) - 3;
        const minHeight = 4;

        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i] || 0;
          const percent = value / 255;
          const barHeight = Math.max(minHeight, percent * height * 0.95);

          const x = i * (barWidth + 3);
          const y = height - barHeight;

          // Create gradient for bars (green/emerald when voice detected, sky/indigo when quiet)
          const gradient = ctx.createLinearGradient(x, y, x, height);
          if (speakingNow) {
            gradient.addColorStop(0, "#34d399"); // emerald-400
            gradient.addColorStop(0.5, "#10b981"); // emerald-500
            gradient.addColorStop(1, "#059669"); // emerald-600
          } else {
            gradient.addColorStop(0, "#38bdf8"); // sky-400
            gradient.addColorStop(0.5, "#6366f1"); // indigo-500
            gradient.addColorStop(1, "#4f46e5"); // indigo-600
          }

          ctx.fillStyle = gradient;
          
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, barHeight, 4);
          } else {
            ctx.rect(x, y, barWidth, barHeight);
          }
          ctx.fill();
        }
      } else {
        setIsVoiceActive(false);
        // Ambient idle state drawing: smooth sine wave to show readiness
        ctx.strokeStyle = isMuted ? "rgba(239, 68, 68, 0.4)" : "rgba(99, 102, 241, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const time = Date.now() * 0.004;
        const amplitude = isMuted ? 2 : 8;
        const frequency = 0.05;

        for (let x = 0; x < width; x++) {
          const y = (height / 2) + Math.sin(x * frequency + time) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      resizeObserver.disconnect();

      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [stream, isRecording, isMuted]);

  return (
    <div id="visualizer-container" className="w-full h-24 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-3 left-4 flex items-center gap-1.5 z-10">
        <span className={`w-2 h-2 rounded-full ${
          isMuted ? 'bg-amber-500' : isVoiceActive ? 'bg-emerald-400 animate-ping' : isRecording ? 'bg-red-500 animate-pulse' : 'bg-indigo-400'
        }`}></span>
        <span className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${
          isMuted ? 'text-amber-400' : isVoiceActive ? 'text-emerald-400' : 'text-slate-400'
        }`}>
          {isMuted ? "Microphone Muted" : isVoiceActive ? "Voice Detected" : isRecording ? "Live Audio Monitor (Listening...)" : "Visualizer Idle"}
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}

