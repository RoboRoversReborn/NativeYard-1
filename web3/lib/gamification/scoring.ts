import { getPlant } from "../plants";
import type {
  BadgeDefinition,
  Detection,
  EarnedBadge,
  Property,
  ScoreHistoryPoint,
  ShowcasePlant,
  ShowcaseYardArea,
  YardScan,
} from "../types";
import { evaluateBadges, type EvaluatedBadge } from "./badges";

export interface GamificationSnapshot {
  bestScore: number;
  latestScore: number;
  averageScore: number;
  ecoPoints: number;
  totalScans: number;
  totalAreas: number;
  totalNatives: number;
  totalKeystones: number;
  invasivesRemoved: number;
  caterpillarCapacity: number;
  evaluatedBadges: EvaluatedBadge[];
  earnedBadges: EarnedBadge[];
  newlyUnlockedBadges: BadgeDefinition[];
  showcaseYards: ShowcaseYardArea[];
}

/**
 * Derive a privacy-friendly default display name (e.g. "Nirav Gadhia" -> "Nirav G.").
 */
export function formatPublicDisplayName(rawName?: string | null, email?: string | null): string {
  const trimmed = (rawName || "").trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
    }
    return parts[0];
  }
  if (email) {
    const handle = email.split("@")[0] || "";
    if (handle) return handle.slice(0, 12);
  }
  return "NJ Gardener";
}

function summarizeScanDetections(scan: YardScan) {
  const detections: Detection[] = Array.isArray(scan.detected_plants) ? scan.detected_plants : [];
  let nativeCount = 0;
  let keystoneCount = 0;
  let invasiveCount = 0;
  let caterpillarCapacity = 0;
  let usedMacro = false;

  const seenPlantIds = new Set<string>();
  const plants: ShowcasePlant[] = [];

  for (const det of detections) {
    if (
      det.verificationMethod === "macro_camera" ||
      det.verificationMethod === "macro_upload"
    ) {
      usedMacro = true;
    }

    const plant = det.plantId ? getPlant(det.plantId) : undefined;
    const status = plant?.status || (det.plantId?.includes("invasive") ? "invasive" : "non-native");

    if (status === "keystone") {
      keystoneCount += 1;
      nativeCount += 1;
    } else if (status === "native") {
      nativeCount += 1;
    } else if (status === "invasive") {
      invasiveCount += 1;
    }

    if (plant && !seenPlantIds.has(plant.id)) {
      seenPlantIds.add(plant.id);
      caterpillarCapacity += plant.lepidoptera || 0;
      plants.push({
        plantId: plant.id,
        commonName: plant.commonName,
        scientificName: plant.scientificName,
        status: plant.status,
        type: plant.type,
        lepidoptera: plant.lepidoptera,
      });
    }
  }

  // Fallback to stored scan counters if detections array had no resolvable plant IDs
  if (detections.length === 0) {
    nativeCount = scan.native_count || 0;
    keystoneCount = scan.keystone_count || 0;
    invasiveCount = scan.invasive_count || 0;
  } else {
    nativeCount = Math.max(nativeCount, scan.native_count || 0);
    keystoneCount = Math.max(keystoneCount, scan.keystone_count || 0);
    invasiveCount = Math.max(invasiveCount, scan.invasive_count || 0);
  }

  // Sort showcase plants: keystones first, then natives, then others
  const statusRank: Record<string, number> = {
    keystone: 0,
    native: 1,
    "non-native": 2,
    invasive: 3,
  };
  plants.sort((a, b) => (statusRank[a.status] ?? 4) - (statusRank[b.status] ?? 4));

  return {
    nativeCount,
    keystoneCount,
    invasiveCount,
    caterpillarCapacity,
    usedMacro,
    plantsCount: Math.max(detections.length, scan.plants_count || 0),
    plants,
  };
}

/**
 * Build chronological score history points across all properties and yard areas.
 */
