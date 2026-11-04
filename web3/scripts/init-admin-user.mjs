import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env.local
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

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "njnativeyard";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
  process.exit(1);
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });

const db = getFirestore(app);

async function main() {
  const adminEmail = "niravgadhia@gmail.com";
  console.log(`🔑 Initializing admin record for: ${adminEmail} in project: ${projectId}...`);

  const docRef = doc(db, "admin_users", adminEmail);
  const now = new Date().toISOString();

  await setDoc(
    docRef,
    {
      email: adminEmail,
      role: "admin",
      initialized_at: now,
      note: "Primary super-admin account",
    },
    { merge: true }
  );

  console.log(`✓ Successfully created document: admin_users/${adminEmail}`);
  console.log(`🎉 User ${adminEmail} is now registered with full Admin / Curator privileges!`);
}

main().catch((err) => {
  console.error("❌ Initialization notice:", err.message);
});
