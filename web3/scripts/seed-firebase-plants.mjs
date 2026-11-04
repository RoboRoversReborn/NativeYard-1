import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
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
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!serviceAccountPath && !projectId) {
  console.error("❌ Error: Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
  console.log("Run: node scripts/setup-firebase.mjs to configure your keys first.");
  process.exit(1);
}

let db = null;
let useAdmin = false;

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
    }
    db = getFirestore();
    useAdmin = true;
    console.log("🔑 Using Firebase Admin SDK (Service Account authenticated).");
  } catch (e) {
    console.warn("Could not initialize Admin SDK, falling back to client mode:", e.message);
  }
}

async function seed() {
  const masterPlantsPath = path.join(__dirname, "../data/master-nj-plants.json");
  if (!fs.existsSync(masterPlantsPath)) {
    console.error(`❌ Data file not found: ${masterPlantsPath}`);
    process.exit(1);
  }

  const masterPlants = JSON.parse(fs.readFileSync(masterPlantsPath, "utf8"));
  console.log(`🌿 Seeding ${masterPlants.length} plants into Firestore collection "plants"...`);

  if (useAdmin && db) {
    // Admin SDK batch seeding
    const chunkSize = 400;
    let total = 0;

    for (let i = 0; i < masterPlants.length; i += chunkSize) {
      const chunk = masterPlants.slice(i, i + chunkSize);
      const batch = db.batch();

      for (const p of chunk) {
        const docRef = db.collection("plants").doc(p.id);
        batch.set(
          docRef,
          {
            id: p.id,
            scientific_name: p.scientificName,
            common_name: p.commonName,
            synonyms: p.synonyms || [],
            status: p.status,
            nj_status: p.njStatus,
            type: p.type,
            growth_habit: p.growthHabit || "PERENNIAL_FORB",
            sun: p.sun,
            moisture: p.moisture,
            bloom: p.bloom,
            height: p.height,
            lepidoptera: p.lepidoptera || 0,
            specialist_bee_support: Boolean(p.specialistBeeSupport),
            deer_resistance: p.deerResistance || "MODERATE",
            description: p.description,
            image_url: p.image || null,
            swap_ids: p.swapIds || [],
            removal: p.removal || null,
            ornamental_features: p.ornamentalFeatures || [],
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
        total++;
      }

      await batch.commit();
      console.log(`  ✓ Synced batch: ${total}/${masterPlants.length}`);
    }
    console.log(`🎉 Successfully seeded ${total} plants into Cloud Firestore!`);
  } else {
    // Client SDK seeding
    const { initializeApp: initClientApp, getApps: getClientApps } = await import("firebase/app");
    const { getFirestore: getClientDb, doc, writeBatch } = await import("firebase/firestore");

    const clientApp = getClientApps().length
      ? getClientApps()[0]
      : initClientApp({
          apiKey: apiKey || "dummy-key",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
          projectId: projectId,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
        });

    const clientDb = getClientDb(clientApp);
    const chunkSize = 400;
    let total = 0;

    for (let i = 0; i < masterPlants.length; i += chunkSize) {
      const chunk = masterPlants.slice(i, i + chunkSize);
      const batch = writeBatch(clientDb);

      for (const p of chunk) {
        const docRef = doc(clientDb, "plants", p.id);
        batch.set(
          docRef,
          {
            id: p.id,
            scientific_name: p.scientificName,
            common_name: p.commonName,
            synonyms: p.synonyms || [],
            status: p.status,
            nj_status: p.njStatus,
            type: p.type,
            growth_habit: p.growthHabit || "PERENNIAL_FORB",
            sun: p.sun,
            moisture: p.moisture,
            bloom: p.bloom,
            height: p.height,
            lepidoptera: p.lepidoptera || 0,
            specialist_bee_support: Boolean(p.specialistBeeSupport),
            deer_resistance: p.deerResistance || "MODERATE",
            description: p.description,
            image_url: p.image || null,
            swap_ids: p.swapIds || [],
            removal: p.removal || null,
            ornamental_features: p.ornamentalFeatures || [],
            updated_at: new Date().toISOString(),
          },
          { merge: true }
        );
        total++;
      }

      await batch.commit();
      console.log(`  ✓ Synced batch: ${total}/${masterPlants.length}`);
    }
    console.log(`🎉 Successfully seeded ${total} plants into Cloud Firestore via Firebase Client!`);
  }
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
