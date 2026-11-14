import { getAllPlants } from "../plants";
import type {
  EarnedBadge,
  LeaderboardFilter,
  Plant,
  ShowcasePlant,
  ShowcaseYardArea,
  UserGamificationProfile,
} from "../types";

const DEMO_USERS = [
  { id: "demo_user_01", displayName: "Elena R.", city: "Montclair", zone: "7a", bestScore: 97, avgScore: 94, scans: 9, invasivesRemoved: 4, areas: 3 },
  { id: "demo_user_02", displayName: "Marcus T.", city: "Princeton", zone: "7a", bestScore: 95, avgScore: 91, scans: 11, invasivesRemoved: 5, areas: 3 },
  { id: "demo_user_03", displayName: "Priya K.", city: "Ridgewood", zone: "6b", bestScore: 93, avgScore: 89, scans: 7, invasivesRemoved: 3, areas: 2 },
  { id: "demo_user_04", displayName: "David L.", city: "Morristown", zone: "6b", bestScore: 91, avgScore: 88, scans: 10, invasivesRemoved: 4, areas: 3 },
  { id: "demo_user_05", displayName: "Hannah M.", city: "Summit", zone: "6b", bestScore: 90, avgScore: 85, scans: 6, invasivesRemoved: 2, areas: 2 },
  { id: "demo_user_06", displayName: "Carlos V.", city: "Cherry Hill", zone: "7a", bestScore: 88, avgScore: 84, scans: 8, invasivesRemoved: 3, areas: 2 },
  { id: "demo_user_07", displayName: "Sarah W.", city: "Westfield", zone: "7a", bestScore: 87, avgScore: 82, scans: 5, invasivesRemoved: 2, areas: 2 },
  { id: "demo_user_08", displayName: "Noah B.", city: "Red Bank", zone: "7a", bestScore: 85, avgScore: 81, scans: 7, invasivesRemoved: 3, areas: 2 },
  { id: "demo_user_09", displayName: "Maya S.", city: "Maplewood", zone: "7a", bestScore: 84, avgScore: 79, scans: 6, invasivesRemoved: 2, areas: 2 },
  { id: "demo_user_10", displayName: "Liam O.", city: "Lambertville", zone: "6b", bestScore: 82, avgScore: 78, scans: 4, invasivesRemoved: 1, areas: 2 },
  { id: "demo_user_11", displayName: "Aisha N.", city: "Hoboken", zone: "7b", bestScore: 79, avgScore: 76, scans: 5, invasivesRemoved: 1, areas: 1 },
  { id: "demo_user_12", displayName: "Trevor G.", city: "Cape May", zone: "7b", bestScore: 78, avgScore: 74, scans: 6, invasivesRemoved: 2, areas: 2 },
  { id: "demo_user_13", displayName: "Claire D.", city: "Madison", zone: "6b", bestScore: 75, avgScore: 71, scans: 4, invasivesRemoved: 1, areas: 2 },
  { id: "demo_user_14", displayName: "Ben P.", city: "Collingswood", zone: "7a", bestScore: 73, avgScore: 69, scans: 3, invasivesRemoved: 1, areas: 2 },
  { id: "demo_user_15", displayName: "Rachel F.", city: "Flemington", zone: "6a", bestScore: 71, avgScore: 67, scans: 4, invasivesRemoved: 1, areas: 2 },
  { id: "demo_user_16", displayName: "Omar H.", city: "Haddonfield", zone: "7a", bestScore: 68, avgScore: 64, scans: 3, invasivesRemoved: 0, areas: 2 },
  { id: "demo_user_17", displayName: "Grace C.", city: "Moorestown", zone: "7a", bestScore: 64, avgScore: 61, scans: 2, invasivesRemoved: 0, areas: 1 },
  { id: "demo_user_18", displayName: "Kevin J.", city: "Asbury Park", zone: "7b", bestScore: 59, avgScore: 56, scans: 2, invasivesRemoved: 0, areas: 1 },
  { id: "demo_user_19", displayName: "Lauren Z.", city: "Cranford", zone: "7a", bestScore: 54, avgScore: 52, scans: 2, invasivesRemoved: 0, areas: 1 },
  { id: "demo_user_20", displayName: "Samir A.", city: "Pennington", zone: "6b", bestScore: 47, avgScore: 47, scans: 1, invasivesRemoved: 0, areas: 1 },
];

const AREA_TEMPLATES: Array<{
  name: string;
  type: ShowcaseYardArea["areaType"];
  sun: string;
  soil: string;
  photo: string;
}> = [
  { name: "Front Yard", type: "front", sun: "full_sun", soil: "loam", photo: "/samples/front-yard.jpg" },
  { name: "Back Yard", type: "back", sun: "partial_sun", soil: "clay_loam", photo: "/samples/back-yard.jpg" },
  { name: "Side Pollinator Bed", type: "side", sun: "full_sun", soil: "sandy_loam", photo: "/samples/side-yard.jpg" },
];

function pickPlants(pool: Plant[], startIdx: number, count: number): Plant[] {
  if (!pool.length) return [];
  const result: Plant[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[(startIdx + i) % pool.length]);
  }
  return result;
}

function toShowcasePlant(p: Plant): ShowcasePlant {
  return {
    plantId: p.id,
    commonName: p.commonName,
    scientificName: p.scientificName,
    status: p.status,
    type: p.type,
    lepidoptera: p.lepidoptera || 0,
  };
}

