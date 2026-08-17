import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, UserCheck, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [notFoundNotice, setNotFoundNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Password rules validation states
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const allConstraintsMet = hasMinLength && hasUppercase && hasLowercase && hasDigit;

  const validateEmail = (val: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(val.trim());
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateNotice(null);
    setNotFoundNotice(null);

    const normEmail = email.trim().toLowerCase();
    if (!normEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!validateEmail(normEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normEmail, password }),
      });
      const data = await response.json();

      if (response.status === 404 || data.notFound) {
        setIsLoading(false);
        setNotFoundNotice(`Account for '${normEmail}' was not found in the database. Please register your account below.`);
        setAuthMode("signup");
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      if (data.token) {
        localStorage.setItem("meeting_recorder_token", data.token);
      }
      setIsLoading(false);
      onLoginSuccess(data.user?.email || normEmail);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Failed to log in.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDuplicateNotice(null);
    setNotFoundNotice(null);

    const normEmail = email.trim().toLowerCase();
    if (!normEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!validateEmail(normEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!allConstraintsMet) {
      setError("Please fulfill all password security rules before registering.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normEmail, password }),
      });
      const data = await response.json();

      if (response.status === 409 || data.alreadyExists) {
        setIsLoading(false);
        setDuplicateNotice(data.message || `An account for ${normEmail} already exists.`);
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || "Registration failed.");
      }

      if (data.token) {
        localStorage.setItem("meeting_recorder_token", data.token);
      }
      setIsLoading(false);
      onLoginSuccess(data.user?.email || normEmail);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Registration failed.");
    }
  };

  const handleRedirectToSignIn = () => {
    setAuthMode("signin");
    setDuplicateNotice(null);
    setNotFoundNotice(null);
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative w-full">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow Background Elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Tab Header Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-2xl mb-8 border border-slate-800 relative z-10">
          <button
            type="button"
            onClick={() => { setAuthMode("signin"); setError(null); setDuplicateNotice(null); setNotFoundNotice(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              authMode === "signin"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("signup"); setError(null); setDuplicateNotice(null); setNotFoundNotice(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              authMode === "signup"
                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Header Icon & Title */}
        <div className="text-center space-y-2 mb-6 relative z-10">
          <div className="inline-flex p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-inner">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {authMode === "signin" ? "Welcome Back" : "Register Account"}
          </h2>
          <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
            {authMode === "signin"
              ? "Access your AI Meeting intelligence dashboards & session recaps."
              : "Create a secure account with hardened password protections."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/50 border border-red-800/80 text-red-200 rounded-2xl p-3.5 flex gap-2.5 text-xs animate-fade-in mb-5 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Account Not Found Alert with Switch to Register */}
        {notFoundNotice && (
          <div className="bg-sky-950/60 border border-sky-500/50 rounded-2xl p-4 space-y-2 animate-fade-in mb-5 relative z-10">
            <div className="flex items-start gap-2.5 text-sky-200 text-xs">
              <UserCheck className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-sky-300">Account Not Found in Database</h4>
                <p className="leading-relaxed text-sky-200/90 mt-0.5">{notFoundNotice}</p>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Account Alert with 1-Click Redirect */}
        {duplicateNotice && (
          <div className="bg-amber-950/60 border border-amber-600/50 rounded-2xl p-4 space-y-3 animate-fade-in mb-5 relative z-10">
            <div className="flex items-start gap-2.5 text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-300">Account Already Exists</h4>
                <p className="leading-relaxed text-amber-200/90 mt-0.5">{duplicateNotice}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRedirectToSignIn}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Sign in instead</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={authMode === "signin" ? handleSignIn : handleSignUp} className="space-y-4 relative z-10">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setDuplicateNotice(null); }}
              placeholder="name@company.com"
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 transition-all outline-none"
            />
          </div>

          {/* Password Input with Show/Hide Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-600 transition-all outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Disappearing Password Constraints Checklist for Sign Up */}
          {authMode === "signup" && !allConstraintsMet && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 transition-all duration-500 ease-in-out animate-fade-in">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Password Security Checklist
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? "text-emerald-400" : "text-slate-600"}`} />
                  <span>6+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUppercase ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase ? "text-emerald-400" : "text-slate-600"}`} />
                  <span>Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLowercase ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasLowercase ? "text-emerald-400" : "text-slate-600"}`} />
                  <span>Lowercase (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasDigit ? "text-emerald-400 font-semibold" : "text-slate-500"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasDigit ? "text-emerald-400" : "text-slate-600"}`} />
                  <span>Digit (0-9)</span>
                </div>
              </div>
            </div>
          )}

          {/* All Constraints Fulfilled Notification Badge */}
          {authMode === "signup" && allConstraintsMet && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-2.5 flex items-center gap-2 text-emerald-400 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Password satisfies all security constraints!</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || (authMode === "signup" && !allConstraintsMet)}
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-600 text-white rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-white" />
                <span>{authMode === "signin" ? "Sign In & Access Dashboard" : "Create Account"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
