"use client";

import Link from "next/link";
import { Award, X } from "lucide-react";
import type { BadgeDefinition } from "@/lib/types";

interface BadgeUnlockToastProps {
  badges: BadgeDefinition[];
  onDismiss: () => void;
}

export function BadgeUnlockToast({ badges, onDismiss }: BadgeUnlockToastProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-3xl border border-[#b7dfb9] bg-[#163f2c] p-4 text-[#faf9f5] shadow-xl">
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-[#d7f27a]/80 hover:text-white"
        aria-label="Dismiss badge notification"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2f7d3a] text-[#d7f27a]">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[0.68rem] font-bold uppercase tracking-wider text-[#d7f27a]">
            {badges.length === 1 ? "Badge Unlocked!" : `${badges.length} Badges Unlocked!`}
          </div>
          <div className="mt-1 space-y-1">
            {badges.map((b) => (
              <div key={b.id} className="text-xs font-semibold">
                <span>{b.icon} </span>
                <span>{b.name}</span>{" "}
                <span className="text-[#d7f27a]">(+{b.xpReward} Eco Pts)</span>
              </div>
            ))}
          </div>
          <Link
            href="/progress"
            onClick={onDismiss}
            className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-[#d7f27a] px-3 py-1 text-[0.7rem] font-bold text-[#163f2c] hover:bg-[#e4f89c] transition"
          >
            View Progress &amp; Leaderboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
