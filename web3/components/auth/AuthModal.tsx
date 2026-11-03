"use client";

import { useState } from "react";
import { X, LogIn, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setMsg(null);
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to initialize Google sign in." });
      setLoading(false);
    }
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setMsg(null);
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setMsg({
        type: "success",
        text: "Check your email for the magic sign-in link!",
      });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to send magic link." });
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
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ede7d5] bg-[#fbfaf4] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ede7d5] bg-white px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#163f2c] text-white">
              <LogIn className="h-3.5 w-3.5" />
            </span>
            <h3 className="font-bold text-sm text-[#163f2c]">Sign in to NativeYard NJ</h3>
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
          <p className="text-xs text-[#8b9182] leading-relaxed">
            Save your yard audits, track invasive removal progress across multiple properties, and export seasonal conservation roadmaps.
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
              or with email
            </span>
          </div>

          {/* Email Magic Link Form */}
          <form onSubmit={handleMagicLinkSignIn} className="space-y-2.5">
            <div>
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#ede7d5] bg-white p-2.5 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#3f7d45]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn w-full bg-[#163f2c] text-[#d7f27a] font-bold py-2.5 text-xs hover:bg-[#1e4d37]"
            >
              <Mail className="h-3.5 w-3.5" />
              {loading ? "Sending link..." : "Send Magic Link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
