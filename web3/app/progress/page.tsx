"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, Bug, Leaf, LogIn, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AuthModal } from "@/components/auth/AuthModal";
import { BadgesGrid } from "@/components/gamification/BadgesGrid";
import { LeaderboardTable } from "@/components/gamification/LeaderboardTable";
import { ScoreTrendChart } from "@/components/gamification/ScoreTrendChart";
import { onAuthChange, signOutUser } from "@/lib/firebase/auth";
import {
  getLeaderboard,
  syncUserGamificationProfile,
  updateLeaderboardPreferences,
} from "@/lib/firebase/gamification";
import { getPropertiesWithAreas } from "@/lib/firebase/properties";
import {
  buildScoreHistory,
  computeGamificationSnapshot,
} from "@/lib/gamification/scoring";
import type {
  LeaderboardSortBy,
  Property,
  UserGamificationProfile,
} from "@/lib/types";

type ProgressTab = "history" | "badges" | "leaderboard";

export default function ProgressPage() {
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProgressTab>("history");

  const [properties, setProperties] = useState<Property[]>([]);
  const [userProfile, setUserProfile] = useState<UserGamificationProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [leaderboard, setLeaderboard] = useState<UserGamificationProfile[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(true);
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>("ecoPoints");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [zoneFilter, setZoneFilter] = useState<string>("ALL");

  const loadUserProgress = useCallback(async (currentUser: any) => {
    if (!currentUser) {
      setProperties([]);
      setUserProfile(null);
      setIsLoadingUser(false);
      return;
    }
    setIsLoadingUser(true);
    try {
      const props = await getPropertiesWithAreas();
      setProperties(props);
      const { profile } = await syncUserGamificationProfile(props);
      setUserProfile(profile);
    } catch (err) {
      console.warn("Error loading progress:", err);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setIsLoadingBoard(true);
    try {
      const rows = await getLeaderboard({
        sortBy,
        state: stateFilter,
        city: cityFilter,
        hardinessZone: zoneFilter,
      });
      setLeaderboard(rows);
    } finally {
      setIsLoadingBoard(false);
    }
  }, [sortBy, stateFilter, cityFilter, zoneFilter]);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      loadUserProgress(u);
      if (!u) {
        setActiveTab("leaderboard");
      }
    });
    return () => unsub();
  }, [loadUserProgress]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const history = useMemo(() => buildScoreHistory(properties), [properties]);
  const snapshot = useMemo(
    () =>
      computeGamificationSnapshot(properties, {
        existingBadges: userProfile?.badges || [],
      }),
    [properties, userProfile]
  );

  async function handleSavePreferences(prefs: {
    displayName: string;
    showOnLeaderboard: boolean;
    shareYardDetails: boolean;
    shareYardPhotos: boolean;
  }) {
    const updated = await updateLeaderboardPreferences(prefs, properties);
    if (updated) {
      setUserProfile(updated);
    }
    await loadLeaderboard();
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#163f2c]">
      <AppHeader
        stage="admin"
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={async () => {
          await signOutUser();
          setUser(null);
        }}
        extraRightActions={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e2dec9] bg-white px-3.5 py-1.5 text-xs font-bold text-[#163f2c] hover:bg-[#f3f0e6] transition"
          >
            <span>← Yard Audit</span>
          </Link>
        }
      />

      <main className="container-shell py-8 space-y-6">
        {/* Hero Summary Banner */}
        <section className="rounded-3xl border border-[#e2dec9] bg-[#163f2c] p-6 sm:p-8 text-[#faf9f5] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#245940] px-3 py-1 text-[0.7rem] font-bold text-[#d7f27a]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>NativeYard Ecological Progress</span>
              </div>
              <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-bold">
                {user
                  ? `${userProfile?.displayName || "Your"} Yard Journey`
                  : "NJ Native Yard Leaderboard"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-[#d9e5dc] max-w-xl">
                Track your Native Score over time, earn ecological stewardship badges, and
                explore top native yards across New Jersey.
              </p>
            </div>

            {user ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-2xl bg-[#20523a] px-4 py-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-[#bfe0c8]">
                    Eco Points
                  </div>
                  <div className="mt-0.5 font-serif text-xl font-bold text-[#d7f27a]">
                    {(userProfile?.ecoPoints ?? snapshot.ecoPoints).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#20523a] px-4 py-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-[#bfe0c8]">
                    Best Score
                  </div>
                  <div className="mt-0.5 font-serif text-xl font-bold">
                    {userProfile?.bestScore ?? snapshot.bestScore}/100
                  </div>
                </div>
                <div className="rounded-2xl bg-[#20523a] px-4 py-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-[#bfe0c8]">
                    Badges
                  </div>
                  <div className="mt-0.5 font-serif text-xl font-bold">
                    {snapshot.earnedBadges.length}/{snapshot.evaluatedBadges.length}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#20523a] px-4 py-3">
                  <div className="text-[0.65rem] uppercase tracking-wide text-[#bfe0c8]">
                    Caterpillars
                  </div>
                  <div className="mt-0.5 font-serif text-xl font-bold flex items-center justify-center gap-1">
                    <Bug className="h-4 w-4 text-[#d7f27a]" />
                    {(userProfile?.caterpillarCapacity ?? snapshot.caterpillarCapacity).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#d7f27a] px-5 py-2.5 text-xs font-bold text-[#163f2c] hover:bg-[#e5f8a2] transition"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In to Track Your Yard</span>
              </button>
            )}
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === "history"
                ? "bg-[#163f2c] text-[#faf9f5] shadow-xs"
                : "border border-[#e2dec9] bg-white text-[#5d6b60] hover:text-[#163f2c]"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Score Over Time</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("badges")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === "badges"
                ? "bg-[#163f2c] text-[#faf9f5] shadow-xs"
                : "border border-[#e2dec9] bg-white text-[#5d6b60] hover:text-[#163f2c]"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Badges ({snapshot.earnedBadges.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("leaderboard")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
              activeTab === "leaderboard"
                ? "bg-[#163f2c] text-[#faf9f5] shadow-xs"
                : "border border-[#e2dec9] bg-white text-[#5d6b60] hover:text-[#163f2c]"
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Leaderboard</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "history" && (
          <>
            {!user ? (
              <div className="rounded-3xl border border-[#e2dec9] bg-white p-8 text-center">
                <Leaf className="mx-auto mb-3 h-8 w-8 text-[#2f7d3a]" />
                <h2 className="font-serif text-lg font-bold text-[#163f2c]">
                  Sign in to view your yard score history
                </h2>
                <p className="mt-1 text-xs text-[#5d6b60]">
                  Save yard audits over time to see how your Native Score improves.
                </p>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="mt-4 rounded-full bg-[#163f2c] px-5 py-2 text-xs font-bold text-[#faf9f5]"
                >
                  Sign In
                </button>
              </div>
            ) : isLoadingUser ? (
              <div className="rounded-3xl border border-[#e2dec9] bg-white p-8 text-center text-sm text-[#5d6b60]">
                Loading your yard scan history...
              </div>
            ) : (
              <ScoreTrendChart history={history} />
            )}
          </>
        )}

        {activeTab === "badges" && (
          <BadgesGrid
            evaluatedBadges={snapshot.evaluatedBadges}
            earnedBadges={snapshot.earnedBadges}
          />
        )}

        {activeTab === "leaderboard" && (
          <LeaderboardTable
            entries={leaderboard}
            currentUserProfile={userProfile}
            sortBy={sortBy}
            onSortChange={setSortBy}
            stateFilter={stateFilter}
            onStateFilterChange={setStateFilter}
            cityFilter={cityFilter}
            onCityFilterChange={setCityFilter}
            zoneFilter={zoneFilter}
            onZoneFilterChange={setZoneFilter}
            isLoading={isLoadingBoard}
            onSavePreferences={user ? handleSavePreferences : undefined}
          />
        )}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
