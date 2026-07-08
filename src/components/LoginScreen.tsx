import React, { useState, useRef, useEffect } from "react";
import { Mail, Key, Check, AlertCircle, Sparkles, ArrowRight, Lock, UserCheck, RefreshCw, X, Radio } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Clear toast after timeout
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      // Generate a random 6 digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setStep("otp");
      setIsLoading(false);
      setShowToast(true);
    }, 1200);
  };

  const handleResendOtp = () => {
    setError(null);
    setOtp(["", "", "", "", "", ""]);
    setIsLoading(true);
    
    setTimeout(() => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setIsLoading(false);
      setShowToast(true);
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const codeStr = otp.join("");
    if (codeStr.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (codeStr === generatedOtp) {
        setIsLoading(false);
        setShowToast(false);
        onLoginSuccess(email);
      } else {
        setIsLoading(false);
        setError("Invalid verification code. Please check the code and try again.");
      }
    }, 1000);
  };

  // OTP Input cursor controls
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return; // only allow numbers

    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-advance cursor
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Clear previous input and focus it
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // Polish: Support pasting 6-digit OTP codes directly
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (pastedData.length === 6 && !isNaN(Number(pastedData))) {
      const digits = pastedData.split("");
      setOtp(digits);
      // Focus last input box
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative">
      
      {/* Floating Simulated Email OTP Notification Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl animate-fade-in flex items-start gap-3 border-l-4 border-l-indigo-500">
          <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1 pr-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Simulated Mail Server
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We simulated sending an OTP to <span className="text-white font-semibold font-mono">{email}</span>.
            </p>
            <div className="bg-slate-950 border border-slate-800 p-2 rounded-lg text-center mt-2">
              <span className="text-[10px] text-slate-500 block font-mono">TEST VERIFICATION CODE</span>
              <span className="text-xl font-bold font-mono tracking-widest text-indigo-400">{generatedOtp}</span>
            </div>
          </div>
          <button
            onClick={() => setShowToast(false)}
            className="text-slate-500 hover:text-slate-300 p-1 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Login Card container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow Details */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {step === "email" ? (
          /* ================= EMAIL STEP ================= */
          <form onSubmit={handleSendOtp} className="space-y-6 relative">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-2 shadow-inner">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome to Meeting Hub</h2>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                Enter your email address below. We'll send you a One-Time Passcode (OTP) to log in instantly.
              </p>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-2xl p-3 flex gap-2.5 text-xs animate-fade-in">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="you@example.com"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-650 transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-850 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Generating Code...
                </>
              ) : (
                <>
                  <span>Send Passcode</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= OTP STEP ================= */
          <form onSubmit={handleVerifyOtp} className="space-y-6 relative">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl mb-2 shadow-inner">
                <Key className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Verify Identity</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                We sent a 6-digit passcode to <br />
                <span className="text-white font-semibold font-mono">{email}</span>.
              </p>
              <button
                type="button"
                onClick={() => { setStep("email"); setError(null); }}
                className="text-[10px] text-indigo-400 hover:underline font-semibold"
              >
                Change Email
              </button>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-900/60 text-red-300 rounded-2xl p-3 flex gap-2.5 text-xs animate-fade-in">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            {/* 6 Digit Inputs Box Wrapper */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center block">
                Enter 6-Digit Passcode
              </label>
              <div className="flex gap-2.5 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isLoading}
                    className="w-12 h-12 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-center text-lg font-bold font-mono text-white outline-none transition-all shadow-inner"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-850 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Checking Passcode...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-white" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading}
                className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resend Passcode
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
