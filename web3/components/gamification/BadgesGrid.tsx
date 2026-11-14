"use client";

import { useMemo, useState } from "react";
import { Award, CheckCircle2, Lock } from "lucide-react";
import type { EvaluatedBadge } from "@/lib/gamification/badges";
import type { BadgeCategory, EarnedBadge } from "@/lib/types";

interface BadgesGridProps {
  evaluatedBadges: EvaluatedBadge[];
  earnedBadges: EarnedBadge[];
}

const CATEGORY_LABELS: Record<BadgeCategory | "all", string> = {
  all: "All Badges",
  getting_started: "Getting Started",
  ecological: "Ecological Impact",
  progress: "Progress Over Time",
};

export function BadgesGrid({ evaluatedBadges, earnedBadges }: BadgesGridProps) {
  const [category, setCategory] = useState<BadgeCategory | "all">("all");
  const earnedMap = useMemo(
    () => new Map(earnedBadges.map((b) => [b.id, b.earnedAt])),
    [earnedBadges]
  );

  const items = useMemo(() => {
    return evaluatedBadges
      .map((item) => {
        const earnedAt = earnedMap.get(item.definition.id);
        return {
          ...item,
          isEarned: item.unlocked || Boolean(earnedAt),
          earnedAt,
        };
      })
      .filter((item) => category === "all" || item.definition.category === category);
  }, [evaluatedBadges, earnedMap, category]);

  const unlockedCount = evaluatedBadges.filter(
    (b) => b.unlocked || earnedMap.has(b.definition.id)
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#163f2c] flex items-center gap-2">
              <Award className="h-5 w-5 text-[#2f7d3a]" />
              <span>Ecological Badges</span>
            </h2>
            <p className="text-xs text-[#5d6b60]">
              {unlockedCount} of {evaluatedBadges.length} badges earned · Each badge adds Eco Points to your rank.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(CATEGORY_LABELS) as Array<BadgeCategory | "all">).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  category === cat
                    ? "bg-[#163f2c] text-[#faf9f5]"
                    : "bg-[#faf9f5] text-[#5d6b60] border border-[#e2dec9] hover:text-[#163f2c]"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ definition, progress, isEarned, earnedAt }) => {
            const pct = Math.min(
              100,
              Math.round((progress.current / Math.max(1, progress.target)) * 100)
            );
            return (
              <div
                key={definition.id}
                className={`relative rounded-2xl border p-4 transition ${
                  isEarned
                    ? "border-[#b7dfb9] bg-[#f7fcf7] shadow-2xs"
                    : "border-[#e2dec9] bg-[#faf9f5]/70 opacity-85"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                        isEarned ? "bg-[#e3f5e4]" : "bg-[#efeadd] grayscale"
                      }`}
                    >
                      {definition.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#163f2c]">
                        {definition.name}
                      </h3>
                      <span className="inline-block text-[0.68rem] font-bold text-[#2f7d3a]">
                        +{definition.xpReward} Eco Pts
                      </span>
                    </div>
                  </div>

                  {isEarned ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#2f7d3a]" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-[#9aa191]" />
                  )}
                </div>

                <p className="mt-2.5 text-xs leading-relaxed text-[#5d6b60]">
                  {definition.description}
                </p>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[0.68rem] font-semibold text-[#5d6b60] mb-1">
                    <span>
                      {isEarned
                        ? earnedAt
                          ? `Earned ${new Date(earnedAt).toLocaleDateString()}`
                          : "Unlocked"
                        : `Progress: ${progress.current} / ${progress.target} ${progress.unit || ""}`}
                    </span>
                    <span>{isEarned ? "100%" : `${pct}%`}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#e6e2d3]">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isEarned ? "bg-[#2f7d3a]" : "bg-[#8ba88e]"
                      }`}
                      style={{ width: `${isEarned ? 100 : pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
