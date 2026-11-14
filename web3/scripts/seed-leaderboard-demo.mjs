import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local if present
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [k, ...v] = trimmed.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!serviceAccountPath && !projectId) {
  console.error("❌ Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
  process.exit(1);
}

if (!getApps().length) {
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId || serviceAccount.project_id,
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}

const db = getFirestore();
const COLLECTION = "user_profiles";

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

const AREA_TEMPLATES = [
  { name: "Front Yard", type: "front", sun: "full_sun", soil: "loam", photo: "/samples/front-yard.jpg" },
  { name: "Back Yard", type: "back", sun: "partial_sun", soil: "clay_loam", photo: "/samples/back-yard.jpg" },
  { name: "Side Pollinator Bed", type: "side", sun: "full_sun", soil: "sandy_loam", photo: "/samples/side-yard.jpg" },
];

function pickPlants(pool, startIdx, count) {
  if (!pool.length) return [];
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[(startIdx + i) % pool.length]);
  }
  return result;
}

function toShowcasePlant(p) {
  return {
    plantId: p.id,
    commonName: p.commonName,
    scientificName: p.scientificName,
    status: p.status,
    type: p.type,
    lepidoptera: p.lepidoptera || 0,
  };
}

function buildBadgesForUser(u, catCapacity) {
  const now = new Date().toISOString();
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

async function cleanDemoUsers() {
  console.log("🧹 Cleaning demo_user_* profiles from Firestore...");
  const snap = await db.collection(COLLECTION).where("isDemo", "==", true).get();
  if (snap.empty) {
    console.log("No demo profiles found.");
    return;
  }
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`✅ Deleted ${snap.size} demo profiles.`);
}

async function seedDemoUsers() {
  const masterPlantsPath = path.join(__dirname, "../data/master-nj-plants.json");
  const allPlants = JSON.parse(fs.readFileSync(masterPlantsPath, "utf8"));

  const keystones = allPlants.filter((p) => p.status === "keystone");
  const natives = allPlants.filter((p) => p.status === "native");
  const nonNatives = allPlants.filter((p) => p.status === "non-native");
  const invasives = allPlants.filter((p) => p.status === "invasive");

  console.log(`🌱 Seeding ${DEMO_USERS.length} New Jersey demo profiles into "${COLLECTION}"...`);

  const batch = db.batch();
  const now = new Date().toISOString();

  DEMO_USERS.forEach((u, idx) => {
    const showcaseYards = [];
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

    const badges = buildBadgesForUser(u, maxCatCap);
    const ecoPoints =
      u.scans * Math.round(u.avgScore * 0.5) +
      totalKeystones * 35 +
      u.invasivesRemoved * 40 +
      badges.length * 110;

    const profile = {
      uid: u.id,
      isDemo: true,
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

    batch.set(db.collection(COLLECTION).doc(u.id), profile, { merge: true });
  });

  await batch.commit();
  console.log(`✅ Successfully seeded ${DEMO_USERS.length} NJ leaderboard profiles!`);
}

const isClean = process.argv.includes("--clean");
(isClean ? cleanDemoUsers() : seedDemoUsers())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
