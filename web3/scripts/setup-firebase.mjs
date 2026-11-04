#!/usr/bin/env node
/**
 * NativeYard: Interactive Firebase Setup Helper
 *
 * Usage:
 *   node scripts/setup-firebase.mjs
 *   node scripts/setup-firebase.mjs --projectId=my-project --apiKey=AIza...
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");
const firebasercPath = path.join(__dirname, "../.firebaserc");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("\n🌿 NativeYard — Firebase Auto-Configuration Helper\n");
  console.log("This script configures your Firebase credentials, security rules, and seeding.\n");

  // Read current .env.local
  let currentEnv = "";
  if (fs.existsSync(envPath)) {
    currentEnv = fs.readFileSync(envPath, "utf8");
  }

  console.log("You can paste your Firebase SDK configuration object from the Firebase Console.");
  console.log("Example format: { apiKey: '...', authDomain: '...', projectId: '...', ... }\n");
  console.log("Paste the entire snippet (or press Enter to configure step-by-step):");

  const inputSnippet = await question("> ");

  let config = {};

  if (inputSnippet.trim().startsWith("{") || inputSnippet.includes("apiKey")) {
    try {
      // Extract key-value pairs using regex (handles JS objects and JSON)
      const extract = (key) => {
        const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"]([^'"]+)['"]`, "i");
        const match = inputSnippet.match(regex);
        return match ? match[1] : "";
      };

      config = {
        apiKey: extract("apiKey"),
        authDomain: extract("authDomain"),
        projectId: extract("projectId"),
        storageBucket: extract("storageBucket"),
        messagingSenderId: extract("messagingSenderId"),
        appId: extract("appId"),
      };
    } catch (e) {
      console.warn("Could not parse snippet directly, switching to prompt mode.");
    }
  }

  // Fallback to step-by-step prompts if missing
  if (!config.projectId) {
    config.projectId = await question("Firebase Project ID: ");
  }
  if (!config.apiKey) {
    config.apiKey = await question("Firebase API Key (apiKey): ");
  }
  if (!config.authDomain) {
    config.authDomain = config.projectId ? `${config.projectId}.firebaseapp.com` : await question("Auth Domain: ");
  }
  if (!config.storageBucket) {
    config.storageBucket = config.projectId ? `${config.projectId}.appspot.com` : await question("Storage Bucket: ");
  }
  if (!config.messagingSenderId) {
    config.messagingSenderId = await question("Messaging Sender ID (optional): ");
  }
  if (!config.appId) {
    config.appId = await question("Firebase App ID (optional): ");
  }

  rl.close();

  // Update .env.local
  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey || "",
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain || "",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId || "",
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket || "",
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId || "",
    NEXT_PUBLIC_FIREBASE_APP_ID: config.appId || "",
  };

  let newEnv = currentEnv;
  for (const [key, value] of Object.entries(envVars)) {
    if (newEnv.includes(`${key}=`)) {
      newEnv = newEnv.replace(new RegExp(`${key}=.*`, "g"), `${key}=${value}`);
    } else {
      newEnv += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, newEnv.trim() + "\n");
  console.log(`\n✓ Updated: ${envPath}`);

  // Update or create .firebaserc
  const firebaserc = {
    projects: {
      default: config.projectId || "",
    },
  };
  fs.writeFileSync(firebasercPath, JSON.stringify(firebaserc, null, 2) + "\n");
  console.log(`✓ Updated: ${firebasercPath} (default project: ${config.projectId})`);

  console.log("\n🎉 Firebase configuration saved successfully!");
  console.log("\nNext automated commands you can run:");
  console.log("  1. Authorize Firebase CLI:");
  console.log("     npm run firebase:login");
  console.log("  2. Deploy Firestore & Storage Security Rules:");
  console.log("     npm run firebase:deploy-rules");
  console.log("  3. Seed Firestore with New Jersey Botanical Catalog:");
  console.log("     npm run seed:db\n");
}

main().catch(console.error);
