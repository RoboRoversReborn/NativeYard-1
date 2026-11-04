"use client";

import { useState } from "react";
import { X, LogIn, AlertCircle, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { isFirebaseConfigured } from "@/lib/firebase/client";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (!isFirebaseConfigured()) {
        throw new Error("Firebase credentials are not configured in your environment.");
      }
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-[#ede7d5] bg-[#fbfaf4] p-7 shadow-2xl transition"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#163f2c] text-[#d7f27a] shadow-xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-bold tracking-tight text-[#163f2c]">
              NativeYard NJ
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d8d3bf] bg-white text-[#8b9182] hover:bg-[#ede7d5] hover:text-[#163f2c] transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-3.5 text-center">
          <h3 className="font-display text-xl font-bold text-[#163f2c] tracking-tight">
            Sign in to Save Your Yard
          </h3>
          <p className="text-xs text-[#6b7a68] leading-relaxed">
            Connect your account with Google to save photo audits, track biodiversity progress across seasons, and reload your property scans anytime.
          </p>

          {/* Benefits list */}
          <div className="rounded-2xl border border-[#ede7d5] bg-white/70 p-3.5 text-left text-xs text-[#556950] space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3f7d45] shrink-0" />
              <span>Save &amp; reload historical yard scans</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3f7d45] shrink-0" />
              <span>Track native score progress over time</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3f7d45] shrink-0" />
              <span>Organize front, back &amp; side yard areas</span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-[#e7b8a8] bg-[#fae8e1] p-3.5 text-left text-xs text-[#b6533d]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#b6533d] mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block">Sign-in Notice:</span>
                <span className="block text-[0.72rem] leading-snug">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Google Sign-in Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-[#d5cfbd] bg-white py-3 px-5 text-xs font-bold text-[#163f2c] shadow-sm hover:bg-[#f3f0e6] hover:shadow-md transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#3f7d45]" />
              ) : (
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
              )}
              <span>{loading ? "Signing in..." : "Continue with Google"}</span>
            </button>
          </div>

          <p className="text-[0.68rem] text-[#8b9182] pt-1">
            Free forever • No credit card required • Instant sign-in
          </p>
        </div>
      </div>
    </div>
  );
}
