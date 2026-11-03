/* eslint-disable @next/next/no-img-element */
"use client";

import { X, Check, Camera, Upload, Sparkles, Bug, Info } from "lucide-react";
import { getStatusMeta } from "@/lib/plants";
import type { Plant, Detection } from "@/lib/types";
import type { EnrichedMacroCandidate } from "@/app/api/identify-macro/route";
import type { ObservedLeafTraits } from "@/lib/gemini";

interface MacroLeafMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  userImageUrl: string;
  observedTraits: ObservedLeafTraits | null;
  candidates: EnrichedMacroCandidate[];
  targetDetection: Detection | null;
  targetPlant: Plant | null;
  displayNumber?: number;
  onSelectCandidate: (candidate: EnrichedMacroCandidate) => void;
  onTriggerCamera: () => void;
  onTriggerUpload: () => void;
}

export function MacroLeafMatcherModal({
  isOpen,
  onClose,
  userImageUrl,
  observedTraits,
  candidates,
  targetDetection,
  targetPlant,
  displayNumber,
  onSelectCandidate,
  onTriggerCamera,
  onTriggerUpload,
}: MacroLeafMatcherModalProps) {
  if (!isOpen || !targetDetection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2.2rem] border border-[#d5cfbd] bg-[#fbfaf4] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e4d5] px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#163f2c] text-[#d7f27a]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-[1.2rem] font-semibold text-[#163f2c]">
                Visual Leaf Matcher · Plant {displayNumber ? `#${displayNumber}` : ""}
              </h3>
              <p className="text-[0.72rem] text-[#6b7a68]">
                Compare your close-up photo against candidate leaf styles and botanical specimens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: 2-Column Comparison */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Left Column: Homeowner's Close-Up & Diagnosed Traits */}
          <div className="border-b border-[#e8e4d5] bg-[#f7f4e9] p-5 lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="relative overflow-hidden rounded-2xl border border-[#d8d3bf] bg-black shadow-xs">
              <img
                src={userImageUrl}
                alt="Your plant close-up"
                className="max-h-64 w-full object-cover lg:max-h-72"
              />
              <div className="absolute bottom-2 left-2 rounded-full bg-black/65 px-3 py-1 text-[0.66rem] font-bold text-white backdrop-blur-xs">
                📸 Your Close-Up Photo
              </div>
            </div>

            {observedTraits && (
              <div className="mt-4 rounded-2xl border border-[#d9d4c4] bg-[#fbfaf4] p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#163f2c]">
                  <span>🌿</span>
                  <span>Observed Leaf Morphology</span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {observedTraits.leafType && (
                    <span className="rounded-full bg-[#edf3e3] px-2.5 py-1 text-[0.62rem] font-bold text-[#3f7d45]">
                      🍃 {observedTraits.leafType}
                    </span>
                  )}
                  {observedTraits.margin && (
                    <span className="rounded-full bg-[#fdf1d6] px-2.5 py-1 text-[0.62rem] font-bold text-[#8a6420]">
                      ✂️ {observedTraits.margin}
                    </span>
                  )}
                  {observedTraits.arrangement && (
                    <span className="rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[0.62rem] font-bold text-[#1a56db]">
                      🌿 {observedTraits.arrangement}
                    </span>
                  )}
                  {observedTraits.venation && (
                    <span className="rounded-full bg-[#fae8e1] px-2.5 py-1 text-[0.62rem] font-bold text-[#9c4634]">
                      🔀 {observedTraits.venation}
                    </span>
                  )}
                </div>

                {observedTraits.distinguishingFeatures && observedTraits.distinguishingFeatures.length > 0 && (
                  <div className="mt-3 border-t border-[#e8e4d5] pt-2.5">
                    <p className="text-[0.58rem] font-bold uppercase tracking-wider text-[#8b9182]">
                      Key Visual Clues:
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {observedTraits.distinguishingFeatures.map((clue, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[0.68rem] leading-4 text-[#5d6b60]">
                          <span className="text-[#3f7d45] font-bold">✓</span>
                          <span>{clue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onTriggerCamera}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white py-2 text-xs font-bold text-[#163f2c] shadow-xs hover:bg-[#f3f0e6]"
              >
                <Camera className="h-3.5 w-3.5 text-[#3f7d45]" />
                Retake
              </button>
              <button
                type="button"
                onClick={onTriggerUpload}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white py-2 text-xs font-bold text-[#5d6b60] shadow-xs hover:bg-[#f3f0e6]"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Other
              </button>
            </div>
          </div>

          {/* Right Column: Candidate Matches */}
          <div className="p-5 lg:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7a68]">
                Top Botanical Candidates ({candidates.length})
              </p>
              <span className="text-[0.68rem] text-[#8b9182]">
                Ranked by Pl@ntNet & Gemini confidence
              </span>
            </div>

            <div className="space-y-3">
              {candidates.map((cand, idx) => {
                const statusMeta = getStatusMeta({ status: cand.status, njStatus: cand.njStatus });
                const confPercent = Math.round(cand.confidence * 100);

                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 rounded-2xl border border-[#e4dfd0] bg-white p-4 transition hover:border-[#3f7d45] hover:shadow-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f0ede2]">
                        {cand.image ? (
                          <img
                            src={cand.image}
                            alt={cand.common}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-lg">🌱</div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded-sm bg-black/70 px-1 py-0.5 text-[0.55rem] font-bold text-white">
                          #{idx + 1}
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-display text-[0.95rem] font-bold text-[#163f2c]">
                            {cand.common}
                          </h4>
                          <span className="rounded-full bg-[#f1eee2] px-2 py-0.5 text-[0.6rem] font-bold text-[#5d6b60]">
                            {confPercent}% match
                          </span>
                        </div>
                        <p className="text-[0.72rem] italic text-[#8b9182]">{cand.sci}</p>

                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white"
                            style={{ background: statusMeta.color }}
                          >
                            {statusMeta.short}
                          </span>
                          {cand.caterpillarHosts ? (
                            <span className="flex items-center gap-0.5 text-[0.62rem] font-semibold text-[#3f7d45]">
                              <Bug className="h-3 w-3" />
                              {cand.caterpillarHosts}+ hosts
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1.5 text-[0.68rem] leading-4 text-[#5d6b60]">
                          {cand.visualDistinction}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCandidate(cand)}
                      className="btn btn-dark shrink-0 self-end px-4 py-2 text-[0.68rem] sm:self-center"
                    >
                      <Check className="h-3.5 w-3.5 text-[#d7f27a]" />
                      Select Match
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
