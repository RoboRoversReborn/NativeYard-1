/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo } from "react";
import { Search, X, Camera, Upload, Sparkles, AlertTriangle, Leaf, ChevronRight, Bug } from "lucide-react";
import { getAllPlants, getStatusMeta } from "@/lib/plants";
import { getPlantImage } from "@/lib/plantImages";
import type { Plant, Detection } from "@/lib/types";

interface PlantPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  detection: Detection | null;
  currentPlant: Plant | null;
  displayNumber?: number;
  onSelectPlant: (plant: Plant) => void;
  onTriggerCamera: () => void;
  onTriggerUpload: () => void;
}

type CategoryTab = "suggested" | "all" | "native" | "invasive" | "non-native";

export function PlantPickerModal({
  isOpen,
  onClose,
  detection,
  currentPlant,
  displayNumber,
  onSelectPlant,
  onTriggerCamera,
  onTriggerUpload,
}: PlantPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<CategoryTab>("suggested");

  const allPlants = useMemo(() => getAllPlants(), []);

  // Suggested plants: lookalikes matching habit or family
  const suggestedPlants = useMemo(() => {
    if (!currentPlant) return allPlants.slice(0, 12);
    const genus = currentPlant.scientificName.split(" ")[0];
    const habit = currentPlant.growthHabit || currentPlant.type;

    const matches = allPlants.filter(
      (p) =>
        p.id !== currentPlant.id &&
        (p.scientificName.startsWith(genus) ||
          p.type === currentPlant.type ||
          p.growthHabit === habit)
    );

    return (matches.length > 0 ? matches : allPlants).slice(0, 16);
  }, [allPlants, currentPlant]);

  const filteredPlants = useMemo(() => {
    let list = allPlants;

    if (category === "suggested" && !searchTerm) {
      list = suggestedPlants;
    } else if (category === "native") {
      list = allPlants.filter((p) => p.status === "native" || p.status === "keystone");
    } else if (category === "invasive") {
      list = allPlants.filter((p) => p.status === "invasive");
    } else if (category === "non-native") {
      list = allPlants.filter((p) => p.status === "non-native");
    }

    if (!searchTerm.trim()) return list;

    const query = searchTerm.toLowerCase().trim();
    return allPlants.filter(
      (p) =>
        p.commonName.toLowerCase().includes(query) ||
        p.scientificName.toLowerCase().includes(query)
    );
  }, [allPlants, suggestedPlants, category, searchTerm]);

  if (!isOpen || !detection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-[#d5cfbd] bg-[#fbfaf4] shadow-2xl">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-[#e8e4d5] px-6 py-4.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#163f2c] text-[#d7f27a]">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-[1.2rem] font-semibold text-[#163f2c]">
                  Rematch Plant {displayNumber ? `#${displayNumber}` : ""}
                </h3>
                {currentPlant && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold text-white"
                    style={{ background: getStatusMeta(currentPlant).color }}
                  >
                    {getStatusMeta(currentPlant).short}
                  </span>
                )}
              </div>
              <p className="text-[0.72rem] text-[#6b7a68]">
                Currently: <strong>{currentPlant?.commonName || "Unknown species"}</strong>{" "}
                <span className="italic">({currentPlant?.scientificName || "unclassified"})</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTriggerCamera}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#c3bc9f] bg-white px-3 py-1.5 text-xs font-bold text-[#163f2c] shadow-xs transition hover:bg-[#f3f0e6]"
            >
              <Camera className="h-3.5 w-3.5 text-[#3f7d45]" />
              Snap Leaf
            </button>
            <button
              type="button"
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d8d3bf] bg-white px-3 py-1.5 text-xs font-bold text-[#5d6b60] shadow-xs transition hover:bg-[#f3f0e6]"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Leaf
            </button>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#f3f0e6]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search Bar & Category Tabs */}
        <div className="border-b border-[#e8e4d5] bg-[#f7f4e9] p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9182]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search 150+ NJ plants by common or botanical name (e.g. Oak, Hydrangea, Barberry)..."
              className="w-full rounded-xl border border-[#d8d3bf] bg-white py-2.5 pl-10 pr-9 text-xs text-[#163f2c] placeholder:text-[#9a9f91] focus:border-[#3f7d45] focus:outline-hidden"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8b9182] hover:text-[#163f2c]"
              >
                ✕
              </button>
            )}
          </div>

          {!searchTerm && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategory("suggested")}
                className={`rounded-full px-3 py-1 text-[0.66rem] font-bold transition ${
                  category === "suggested"
                    ? "bg-[#163f2c] text-[#f7f4e9]"
                    : "border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#ece8d9]"
                }`}
              >
                ⚡ Suggested ({suggestedPlants.length})
              </button>
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`rounded-full px-3 py-1 text-[0.66rem] font-bold transition ${
                  category === "all"
                    ? "bg-[#163f2c] text-[#f7f4e9]"
                    : "border border-[#d8d3bf] bg-white text-[#5d6b60] hover:bg-[#ece8d9]"
                }`}
              >
                All NJ Plants ({allPlants.length})
              </button>
              <button
                type="button"
                onClick={() => setCategory("native")}
                className={`rounded-full px-3 py-1 text-[0.66rem] font-bold transition ${
                  category === "native"
                    ? "bg-[#2f7d3a] text-white"
                    : "border border-[#c9d9b7] bg-[#edf3e3] text-[#3f7d45] hover:bg-[#e2edd3]"
                }`}
              >
                🟢 Natives & Keystones
              </button>
              <button
                type="button"
                onClick={() => setCategory("invasive")}
                className={`rounded-full px-3 py-1 text-[0.66rem] font-bold transition ${
                  category === "invasive"
                    ? "bg-[#b6533d] text-white"
                    : "border border-[#e7b8a8] bg-[#fae8e1] text-[#9c4634] hover:bg-[#f6dad0]"
                }`}
              >
                🔴 Invasives
              </button>
              <button
                type="button"
                onClick={() => setCategory("non-native")}
                className={`rounded-full px-3 py-1 text-[0.66rem] font-bold transition ${
                  category === "non-native"
                    ? "bg-[#a87a2c] text-white"
                    : "border border-[#e7d09b] bg-[#faf1dc] text-[#8a6420] hover:bg-[#f5e9c9]"
                }`}
              >
                🟠 Non-Native
              </button>
            </div>
          )}
        </div>

        {/* Plant List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredPlants.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8b9182]">
              No plant found matching &quot;{searchTerm}&quot;. Try a different name or browse the tabs.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {filteredPlants.map((plant) => {
                const statusMeta = getStatusMeta(plant);
                const imgUrl = getPlantImage(plant.scientificName, plant.commonName);
                const isSelected = currentPlant?.id === plant.id;

                return (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => {
                      onSelectPlant(plant);
                      onClose();
                    }}
                    className={`group flex items-center justify-between rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-[#3f7d45] bg-[#edf3e3]"
                        : "border-[#e4dfd0] bg-white hover:border-[#3f7d45] hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#f0ede2]">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={plant.commonName}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-sm font-bold text-[#8b9182]">
                            🌱
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {plant.status === "keystone" && (
                            <span className="text-[0.65rem] text-[#2f7d3a]">🌟</span>
                          )}
                          <p className="truncate text-[0.82rem] font-bold text-[#163f2c]">
                            {plant.commonName}
                          </p>
                        </div>
                        <p className="truncate text-[0.68rem] italic text-[#8b9182]">
                          {plant.scientificName} · {plant.type}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white"
                            style={{ background: statusMeta.color }}
                          >
                            {statusMeta.short}
                          </span>
                          {plant.lepidoptera ? (
                            <span className="flex items-center gap-0.5 text-[0.6rem] font-semibold text-[#3f7d45]">
                              <Bug className="h-2.5 w-2.5" />
                              {plant.lepidoptera}+ hosts
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-[#8b9182] transition group-hover:translate-x-0.5 group-hover:text-[#163f2c]" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
