"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bug,
  Hand,
  Maximize2,
  Minimize2,
  MousePointerClick,
  RotateCcw,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AuditView } from "@/components/audit-view";
import { BadgesGrid } from "@/components/gamification/BadgesGrid";
import { LeaderboardTable } from "@/components/gamification/LeaderboardTable";
import { LeaderYardModal } from "@/components/gamification/LeaderYardModal";
import { ScoreTrendChart } from "@/components/gamification/ScoreTrendChart";
import { LandingPage } from "@/components/landing-page";
import { ReportView } from "@/components/report-view";
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
import { buildSampleAudit, SAMPLE_YARDS } from "@/lib/sampleDetections";
import type {
  Audit,
  LeaderboardSortBy,
  Property,
  UserGamificationProfile,
  YardArea,
} from "@/lib/types";

type DemoStageId =
  | "landing-home"
  | "landing-snap"
  | "audit-boxes"
  | "audit-score"
  | "report-swaps"
  | "report-calendar"
  | "progress-leaderboard"
  | "leader-modal";

interface DemoStageConfig {
  id: DemoStageId;
  targetSelector: string | null;
  label: string;
  scrollBlock?: ScrollLogicalPosition;
}

const STAGES: DemoStageConfig[] = [
  {
    id: "landing-home",
    targetSelector: null,
    label: "",
  },
  {
    id: "landing-snap",
    targetSelector: "#audit",
    label: "Click here · Snap or Upload Yard",
    scrollBlock: "center",
  },
  {
    id: "audit-boxes",
    targetSelector: '[data-demo-target="audit-boxes"]',
    label: "AI Plant Segmentation",
    scrollBlock: "center",
  },
  {
    id: "audit-score",
    targetSelector: '[data-demo-target="audit-score"]',
    label: "Yard Score (0–100)",
    scrollBlock: "center",
  },
  {
    id: "report-swaps",
    targetSelector: '[data-demo-target="report-swaps"]',
    label: "Smart Replacements",
    scrollBlock: "start",
  },
  {
    id: "report-calendar",
    targetSelector: '[data-demo-target="report-calendar"]',
    label: "Planting Calendar",
    scrollBlock: "center",
  },
  {
    id: "progress-leaderboard",
    targetSelector: '[data-demo-target="leaderboard-section"]',
    label: "NJ Leaderboard & Gamification",
    scrollBlock: "start",
  },
  {
    id: "leader-modal",
    targetSelector: '[data-demo-target="leader-modal-card"]',
    label: "Neighbor Yard & Badges",
    scrollBlock: "center",
  },
];

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function LiveInteractiveDemoPage() {
  const [stageIndex, setStageIndex] = useState(0);
  const [clickToAdvance, setClickToAdvance] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Real Signed-In User & Properties
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedArea, setSelectedArea] = useState<YardArea | null>(null);

  // Live Audit State (preloaded with Front Yard sample for instant, smooth transitions)
  const [zip, setZip] = useState("07645");
  const [photo, setPhoto] = useState<string>(SAMPLE_YARDS["front-yard"].filename);
  const [audit, setAudit] = useState<Audit>(() =>
    buildSampleAudit("front-yard", "07645")
  );

  // Live Progress & Leaderboard State
  const [userProfile, setUserProfile] = useState<UserGamificationProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserGamificationProfile[]>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>("ecoPoints");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [progressSubTab, setProgressSubTab] = useState<
    "leaderboard" | "history" | "badges"
  >("leaderboard");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const [highlightBox, setHighlightBox] = useState<HighlightBox | null>(null);

  const stage = STAGES[stageIndex];

  // Load real signed-in Firebase user & properties
  useEffect(() => {
    const unsub = onAuthChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const props = await getPropertiesWithAreas();
        setProperties(props);
        if (props.length > 0) {
          setSelectedProperty(props[0]);
          if (props[0].zip) setZip(props[0].zip);
          if (props[0].yard_areas && props[0].yard_areas.length > 0) {
            setSelectedArea(props[0].yard_areas[0]);
          }
        }
        const { profile } = await syncUserGamificationProfile(props);
        setUserProfile(profile);
      } else {
        setProperties([]);
        setSelectedProperty(null);
        setSelectedArea(null);
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Load leaderboard entries (live Firestore + NJ demo fallback)
  const fetchBoard = useCallback(async () => {
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
    fetchBoard();
  }, [fetchBoard]);

  const history = useMemo(() => buildScoreHistory(properties), [properties]);
  const snapshot = useMemo(
    () =>
      computeGamificationSnapshot(properties, {
        existingBadges: userProfile?.badges || [],
      }),
    [properties, userProfile]
  );

  // Stage Navigation
  const goNext = useCallback(() => {
    setStageIndex((prev) => (prev + 1) % STAGES.length);
  }, []);

  const goPrev = useCallback(() => {
    setStageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  // Measure target DOM element relative to stageWrapperRef so the red box tracks scrolling accurately
  const updateHighlightBox = useCallback(() => {
    const wrapper = stageWrapperRef.current;
    const frame = frameRef.current;
    if (!wrapper || !frame) return;

    if (!stage.targetSelector) {
      setHighlightBox(null);
      return;
    }

    const target = frame.querySelector(stage.targetSelector) as HTMLElement | null;
    if (!target) {
      setHighlightBox(null);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (targetRect.width === 0 || targetRect.height === 0) {
      setHighlightBox(null);
      return;
    }

    setHighlightBox({
      top: targetRect.top - wrapperRect.top,
      left: targetRect.left - wrapperRect.left,
      width: targetRect.width,
      height: targetRect.height,
    });
  }, [stage.targetSelector]);

  // Auto-scroll smoothly to the highlighted section whenever stage changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (!stage.targetSelector) {
      setHighlightBox(null);
      container.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Reset scroll to top on view transitions before scrolling to target
    if (stage.id === "progress-leaderboard") {
      setProgressSubTab("leaderboard");
    }

    const timer = window.setTimeout(() => {
      const target = container.querySelector(stage.targetSelector!) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: stage.scrollBlock || "center",
        });
      }
      updateHighlightBox();
    }, 120);

    const settleTimer = window.setTimeout(updateHighlightBox, 650);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settleTimer);
    };
  }, [stage, updateHighlightBox]);

  // Keep red box pinned to target element while user scrolls or resizes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScrollOrResize = () => updateHighlightBox();
    container.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    const observer = new ResizeObserver(onScrollOrResize);
    observer.observe(container);

    return () => {
      container.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      observer.disconnect();
    };
  }, [updateHighlightBox]);

  async function toggleFullscreen() {
    if (!frameRef.current) return;
    if (!document.fullscreenElement) {
      await frameRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function handlePointerDownCapture(e: React.PointerEvent) {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  }

  function handleStageClickCapture(e: React.MouseEvent) {
    if (!clickToAdvance) return;
    // Ignore clicks on floating demo controls
    if ((e.target as HTMLElement).closest("[data-demo-controls]")) return;
    // Ignore if user dragged scrollbar or selected text
    if (pointerDownPos.current) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      if (dx > 6 || dy > 6) return;
    }
    e.stopPropagation();
    e.preventDefault();
    goNext();
  }

  const featuredLeader = leaderboard[0] || null;

  return (
    <div className="min-h-screen bg-[#0b1610] flex flex-col items-center justify-center p-2 sm:p-4">
      {/* 16:9 1080p Landscape Computer Screen Frame */}
      <div
        ref={frameRef}
        className={`relative w-full overflow-hidden bg-[#faf9f5] shadow-[0_24px_90px_rgba(0,0,0,0.7)] flex flex-col ${
          isFullscreen
            ? "h-screen w-screen rounded-none"
            : "max-w-[1680px] aspect-video max-h-[91vh] rounded-2xl border-[6px] border-[#1f2421] ring-1 ring-white/15"
        }`}
      >
        {/* Minimal macOS / Browser Top Bar (non-distracting) */}
        <div
          data-demo-controls
          className="h-8 bg-[#18221c] border-b border-white/10 px-3 flex items-center justify-between text-[0.7rem] text-[#b9c9be] shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 rounded-md bg-white/10 px-2.5 py-0.5 font-mono text-[0.65rem] text-[#dce8df]">
              njnativeyard.web.app
              {stage.id.startsWith("progress") || stage.id === "leader-modal"
                ? "/progress"
                : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#244734] px-2 py-0.5 text-[0.65rem] font-semibold text-[#d7f27a]">
                Signed in: {user.displayName || user.email}
              </span>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 hover:bg-white/20 text-white transition"
              title="Toggle 1080p Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? "Exit Fullscreen" : "1080p Fullscreen"}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Live App Viewport Wrapper */}
        <div
          ref={stageWrapperRef}
          onPointerDownCapture={handlePointerDownCapture}
          onClickCapture={handleStageClickCapture}
          className="relative flex-1 overflow-hidden bg-[#faf9f5] flex flex-col"
        >
        <div
          ref={scrollContainerRef}
          className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#faf9f5]"
        >
          {/* STAGES 1 & 2: Real LandingPage (Home -> Snap Yard) */}
          {(stage.id === "landing-home" || stage.id === "landing-snap") && (
            <LandingPage
              photo={stage.id === "landing-home" ? null : photo}
              zip={zip}
              error=""
              isSample={stage.id !== "landing-home"}
              onPhoto={() => {}}
              onSample={() => goNext()}
              onSelectSample={(key) => {
                setPhoto(SAMPLE_YARDS[key].filename);
                setAudit(buildSampleAudit(key, zip));
              }}
              onLaunchSample={() => goNext()}
              selectedSampleKey="front-yard"
              onClearPhoto={() => {}}
              onZip={setZip}
              onStart={() => goNext()}
              user={user}
              properties={properties}
              selectedProperty={selectedProperty}
              selectedArea={selectedArea}
              onSelectProperty={setSelectedProperty}
              onSelectArea={setSelectedArea}
              onOpenAuth={() => {}}
              onSignOut={() => signOutUser()}
              onOpenPropertyManager={() => {}}
            />
          )}

          {/* STAGES 3 & 4: Real AuditView */}
          {(stage.id === "audit-boxes" || stage.id === "audit-score") && (
            <AuditView
              audit={audit}
              photo={photo}
              onAuditChange={setAudit}
              onReport={() => setStageIndex(4)}
              onReset={() => setStageIndex(0)}
              onHome={() => setStageIndex(0)}
              user={user}
              onOpenAuth={() => {}}
              onSignOut={() => signOutUser()}
              onOpenPropertyManager={() => {}}
            />
          )}

          {/* STAGES 5 & 6: Real ReportView */}
          {(stage.id === "report-swaps" || stage.id === "report-calendar") && (
            <ReportView
              audit={audit}
              photo={photo}
              onBack={() => setStageIndex(2)}
              onReset={() => setStageIndex(0)}
              onHome={() => setStageIndex(0)}
              user={user}
              onOpenAuth={() => {}}
              onSignOut={() => signOutUser()}
              onOpenPropertyManager={() => {}}
            />
          )}

          {/* STAGES 6 & 7: Real Progress, Score Over Time, Badges & Leaderboard */}
          {(stage.id === "progress-leaderboard" || stage.id === "leader-modal") && (
            <div className="min-h-full bg-[#faf9f5] text-[#163f2c]">
              <AppHeader
                stage="admin"
                user={user}
                onHome={() => setStageIndex(0)}
                onSignOut={() => signOutUser()}
              />
              <main className="container-shell py-8 space-y-6">
                <section className="rounded-3xl border border-[#e2dec9] bg-[#163f2c] p-6 text-[#faf9f5] shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-serif text-2xl sm:text-3xl font-bold">
                        {userProfile?.displayName || user?.displayName || "NJ"} Yard
                        Journey &amp; Leaderboard
                      </h1>
                      <p className="mt-1 text-xs sm:text-sm text-[#d9e5dc]">
                        Track Yard Score improvements over time, earn stewardship badges,
                        and explore top New Jersey yards.
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-2.5 text-center">
                      <div className="rounded-2xl bg-[#20523a] px-3 py-2.5">
                        <div className="text-[0.62rem] uppercase text-[#bfe0c8]">
                          Eco Pts
                        </div>
                        <div className="font-serif text-lg font-bold text-[#d7f27a]">
                          {(userProfile?.ecoPoints ?? snapshot.ecoPoints).toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#20523a] px-3 py-2.5">
                        <div className="text-[0.62rem] uppercase text-[#bfe0c8]">
                          Best Score
                        </div>
                        <div className="font-serif text-lg font-bold">
                          {userProfile?.bestScore ?? snapshot.bestScore}/100
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#20523a] px-3 py-2.5">
                        <div className="text-[0.62rem] uppercase text-[#bfe0c8]">
                          Badges
                        </div>
                        <div className="font-serif text-lg font-bold">
                          {snapshot.earnedBadges.length}/{snapshot.evaluatedBadges.length}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#20523a] px-3 py-2.5">
                        <div className="text-[0.62rem] uppercase text-[#bfe0c8]">
                          Caterpillars
                        </div>
                        <div className="font-serif text-lg font-bold flex items-center justify-center gap-1">
                          <Bug className="h-3.5 w-3.5 text-[#d7f27a]" />
                          {(
                            userProfile?.caterpillarCapacity ??
                            snapshot.caterpillarCapacity
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProgressSubTab("leaderboard")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
                      progressSubTab === "leaderboard"
                        ? "bg-[#163f2c] text-[#faf9f5]"
                        : "border border-[#e2dec9] bg-white text-[#5d6b60]"
                    }`}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>Leaderboard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressSubTab("history")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
                      progressSubTab === "history"
                        ? "bg-[#163f2c] text-[#faf9f5]"
                        : "border border-[#e2dec9] bg-white text-[#5d6b60]"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>Score Over Time</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressSubTab("badges")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
                      progressSubTab === "badges"
                        ? "bg-[#163f2c] text-[#faf9f5]"
                        : "border border-[#e2dec9] bg-white text-[#5d6b60]"
                    }`}
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>Badges ({snapshot.earnedBadges.length})</span>
                  </button>
                </div>

                {progressSubTab === "leaderboard" && (
                  <div data-demo-target="leaderboard-section">
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
                      onSavePreferences={
                        user
                          ? async (prefs) => {
                              const updated = await updateLeaderboardPreferences(
                                prefs,
                                properties
                              );
                              if (updated) setUserProfile(updated);
                              await fetchBoard();
                            }
                          : undefined
                      }
                    />
                  </div>
                )}

                {progressSubTab === "history" && (
                  <ScoreTrendChart history={history} />
                )}

                {progressSubTab === "badges" && (
                  <BadgesGrid
                    evaluatedBadges={snapshot.evaluatedBadges}
                    earnedBadges={snapshot.earnedBadges}
                  />
                )}
              </main>

              {/* Stage 8: Auto-opened Leader Yard Modal */}
              {stage.id === "leader-modal" && featuredLeader && (
                <LeaderYardModal
                  leader={featuredLeader}
                  rank={1}
                  onClose={() => setStageIndex(6)}
                />
              )}
            </div>
          )}
        </div>

        {/* Live DOM-Tracking Animated Red Highlight Box (clipped inside 1080p stage) */}
        {stage.targetSelector && highlightBox && (
          <div
            style={{
              top: `${highlightBox.top - 6}px`,
              left: `${highlightBox.left - 6}px`,
              width: `${highlightBox.width + 12}px`,
              height: `${highlightBox.height + 12}px`,
            }}
            className="pointer-events-none absolute z-[60] rounded-2xl border-4 border-[#ff2e2e] bg-[#ff2e2e]/5 shadow-[0_0_25px_rgba(255,46,46,0.35)] transition-all duration-300"
          >
            <div className="absolute -inset-1 rounded-2xl border-2 border-[#ff5c5c] animate-pulse opacity-70" />
            <div className="absolute top-2 left-4 flex items-center gap-1.5 rounded-full bg-[#e61919] px-3 py-1 text-xs font-bold text-white shadow-lg">
              <MousePointerClick className="h-4 w-4 animate-bounce" />
              <span>{stage.label}</span>
            </div>
          </div>
        )}
        </div>

        {/* Floating Minimal Presenter Controls (Bottom-Right Corner) */}
        <div
          data-demo-controls
          className="absolute bottom-3 right-3 z-[70] flex items-center gap-1.5 rounded-full border border-white/15 bg-[#12261b]/90 px-2.5 py-1.5 text-xs text-white shadow-xl backdrop-blur-md"
        >
          <button
            type="button"
            onClick={goPrev}
            disabled={stageIndex === 0}
            className="rounded-full p-1 hover:bg-white/15 disabled:opacity-35"
            title="Previous (←)"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>

          <span className="px-1.5 font-mono text-[0.7rem] font-bold text-[#d7f27a]">
            {stageIndex + 1}/{STAGES.length}
          </span>

          <button
            type="button"
            onClick={goNext}
            className="rounded-full p-1 hover:bg-white/15"
            title="Next (Space / →)"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-px bg-white/20 mx-0.5" />

          <button
            type="button"
            onClick={() => setClickToAdvance((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold transition ${
              clickToAdvance
                ? "bg-[#e61919] text-white"
                : "bg-white/15 text-[#d7f27a]"
            }`}
            title="Toggle whether clicking anywhere advances to next stage or interacts with buttons inside the page"
          >
            {clickToAdvance ? (
              <>
                <MousePointerClick className="h-3 w-3" />
                <span>Click: Next</span>
              </>
            ) : (
              <>
                <Hand className="h-3 w-3" />
                <span>Click: Interact</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStageIndex(0)}
            className="rounded-full p-1 hover:bg-white/15"
            title="Restart"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <Link
            href="/"
            className="rounded-full bg-white/10 px-2 py-0.5 text-[0.65rem] font-semibold hover:bg-white/20"
          >
            Exit
          </Link>
        </div>
      </div>
    </div>
  );
}
