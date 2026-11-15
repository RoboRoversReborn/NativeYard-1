"use client";

import { Bug, Leaf, MapPin, ShieldAlert, Sparkles, Sun, X } from "lucide-react";
import { getBadgeById } from "@/lib/gamification/badges";
import type { PlantStatus, UserGamificationProfile } from "@/lib/types";

interface LeaderYardModalProps {
  leader: UserGamificationProfile | null;
  rank: number | null;
  onClose: () => void;
}

const STATUS_PILL: Record<PlantStatus, { label: string; cls: string }> = {
  keystone: { label: "⭐ Keystone", cls: "bg-[#fef7e0] text-[#8a6100] border-[#f4d87c]" },
  native: { label: "🟢 Native", cls: "bg-[#e8f5e9] text-[#2f7d3a] border-[#b7dfb9]" },
  "non-native": { label: "🔵 Non-Native", cls: "bg-[#eef4fb] text-[#2b5b84] border-[#c4d8ee]" },
  invasive: { label: "🔴 Invasive", cls: "bg-[#fdecea] text-[#b42318] border-[#f5c2be]" },
};

export function LeaderYardModal({ leader, rank, onClose }: LeaderYardModalProps) {
  if (!leader) return null;

  const locationText = [leader.city, leader.state].filter(Boolean).join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        data-demo-target="leader-modal-card"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#e2dec9] bg-[#faf9f5] p-5 sm:p-7 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-[#e2dec9] bg-white p-2 text-[#5d6b60] hover:text-[#163f2c] transition"
          aria-label="Close yard details"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Leader Header */}
        <div className="flex flex-wrap items-center gap-3 pr-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#163f2c] font-serif text-lg font-bold text-[#d7f27a]">
            #{rank ?? "—"}
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#163f2c]">
              {leader.displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#5d6b60]">
              {locationText && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#2f7d3a]" />
                  {locationText}
                </span>
              )}
              {leader.hardinessZone && (
                <span className="rounded-full bg-[#efeadd] px-2 py-0.5 font-semibold text-[#425445]">
                  Zone {leader.hardinessZone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[#e2dec9] bg-white p-3">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[#7a806e]">
              Eco Points
            </div>
            <div className="mt-0.5 font-serif text-xl font-bold text-[#163f2c]">
              {leader.ecoPoints.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl border border-[#e2dec9] bg-white p-3">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[#7a806e]">
              Best Score
            </div>
            <div className="mt-0.5 font-serif text-xl font-bold text-[#2f7d3a]">
              {leader.bestScore}/100
            </div>
          </div>
          <div className="rounded-2xl border border-[#e2dec9] bg-white p-3">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[#7a806e]">
              Avg Score
            </div>
            <div className="mt-0.5 font-serif text-xl font-bold text-[#163f2c]">
              {leader.averageScore}/100
            </div>
          </div>
          <div className="rounded-2xl border border-[#e2dec9] bg-white p-3">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[#7a806e]">
              Caterpillars
            </div>
            <div className="mt-0.5 font-serif text-xl font-bold text-[#163f2c] flex items-center gap-1">
              <Bug className="h-4 w-4 text-[#2f7d3a]" />
              {leader.caterpillarCapacity.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Earned Badges */}
        {leader.badges && leader.badges.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#5d6b60] mb-2">
              Earned Badges ({leader.badges.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {leader.badges.map((b) => {
                const def = getBadgeById(b.id);
                if (!def) return null;
                return (
                  <span
                    key={b.id}
                    title={def.description}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#b7dfb9] bg-white px-2.5 py-1 text-xs font-semibold text-[#163f2c]"
                  >
                    <span>{def.icon}</span>
                    <span>{def.name}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Yard Showcase */}
        <div className="mt-6">
          <h3 className="font-serif text-lg font-bold text-[#163f2c] flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#2f7d3a]" />
            <span>Yard Areas &amp; Planting Layout</span>
          </h3>

          {!leader.shareYardDetails ? (
            <div className="rounded-2xl border border-[#e2dec9] bg-white p-5 text-center text-xs text-[#5d6b60]">
              <ShieldAlert className="mx-auto mb-2 h-5 w-5 text-[#7a806e]" />
              This gardener has chosen to keep their detailed yard breakdown private.
            </div>
          ) : !leader.showcaseYards || leader.showcaseYards.length === 0 ? (
            <div className="rounded-2xl border border-[#e2dec9] bg-white p-5 text-center text-xs text-[#5d6b60]">
              No yard area details available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {leader.showcaseYards.map((yard) => (
                <div
                  key={yard.areaId}
                  className="rounded-2xl border border-[#e2dec9] bg-white p-4 shadow-2xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-base font-bold text-[#163f2c]">
                          {yard.areaName}
                        </h4>
                        <span className="rounded-full bg-[#f3f0e6] px-2 py-0.5 text-[0.68rem] font-semibold uppercase text-[#5d6b60]">
                          {yard.areaType}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#5d6b60]">
                        {yard.sunExposure && (
                          <span className="inline-flex items-center gap-1">
                            <Sun className="h-3.5 w-3.5 text-[#c78b00]" />
                            {yard.sunExposure.replace(/_/g, " ")}
                          </span>
                        )}
                        {yard.soilType && (
                          <span className="inline-flex items-center gap-1">
                            <Leaf className="h-3.5 w-3.5 text-[#2f7d3a]" />
                            {yard.soilType} soil
                          </span>
                        )}
                        <span>🦋 {yard.caterpillarCapacity} host spp.</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 rounded-full bg-[#163f2c] px-3 py-1 text-xs font-bold text-[#d7f27a]">
                        Score: {yard.latestScore}/100
                      </div>
                      <div className="mt-1 text-[0.68rem] text-[#7a806e]">
                        {yard.keystoneCount} keystone · {yard.nativeCount} native
                      </div>
                    </div>
                  </div>

                  {yard.photoUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[#e2dec9]">
                      <img
                        src={yard.photoUrl}
                        alt={`${leader.displayName}'s ${yard.areaName}`}
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  )}

                  {yard.plants && yard.plants.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[#7a806e] mb-1.5">
                        Key Plants in This Area
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {yard.plants.map((p) => {
                          const badge = STATUS_PILL[p.status] || STATUS_PILL["non-native"];
                          return (
                            <span
                              key={p.plantId}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold ${badge.cls}`}
                              title={`${p.scientificName}${p.lepidoptera ? ` · Supports ${p.lepidoptera} caterpillar spp.` : ""}`}
                            >
                              <span>{p.commonName}</span>
                              {p.lepidoptera ? (
                                <span className="opacity-75">({p.lepidoptera}🦋)</span>
                              ) : null}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
