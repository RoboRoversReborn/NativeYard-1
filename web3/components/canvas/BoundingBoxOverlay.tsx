"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";
import { Sparkles, Trash2, Edit3, PlusCircle, Check, X, Loader2 } from "lucide-react";
import { getPlant, getStatusMeta } from "@/lib/plants";
import type { Audit, Detection, BoundingBox } from "@/lib/types";

type BoundingBoxOverlayProps = {
  audit: Audit;
  photoUrl: string;
  selectedId: string;
  orderedDetections?: Detection[];
  onSelectDetection: (id: string) => void;
  onDeleteDetection: (id: string) => void;
  onUpdateDetectionBox: (id: string, newBox: BoundingBox) => void;
  onIdentifyRegion: (box: BoundingBox, existingId?: string) => Promise<void>;
};

type Mode = "inspect" | "drawing" | "redrawing";

export function BoundingBoxOverlay({
  audit,
  photoUrl,
  selectedId,
  orderedDetections,
  onSelectDetection,
  onDeleteDetection,
  onUpdateDetectionBox,
  onIdentifyRegion,
}: BoundingBoxOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("inspect");
  const [isDragging, setIsDragging] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [draftBox, setDraftBox] = useState<BoundingBox | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);

  // Compute normalized percentage coordinates from mouse/touch event
  const getCoordinates = (e: MouseEvent | TouchEvent | any): { x: number; y: number } | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    if (mode === "inspect") return;
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDragging(true);
    setStartPoint(coords);
    setDraftBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !startPoint) return;
    const current = getCoordinates(e);
    if (!current) return;

    const x = Math.min(startPoint.x, current.x);
    const y = Math.min(startPoint.y, current.y);
    const w = Math.abs(current.x - startPoint.x);
    const h = Math.abs(current.y - startPoint.y);

    setDraftBox({ x, y, w, h });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Filter out accidental micro-clicks (< 2% size)
    if (draftBox && (draftBox.w < 2 || draftBox.h < 2)) {
      setDraftBox(null);
    }
  };

  const handleConfirmRegion = async () => {
    if (!draftBox || draftBox.w < 2 || draftBox.h < 2) return;

    try {
      setIsIdentifying(true);
      if (mode === "redrawing" && selectedId) {
        onUpdateDetectionBox(selectedId, draftBox);
        await onIdentifyRegion(draftBox, selectedId);
      } else {
        await onIdentifyRegion(draftBox);
      }
      setDraftBox(null);
      setMode("inspect");
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleCancelRegion = () => {
    setDraftBox(null);
    setMode("inspect");
  };

  const selectedDetection = audit.detections.find((d) => d.id === selectedId);

  return (
    <div className="relative w-full">
      {/* Interactive Box Editing Action Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ede7d5] bg-[#fbfaf4] p-2 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d2a21]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#163f2c] text-[10px] text-white">
            🎯
          </span>
          <span>Box Editor:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("inspect");
              setDraftBox(null);
            }}
            className={`btn px-3 py-1.5 text-xs ${
              mode === "inspect"
                ? "bg-[#163f2c] text-white shadow-sm"
                : "bg-white text-[#1d2a21] border border-[#ede7d5] hover:bg-[#ede7d5]/50"
            }`}
          >
            🖱️ Inspect
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "drawing" ? "inspect" : "drawing");
              setDraftBox(null);
            }}
            className={`btn px-3 py-1.5 text-xs ${
              mode === "drawing"
                ? "bg-[#d7f27a] text-[#163f2c] shadow-sm font-bold"
                : "bg-white text-[#1d2a21] border border-[#ede7d5] hover:bg-[#ede7d5]/50"
            }`}
            title="Draw a new box over an un-detected plant or leaf cluster"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Draw New Region
          </button>

          {selectedDetection && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "redrawing" ? "inspect" : "redrawing");
                  setDraftBox(null);
                }}
                className={`btn px-3 py-1.5 text-xs ${
                  mode === "redrawing"
                    ? "bg-[#a87a2c] text-white shadow-sm"
                    : "bg-white text-[#1d2a21] border border-[#ede7d5] hover:bg-[#ede7d5]/50"
                }`}
                title="Redraw the boundary for the currently selected plant"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Redraw Selected
              </button>

              <button
                type="button"
                onClick={() => onDeleteDetection(selectedDetection.id)}
                className="btn px-3 py-1.5 text-xs text-[#b6533d] border border-[#b6533d]/30 bg-white hover:bg-[#b6533d]/10"
                title="Remove this box and recalculate yard score"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Box
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Photo Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        className={`relative overflow-hidden rounded-2xl border border-[#ede7d5] bg-[#163f2c]/5 shadow-md select-none ${
          mode !== "inspect" ? "cursor-crosshair" : "cursor-default"
        }`}
        style={{ minHeight: "340px" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Yard landscape"
          className="block w-full h-auto object-contain select-none pointer-events-none"
        />

        {/* Existing Detections - aligned 1:1 with sidebar "Plants in this frame" */}
        {(orderedDetections || audit.detections).map((detection, index) => {
          const plant = getPlant(detection.plantId) || {
            id: detection.plantId,
            commonName: (detection as any).commonName || detection.plantId.replace(/-/g, " "),
            scientificName: (detection as any).scientificName || detection.plantId,
            status: "native" as const,
            type: "Perennial" as const,
            description: detection.note || "Detected plant",
          };
          const meta = getStatusMeta(plant);
          const isSelected = detection.id === selectedId;
          const isVerified = Boolean((detection as any).verified);
          const needsReview = !isVerified && (detection.needsReview || detection.confidence < 0.75);
          const confidencePct = Math.round((detection.confidence ?? 0.8) * 100);
          const displayNumber = index + 1;

          return (
            <button
              key={detection.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (mode === "inspect") {
                  onSelectDetection(detection.id);
                }
              }}
              className={`detection-box ${isSelected ? "is-selected" : ""} ${
                isVerified ? "is-verified" : needsReview ? "needs-review" : ""
              }`}
              style={{
                left: `${detection.box.x}%`,
                top: `${detection.box.y}%`,
                width: `${detection.box.w}%`,
                height: `${detection.box.h}%`,
                borderColor: isVerified ? "#2e7d32" : meta.color,
                background: isSelected
                  ? `${meta.color}38`
                  : isVerified
                    ? `${meta.color}20`
                    : `${meta.color}15`,
              }}
              title={`#${displayNumber} ${plant.commonName} · ${
                isVerified ? "Verified match" : `${confidencePct}% confidence`
              }`}
            >
              <span
                className="detection-box__number"
                style={{ background: isVerified ? "#2e7d32" : meta.color }}
              >
                {displayNumber}
              </span>

              {/* Status Indicator: Verified badge or Confidence Score (replaces '?') */}
              {isVerified ? (
                <span
                  className="detection-box__badge detection-box__badge--verified"
                  title="Verified identification"
                >
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                  <span className="hidden sm:inline">Verified</span>
                </span>
              ) : (
                <span
                  className={`detection-box__badge detection-box__badge--score ${
                    confidencePct >= 80
                      ? "score-high"
                      : confidencePct >= 65
                        ? "score-med"
                        : "score-low"
                  }`}
                  title={`AI match confidence: ${confidencePct}%`}
                >
                  {confidencePct}%
                </span>
              )}

              <span className="detection-box__label">
                <span className="font-extrabold text-[#d7f27a] mr-1">#{displayNumber}</span>
                <span className="font-semibold text-white mr-1.5">{plant.commonName}</span>
                {isVerified ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#2e7d32] px-1.5 py-0.5 text-[8.5px] font-bold text-white uppercase tracking-wider">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    Verified
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8.5px] font-bold ${
                      confidencePct >= 80
                        ? "bg-[#3f7d45] text-white"
                        : confidencePct >= 65
                          ? "bg-[#d9a12b] text-[#2b1f05]"
                          : "bg-[#c0392b] text-white"
                    }`}
                  >
                    {confidencePct}%
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* User-Drawn Draft Box */}
        {draftBox && draftBox.w > 1 && draftBox.h > 1 && (
          <div
            className="absolute border-2 border-dashed border-[#d7f27a] bg-[#d7f27a]/20 rounded-lg pointer-events-auto shadow-lg"
            style={{
              left: `${draftBox.x}%`,
              top: `${draftBox.y}%`,
              width: `${draftBox.w}%`,
              height: `${draftBox.h}%`,
              zIndex: 10,
            }}
          >
            {/* Action Popup Bar */}
            {!isDragging && (
              <div
                className="absolute -top-10 left-0 flex items-center gap-1 rounded-lg bg-[#163f2c] px-2 py-1 text-white shadow-xl"
                style={{ zIndex: 20 }}
              >
                <button
                  type="button"
                  onClick={handleConfirmRegion}
                  disabled={isIdentifying}
                  className="flex items-center gap-1 rounded bg-[#d7f27a] px-2 py-0.5 text-[11px] font-bold text-[#163f2c] hover:bg-[#e4fab0]"
                >
                  {isIdentifying ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Identifying...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Identify Plant ⚡
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelRegion}
                  className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
                  title="Cancel"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mode Instructional Banner */}
        {mode !== "inspect" && !draftBox && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#163f2c]/90 px-4 py-1.5 text-xs font-medium text-[#f7f4e9] shadow-lg backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#d7f27a]" />
            <span>
              {mode === "drawing"
                ? "Click & drag a rectangle over any plant or leaf to identify it"
                : `Click & drag to redraw boundary for ${selectedDetection?.plantId || "plant"}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
