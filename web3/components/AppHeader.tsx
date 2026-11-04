"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Download, FileText, Plus, RotateCcw, ScanLine } from "lucide-react";
import { Brand } from "./brand";
import { HeaderAuth } from "./header-auth";

export type AppHeaderProps = {
  stage?: "landing" | "analyzing" | "audit" | "report" | "admin";
  user?: any;
  onHome?: () => void;
  onReset?: () => void;
  onReport?: () => void;
  onBackToAudit?: () => void;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenPropertyManager?: () => void;
  extraRightActions?: React.ReactNode;
};

export function AppHeader({
  stage = "landing",
  user,
  onHome,
  onReset,
  onReport,
  onBackToAudit,
  onDownloadPdf,
  isGeneratingPdf = false,
  onOpenAuth,
  onSignOut,
  onOpenPropertyManager,
  extraRightActions,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e2dec9]/90 bg-[#faf9f5]/92 backdrop-blur-md no-print transition-colors">
      <div className="container-shell flex h-14 sm:h-16 items-center justify-between gap-3">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-3 sm:gap-6">
          {onHome ? (
            <button
              type="button"
              onClick={onHome}
              className="flex items-center text-left hover:opacity-90 transition"
              aria-label="Back to NativeYard home"
            >
              <Brand />
            </button>
          ) : (
            <Link href="/" className="flex items-center text-left hover:opacity-90 transition" aria-label="NativeYard home">
              <Brand />
            </Link>
          )}

          {stage === "landing" && (
            <nav className="hidden items-center gap-6 text-[0.82rem] font-semibold text-[#425445] lg:flex">
              <a className="hover:text-[#163f2c] transition" href="#how-it-works">
                How it works
              </a>
              <a className="hover:text-[#163f2c] transition" href="#verdicts">
                Plant verdicts
              </a>
              <a className="hover:text-[#163f2c] transition" href="#keystone">
                Why native
              </a>
              <a className="hover:text-[#163f2c] transition" href="#audit">
                Sample yards
              </a>
              <Link
                href="/admin/plants"
                className="flex items-center gap-1 font-bold text-[#2f7d3a] hover:text-[#163f2c] transition"
              >
                <span>🌿</span>
                <span>Flora DB</span>
              </Link>
            </nav>
          )}

          {stage !== "landing" && stage !== "admin" && (
            <Link
              href="/admin/plants"
              className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-[#2f7d3a] hover:text-[#163f2c] transition"
            >
              <span>🌿</span>
              <span>Flora Database</span>
            </Link>
          )}
        </div>

        {/* Center: Stage Indicator (Audit & Report Views) */}
        {stage === "audit" && (
          <div className="hidden md:flex items-center gap-1 rounded-full border border-[#e2dec9] bg-white/80 p-1 text-[0.68rem] font-bold shadow-2xs">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[#7a806e]">
              <Check className="h-3 w-3 text-[#2f7d3a]" />
              Photo
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#163f2c] px-3 py-1 text-[#faf9f5]">
              <ScanLine className="h-3 w-3 text-[#d7f27a]" />
              Yard Audit
            </span>
            {onReport && (
              <button
                type="button"
                onClick={onReport}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[#5d6b60] hover:text-[#163f2c] transition"
              >
                <FileText className="h-3 w-3" />
                Report
              </button>
            )}
          </div>
        )}

        {stage === "report" && onBackToAudit && (
          <button
            type="button"
            onClick={onBackToAudit}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white px-3 py-1.5 text-xs font-bold text-[#5d6b60] hover:text-[#163f2c] hover:bg-[#f3f0e6] transition shadow-2xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Audit</span>
          </button>
        )}

        {/* Right: Actions & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {stage === "audit" && (
            <>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white px-3 py-1.5 text-xs font-semibold text-[#5d6b60] hover:text-[#163f2c] hover:bg-[#f3f0e6] transition shadow-2xs"
                  title="Start a new yard audit"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>New Audit</span>
                </button>
              )}
              {onReport && (
                <button
                  type="button"
                  onClick={onReport}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#163f2c] px-3.5 py-1.5 text-xs font-bold text-[#faf9f5] hover:bg-[#20523a] transition shadow-xs"
                >
                  <span>Report</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}

          {stage === "report" && (
            <>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white px-3 py-1.5 text-xs font-semibold text-[#5d6b60] hover:text-[#163f2c] hover:bg-[#f3f0e6] transition shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Start Over</span>
                </button>
              )}
              {onDownloadPdf && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#163f2c] px-3.5 py-1.5 text-xs font-bold text-[#faf9f5] hover:bg-[#20523a] transition shadow-xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isGeneratingPdf ? "Creating PDF..." : "Export PDF"}</span>
                </button>
              )}
            </>
          )}

          {stage === "landing" && !user && (
            <a
              href="#audit"
              className="inline-flex items-center gap-1 rounded-full bg-[#163f2c] px-3.5 py-1.5 text-xs font-bold text-[#faf9f5] hover:bg-[#20523a] transition shadow-xs"
            >
              <span>Start Audit</span>
            </a>
          )}

          {extraRightActions}

          <HeaderAuth
            user={user}
            onOpenAuth={onOpenAuth}
            onSignOut={onSignOut}
            onOpenPropertyManager={onOpenPropertyManager}
          />
        </div>
      </div>
    </header>
  );
}
