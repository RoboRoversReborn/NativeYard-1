"use client";

import { useState } from "react";
import { X, LogIn, Mail, Lock, AlertCircle, CheckCircle, UserPlus } from "lucide-react";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setMsg(null);
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured in .env.local yet.");
      }
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to sign in with Google." });
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    try {
      setLoading(true);
      setMsg(null);
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase is not configured in .env.local yet.");
      }

      if (isSignUp) {
        await signUpWithEmail(email, password);
        setMsg({ type: "success", text: "Account created successfully!" });
      } else {
        await signInWithEmail(email, password);
        setMsg({ type: "success", text: "Signed in successfully!" });
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      let friendlyText = err.message || "Authentication failed.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        friendlyText = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        friendlyText = "An account with this email already exists. Try signing in.";
      } else if (err.code === "auth/weak-password") {
        friendlyText = "Password should be at least 6 characters.";
      }
      setMsg({ type: "error", text: friendlyText });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ede7d5] bg-[#fbfaf4] shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ede7d5] bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#163f2c] text-[#d7f27a]">
              {isSignUp ? <UserPlus className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
            </span>
            <h3 className="font-bold text-sm text-[#163f2c]">
              {isSignUp ? "Create NativeYard Account" : "Sign in to NativeYard NJ"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#8b9182] hover:bg-[#ede7d5] hover:text-[#163f2c]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#6b7a68] leading-relaxed">
            Save your yard audits, track native biodiversity over seasons, and manage front & backyard conservation roadmaps.
          </p>

          {msg && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs font-medium border ${
                msg.type === "success"
                  ? "border-[#3f7d45]/30 bg-[#3f7d45]/10 text-[#163f2c]"
                  : "border-[#b6533d]/30 bg-[#b6533d]/10 text-[#b6533d]"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-[#3f7d45]" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-[#b6533d]" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#ede7d5] bg-white py-2.5 px-4 text-xs font-bold text-[#163f2c] shadow-xs hover:bg-[#ede7d5]/30 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ede7d5]" />
            </div>
            <span className="relative bg-[#fbfaf4] px-3 text-[11px] font-semibold text-[#8b9182]">
              or with email &amp; password
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#556950] mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-[#8b9182]" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 pl-9 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#556950] mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-[#8b9182]" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 pl-9 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn w-full bg-[#163f2c] text-[#d7f27a] font-bold py-2.5 text-xs hover:bg-[#1e4d37] transition shadow-xs"
            >
              {loading
                ? "Processing..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="pt-2 text-center text-xs text-[#7a806e]">
            {isSignUp ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setMsg(null);
                  }}
                  className="font-bold text-[#163f2c] hover:underline"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setMsg(null);
                  }}
                  className="font-bold text-[#163f2c] hover:underline"
                >
                  Create one free
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