export function buildScoreHistory(properties: Property[]): ScoreHistoryPoint[] {
  const points: ScoreHistoryPoint[] = [];

  for (const prop of properties) {
    for (const area of prop.yard_areas || []) {
      const scans = [...(area.yard_scans || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let prevScore: number | null = null;
      for (const scan of scans) {
        const summary = summarizeScanDetections(scan);
        const score = scan.native_score ?? 0;
        points.push({
          scanId: scan.id,
          areaId: area.id,
          areaName: area.name,
          propertyId: prop.id,
          propertyName: prop.name,
          score,
          grade: scan.grade || "Eco Audit",
          nativeCount: summary.nativeCount,
          keystoneCount: summary.keystoneCount,
          invasiveCount: summary.invasiveCount,
          plantsCount: summary.plantsCount,
          deltaFromPrevious: prevScore === null ? null : score - prevScore,
          createdAt: scan.created_at,
        });
        prevScore = score;
      }
    }
  }

  return points.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/**
 * Compute full gamification stats, showcase yard summaries, and badges from properties.
 */
export function computeGamificationSnapshot(
  properties: Property[],
  options?: {
    existingBadges?: EarnedBadge[];
    shareYardDetails?: boolean;
    shareYardPhotos?: boolean;
  }
): GamificationSnapshot {
  const existingBadges = options?.existingBadges || [];
  const existingMap = new Map(existingBadges.map((b) => [b.id, b.earnedAt]));
  const shareYardDetails = options?.shareYardDetails ?? true;
  const shareYardPhotos = options?.shareYardPhotos ?? true;

  let totalScans = 0;
  let scannedAreasCount = 0;
  let bestScore = 0;
  let latestScore = 0;
  let latestScanTime = 0;
  let maxNativeSharePct = 0;
  let totalNatives = 0;
  let totalKeystones = 0;
  let maxCaterpillarCapacity = 0;
  let invasivesRemoved = 0;
  let maxAreaScoreImprovement = 0;
  let usedMacroVerification = false;
  let scanScorePoints = 0;

  const distinctMonths = new Set<string>();
  const latestAreaScores: number[] = [];
  const showcaseYards: ShowcaseYardArea[] = [];

  for (const prop of properties) {
    for (const area of prop.yard_areas || []) {
      const scans = [...(area.yard_scans || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      if (scans.length === 0) continue;

      scannedAreasCount += 1;

      const firstScan = scans[0];
      const latestScan = scans[scans.length - 1];

      // Track improvement over time within this yard area
      const areaMinScore = Math.min(...scans.map((s) => s.native_score ?? 0));
      const areaMaxScore = Math.max(...scans.map((s) => s.native_score ?? 0));
      if ((latestScan.native_score ?? 0) - firstScan.native_score > maxAreaScoreImprovement) {
        maxAreaScoreImprovement = (latestScan.native_score ?? 0) - firstScan.native_score;
      }

      // Count invasives removed between consecutive scans in the same area
      let prevInvasives: number | null = null;
      for (const scan of scans) {
        totalScans += 1;
        const summary = summarizeScanDetections(scan);
        const score = scan.native_score ?? 0;

        scanScorePoints += Math.round(score * 0.5) + summary.keystoneCount * 15;
        if (score > bestScore) bestScore = score;

        const ts = new Date(scan.created_at).getTime();
        if (ts >= latestScanTime) {
          latestScanTime = ts;
          latestScore = score;
        }

        if (summary.plantsCount > 0) {
          const sharePct = (summary.nativeCount / summary.plantsCount) * 100;
          if (sharePct > maxNativeSharePct) maxNativeSharePct = sharePct;
        }

        if (summary.caterpillarCapacity > maxCaterpillarCapacity) {
          maxCaterpillarCapacity = summary.caterpillarCapacity;
        }

        if (summary.usedMacro) usedMacroVerification = true;

        const d = new Date(scan.created_at);
        if (!Number.isNaN(d.getTime())) {
          distinctMonths.add(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`);
        }

        if (prevInvasives !== null && summary.invasiveCount < prevInvasives) {
          invasivesRemoved += prevInvasives - summary.invasiveCount;
        }
        prevInvasives = summary.invasiveCount;
      }

      // Use latest scan in this area for current area stats & showcase
      const latestSummary = summarizeScanDetections(latestScan);
      latestAreaScores.push(latestScan.native_score ?? 0);
      totalNatives += latestSummary.nativeCount;
      totalKeystones += latestSummary.keystoneCount;

      if (shareYardDetails) {
        showcaseYards.push({
          areaId: area.id,
          areaName: area.name,
          areaType: area.area_type,
          sunExposure: area.sun_exposure,
          soilType: area.soil_type,
          latestScore: latestScan.native_score ?? 0,
          bestScore: areaMaxScore,
          grade: latestScan.grade || "Eco Audit",
          plantsCount: latestSummary.plantsCount,
          nativeCount: latestSummary.nativeCount,
          keystoneCount: latestSummary.keystoneCount,
          invasiveCount: latestSummary.invasiveCount,
          caterpillarCapacity: latestSummary.caterpillarCapacity,
          photoUrl:
            shareYardPhotos &&
            latestScan.photo_url &&
            !latestScan.photo_url.startsWith("data:")
              ? latestScan.photo_url
              : undefined,
          lastScannedAt: latestScan.created_at,
          plants: latestSummary.plants.slice(0, 12),
        });
      }

      // Small bonus for maintaining area improvement
      if (areaMaxScore > areaMinScore) {
        scanScorePoints += (areaMaxScore - areaMinScore) * 2;
      }
    }
  }

  const averageScore =
    latestAreaScores.length > 0
      ? Math.round(latestAreaScores.reduce((acc, v) => acc + v, 0) / latestAreaScores.length)
      : 0;

  const evaluatedBadges = evaluateBadges({
    totalScans,
    scannedAreasCount,
    bestScore,
    maxNativeSharePct,
    totalKeystones,
    maxCaterpillarCapacity,
    invasivesRemoved,
    maxAreaScoreImprovement,
    distinctMonthsCount: distinctMonths.size,
    usedMacroVerification,
  });

  const now = new Date().toISOString();
  const earnedBadges: EarnedBadge[] = [];
  const newlyUnlockedBadges: BadgeDefinition[] = [];
  let badgeXp = 0;

  for (const item of evaluatedBadges) {
    if (item.unlocked) {
      const existingEarnedAt = existingMap.get(item.definition.id);
      if (!existingEarnedAt) {
        newlyUnlockedBadges.push(item.definition);
      }
      earnedBadges.push({
        id: item.definition.id,
        earnedAt: existingEarnedAt || now,
      });
      badgeXp += item.definition.xpReward;
    } else if (existingMap.has(item.definition.id)) {
      // Preserve previously earned badges even if a later scan changed stats
      earnedBadges.push({
        id: item.definition.id,
        earnedAt: existingMap.get(item.definition.id)!,
      });
      badgeXp += item.definition.xpReward;
    }
  }

  const ecoPoints = scanScorePoints + invasivesRemoved * 40 + badgeXp;

  // Sort showcase yards by highest latestScore first
  showcaseYards.sort((a, b) => b.latestScore - a.latestScore);

  return {
    bestScore,
    latestScore,
    averageScore,
    ecoPoints,
    totalScans,
    totalAreas: scannedAreasCount,
    totalNatives,
    totalKeystones,
    invasivesRemoved,
    caterpillarCapacity: maxCaterpillarCapacity,
    evaluatedBadges,
    earnedBadges,
    newlyUnlockedBadges,
    showcaseYards: showcaseYards.slice(0, 6),
  };
}