function buildBadges(u: (typeof DEMO_USERS)[number], catCapacity: number): EarnedBadge[] {
  const now = "2026-11-01T12:00:00.000Z";
  const ids = ["first_audit"];
  if (u.areas >= 2) ids.push("property_mapper");
  if (u.bestScore >= 60) ids.push("keystone_guardian");
  if (catCapacity >= 250) ids.push("caterpillar_haven");
  if (u.bestScore >= 75) ids.push("native_majority");
  if (u.bestScore >= 85) ids.push("eco_sanctuary");
  if (u.invasivesRemoved >= 1) ids.push("invasive_buster");
  if (u.scans >= 4 && u.invasivesRemoved >= 2) ids.push("comeback_yard");
  if (u.scans >= 3) ids.push("seasonal_steward");
  if (u.scans >= 5) ids.push("macro_botanist");
  return ids.map((id) => ({ id, earnedAt: now }));
}

let cachedDemoProfiles: UserGamificationProfile[] | null = null;

export function getDemoLeaderboardProfiles(
  filter: LeaderboardFilter = { sortBy: "ecoPoints" }
): UserGamificationProfile[] {
  if (!cachedDemoProfiles) {
    const allPlants = getAllPlants();
    const keystones = allPlants.filter((p) => p.status === "keystone");
    const natives = allPlants.filter((p) => p.status === "native");
    const nonNatives = allPlants.filter((p) => p.status === "non-native");
    const invasives = allPlants.filter((p) => p.status === "invasive");
    const now = "2026-11-10T15:00:00.000Z";

    cachedDemoProfiles = DEMO_USERS.map((u, idx) => {
      const showcaseYards: ShowcaseYardArea[] = [];
      let totalNatives = 0;
      let totalKeystones = 0;
      let maxCatCap = 0;

      for (let a = 0; a < u.areas; a++) {
        const tpl = AREA_TEMPLATES[a % AREA_TEMPLATES.length];
        const areaScore = Math.max(40, Math.min(99, a === 0 ? u.bestScore : u.avgScore - a * 2));
        const kCount = areaScore >= 85 ? 2 : areaScore >= 65 ? 1 : 0;
        const nCount = areaScore >= 80 ? 4 : areaScore >= 60 ? 3 : 1;
        const nnCount = areaScore >= 80 ? 1 : 2;
        const iCount = areaScore < 65 ? 2 : areaScore < 80 ? 1 : 0;

        const areaPlants = [
          ...pickPlants(keystones, idx * 2 + a, kCount),
          ...pickPlants(natives, idx * 3 + a, nCount),
          ...pickPlants(nonNatives, idx + a, nnCount),
          ...pickPlants(invasives, idx + a, iCount),
        ].map(toShowcasePlant);

        const catCap = areaPlants.reduce((acc, p) => acc + (p.lepidoptera || 0), 0);
        if (catCap > maxCatCap) maxCatCap = catCap;
        totalNatives += kCount + nCount;
        totalKeystones += kCount;

        showcaseYards.push({
          areaId: `${u.id}_area_${a + 1}`,
          areaName: tpl.name,
          areaType: tpl.type,
          sunExposure: tpl.sun,
          soilType: tpl.soil,
          latestScore: areaScore,
          bestScore: areaScore,
          grade: areaScore >= 85 ? "Eco-Sanctuary" : areaScore >= 70 ? "Native Haven" : "Growing Habitat",
          plantsCount: areaPlants.length,
          nativeCount: kCount + nCount,
          keystoneCount: kCount,
          invasiveCount: iCount,
          caterpillarCapacity: catCap,
          photoUrl: tpl.photo,
          lastScannedAt: now,
          plants: areaPlants,
        });
      }

      const badges = buildBadges(u, maxCatCap);
      const ecoPoints =
        u.scans * Math.round(u.avgScore * 0.5) +
        totalKeystones * 35 +
        u.invasivesRemoved * 40 +
        badges.length * 110;

      return {
        uid: u.id,
        displayName: u.displayName,
        city: u.city,
        state: "NJ",
        hardinessZone: u.zone,
        showOnLeaderboard: true,
        shareYardDetails: true,
        shareYardPhotos: true,
        bestScore: u.bestScore,
        latestScore: u.bestScore,
        averageScore: u.avgScore,
        ecoPoints,
        totalScans: u.scans,
        totalAreas: u.areas,
        totalNatives,
        totalKeystones,
        invasivesRemoved: u.invasivesRemoved,
        caterpillarCapacity: maxCatCap,
        badges,
        showcaseYards,
        updatedAt: now,
      };
    });
  }

  let list = [...cachedDemoProfiles];

  if (filter.state && filter.state !== "ALL") {
    const st = filter.state.toLowerCase();
    list = list.filter((e) => e.state.toLowerCase() === st);
  }
  if (filter.city && filter.city !== "ALL") {
    const ct = filter.city.toLowerCase();
    list = list.filter((e) => e.city.toLowerCase() === ct);
  }
  if (filter.hardinessZone && filter.hardinessZone !== "ALL") {
    list = list.filter((e) => e.hardinessZone === filter.hardinessZone);
  }

  const sortKey =
    filter.sortBy === "bestScore"
      ? "bestScore"
      : filter.sortBy === "averageScore"
        ? "averageScore"
        : "ecoPoints";

  list.sort((a, b) => b[sortKey] - a[sortKey]);
  return list;
}
