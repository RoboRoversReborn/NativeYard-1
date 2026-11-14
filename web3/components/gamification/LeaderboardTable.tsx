"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  MapPin,
  Settings2,
  Trophy,
} from "lucide-react";
import type { LeaderboardSortBy, UserGamificationProfile } from "@/lib/types";
import { LeaderYardModal } from "./LeaderYardModal";

interface LeaderboardTableProps {
  entries: UserGamificationProfile[];
  currentUserProfile: UserGamificationProfile | null;
  sortBy: LeaderboardSortBy;
  onSortChange: (sort: LeaderboardSortBy) => void;
  stateFilter: string;
  onStateFilterChange: (state: string) => void;
  cityFilter: string;
  onCityFilterChange: (city: string) => void;
  zoneFilter: string;
  onZoneFilterChange: (zone: string) => void;
  isLoading: boolean;
  onSavePreferences?: (prefs: {
    displayName: string;
    showOnLeaderboard: boolean;
    shareYardDetails: boolean;
    shareYardPhotos: boolean;
  }) => Promise<void>;
}

export function LeaderboardTable({
  entries,
  currentUserProfile,
  sortBy,
  onSortChange,
  stateFilter,
  onStateFilterChange,
  cityFilter,
  onCityFilterChange,
  zoneFilter,
  onZoneFilterChange,
  isLoading,
  onSavePreferences,
}: LeaderboardTableProps) {
  const [selectedLeader, setSelectedLeader] = useState<{
    profile: UserGamificationProfile;
    rank: number;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [displayName, setDisplayName] = useState(currentUserProfile?.displayName || "");
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(
    currentUserProfile?.showOnLeaderboard ?? true
  );
  const [shareYardDetails, setShareYardDetails] = useState(
    currentUserProfile?.shareYardDetails ?? true
  );
  const [shareYardPhotos, setShareYardPhotos] = useState(
    currentUserProfile?.shareYardPhotos ?? true
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  useEffect(() => {
    if (currentUserProfile) {
      setDisplayName(currentUserProfile.displayName || "");
      setShowOnLeaderboard(currentUserProfile.showOnLeaderboard ?? true);
      setShareYardDetails(currentUserProfile.shareYardDetails ?? true);
      setShareYardPhotos(currentUserProfile.shareYardPhotos ?? true);
    }
  }, [currentUserProfile]);

  const availableStates = useMemo(() => {
    const set = new Set<string>(["NJ"]);
    for (const e of entries) {
      if (e.state) set.add(e.state);
    }
    if (currentUserProfile?.state) set.add(currentUserProfile.state);
    return Array.from(set).sort();
  }, [entries, currentUserProfile]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.city && (stateFilter === "ALL" || e.state === stateFilter)) {
        set.add(e.city);
      }
    }
    if (currentUserProfile?.city) set.add(currentUserProfile.city);
    return Array.from(set).sort();
  }, [entries, stateFilter, currentUserProfile]);

  const availableZones = useMemo(() => {
    const set = new Set<string>(["6a", "6b", "7a", "7b"]);
    for (const e of entries) {
      if (e.hardinessZone) set.add(e.hardinessZone);
    }
    return Array.from(set).sort();
  }, [entries]);

  const currentUserRank = useMemo(() => {
    if (!currentUserProfile) return null;
    const idx = entries.findIndex((e) => e.uid === currentUserProfile.uid);
    return idx >= 0 ? idx + 1 : null;
  }, [entries, currentUserProfile]);

  async function handleSavePrefs(e: React.FormEvent) {
    e.preventDefault();
    if (!onSavePreferences) return;
    try {
      setIsSavingPrefs(true);
      await onSavePreferences({
        displayName,
        showOnLeaderboard,
        shareYardDetails,
        shareYardPhotos,
      });
      setShowSettings(false);
    } finally {
      setIsSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls & Privacy Settings */}
      <div className="rounded-3xl border border-[#e2dec9] bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#163f2c] flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#c78b00]" />
              <span>Community Leaderboard</span>
            </h2>
            <p className="text-xs text-[#5d6b60]">
              Click any gardener to inspect their yard layout, native plants, and best practices.
            </p>
          </div>

          {currentUserProfile && onSavePreferences && (
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-[#faf9f5] px-3.5 py-1.5 text-xs font-bold text-[#163f2c] hover:bg-[#f3f0e6] transition"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Privacy &amp; Display</span>
              {!currentUserProfile.showOnLeaderboard && (
                <span className="ml-1 rounded-full bg-[#efeadd] px-2 py-0.5 text-[0.65rem] text-[#5d6b60]">
                  Private
                </span>
              )}
            </button>
          )}
        </div>

        {/* Privacy Settings Drawer */}
        {showSettings && currentUserProfile && (
          <form
            onSubmit={handleSavePrefs}
            className="mb-5 rounded-2xl border border-[#d7d2ba] bg-[#faf9f5] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#163f2c]">
                Leaderboard Visibility Settings
              </h3>
              <span className="text-[0.7rem] text-[#5d6b60]">
                Opted in by default · Street address is never shared
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#425445] mb-1">
                  Public Display Name
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Nirav G."
                  className="w-full rounded-xl border border-[#e2dec9] bg-white px-3 py-2 text-xs text-[#163f2c] focus:outline-none focus:ring-2 focus:ring-[#2f7d3a]"
                />
              </div>

              <div className="flex flex-col justify-center gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#163f2c] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnLeaderboard}
                    onChange={(e) => setShowOnLeaderboard(e.target.checked)}
                    className="h-4 w-4 rounded accent-[#163f2c]"
                  />
                  <span>Show my profile on the public leaderboard</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-[#425445] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareYardDetails}
                    onChange={(e) => setShareYardDetails(e.target.checked)}
                    disabled={!showOnLeaderboard}
                    className="h-4 w-4 rounded accent-[#163f2c]"
                  />
                  <span>Let others view my plant list &amp; yard layout</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-[#425445] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareYardPhotos}
                    onChange={(e) => setShareYardPhotos(e.target.checked)}
                    disabled={!showOnLeaderboard || !shareYardDetails}
                    className="h-4 w-4 rounded accent-[#163f2c]"
                  />
                  <span>Include yard scan photos in my showcase</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-full border border-[#e2dec9] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5d6b60]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingPrefs}
                className="rounded-full bg-[#163f2c] px-4 py-1.5 text-xs font-bold text-[#faf9f5] hover:bg-[#20523a] disabled:opacity-50"
              >
                {isSavingPrefs ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}

        {/* Sort & Location Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Metric Sort Toggle */}
          <div className="inline-flex rounded-full border border-[#e2dec9] bg-[#faf9f5] p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => onSortChange("ecoPoints")}
              className={`rounded-full px-3 py-1 transition ${
                sortBy === "ecoPoints"
                  ? "bg-[#163f2c] text-[#faf9f5]"
                  : "text-[#5d6b60] hover:text-[#163f2c]"
              }`}
            >
              Eco Points
            </button>
            <button
              type="button"
              onClick={() => onSortChange("bestScore")}
              className={`rounded-full px-3 py-1 transition ${
                sortBy === "bestScore"
                  ? "bg-[#163f2c] text-[#faf9f5]"
                  : "text-[#5d6b60] hover:text-[#163f2c]"
              }`}
            >
              Best Yard Score
            </button>
            <button
              type="button"
              onClick={() => onSortChange("averageScore")}
              className={`rounded-full px-3 py-1 transition ${
                sortBy === "averageScore"
                  ? "bg-[#163f2c] text-[#faf9f5]"
                  : "text-[#5d6b60] hover:text-[#163f2c]"
              }`}
            >
              Avg Yard Score
            </button>
          </div>

          {/* State / Town / Zone Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-[#5d6b60]">
              <Filter className="h-3.5 w-3.5" />
            </span>

            <select
              value={stateFilter}
              onChange={(e) => {
                onStateFilterChange(e.target.value);
                onCityFilterChange("ALL");
              }}
              aria-label="Filter by State"
              className="rounded-full border border-[#e2dec9] bg-[#faf9f5] px-3 py-1.5 font-semibold text-[#163f2c]"
            >
              <option value="ALL">All States</option>
              {availableStates.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={cityFilter}
              onChange={(e) => onCityFilterChange(e.target.value)}
              aria-label="Filter by Town or City"
              className="rounded-full border border-[#e2dec9] bg-[#faf9f5] px-3 py-1.5 font-semibold text-[#163f2c]"
            >
              <option value="ALL">All Towns</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={zoneFilter}
              onChange={(e) => onZoneFilterChange(e.target.value)}
              aria-label="Filter by Hardiness Zone"
              className="rounded-full border border-[#e2dec9] bg-[#faf9f5] px-3 py-1.5 font-semibold text-[#163f2c]"
            >
              <option value="ALL">All Zones</option>
              {availableZones.map((z) => (
                <option key={z} value={z}>
                  Zone {z}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current User Rank Banner */}
        {currentUserProfile && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#b7dfb9] bg-[#f4fbf4] px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#163f2c]">
              {currentUserProfile.showOnLeaderboard ? (
                <>
                  <Eye className="h-4 w-4 text-[#2f7d3a]" />
                  <span>
                    Your Rank:{" "}
                    <strong>{currentUserRank ? `#${currentUserRank}` : "Unranked"}</strong> ·{" "}
                    {currentUserProfile.ecoPoints.toLocaleString()} Eco Pts · Best{" "}
                    {currentUserProfile.bestScore}/100
                  </span>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 text-[#7a806e]" />
                  <span>
                    Your profile is currently <strong>Private</strong> (hidden from others).
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedLeader({
                  profile: currentUserProfile,
                  rank: currentUserRank || 1,
                })
              }
              className="font-bold text-[#2f7d3a] hover:underline"
            >
              Preview My Card
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="rounded-3xl border border-[#e2dec9] bg-white overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#5d6b60]">
            Loading community leaderboard...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#5d6b60]">
            No public yards match the selected filters yet. Save a yard scan to be the first!
          </div>
        ) : (
          <div className="divide-y divide-[#efeadd]">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = currentUserProfile?.uid === entry.uid;
              const medal =
                rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
              const loc = [entry.city, entry.state].filter(Boolean).join(", ");

              return (
                <button
                  key={entry.uid}
                  type="button"
                  onClick={() => setSelectedLeader({ profile: entry, rank })}
                  className={`w-full flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-[#faf9f5] ${
                    isMe ? "bg-[#f4fbf4]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        rank <= 3
                          ? "bg-[#fef7e0] text-[#8a6100]"
                          : "bg-[#f3f0e6] text-[#425445]"
                      }`}
                    >
                      {medal}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-serif text-base font-bold text-[#163f2c]">
                          {entry.displayName}
                        </span>
                        {isMe && (
                          <span className="rounded-full bg-[#163f2c] px-2 py-0.5 text-[0.62rem] font-bold text-[#d7f27a]">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5d6b60]">
                        {loc && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 text-[#2f7d3a]" />
                            {loc}
                          </span>
                        )}
                        {entry.hardinessZone && <span>Zone {entry.hardinessZone}</span>}
                        <span>· {entry.badges?.length || 0} badges</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#163f2c]">
                        {sortBy === "bestScore"
                          ? `${entry.bestScore}/100`
                          : sortBy === "averageScore"
                            ? `${entry.averageScore}/100 avg`
                            : `${entry.ecoPoints.toLocaleString()} pts`}
                      </div>
                      <div className="text-[0.7rem] text-[#5d6b60]">
                        {sortBy === "ecoPoints"
                          ? `Best ${entry.bestScore}/100 · Avg ${entry.averageScore}`
                          : `${entry.ecoPoints.toLocaleString()} Eco Pts`}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#9aa191]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <LeaderYardModal
        leader={selectedLeader?.profile || null}
        rank={selectedLeader?.rank || null}
        onClose={() => setSelectedLeader(null)}
      />
    </div>
  );
}
