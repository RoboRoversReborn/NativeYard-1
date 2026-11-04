import fs from "fs";
import os from "os";

// Automatically use the authenticated CLI access token from firebase login
const configstorePath = `${os.homedir()}/.config/configstore/firebase-tools.json`;
if (!fs.existsSync(configstorePath)) {
  console.error("❌ Firebase CLI login not found. Please run 'npx firebase login' first.");
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configstorePath, "utf8"));
const token = cfg.tokens?.access_token;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "njnativeyard";

const adminEmail = process.argv[2] || "niravgadhia@gmail.com";

async function main() {
  console.log(`🔑 Granting admin privileges to: ${adminEmail} in project: ${projectId}...`);

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admin_users?documentId=${encodeURIComponent(adminEmail)}`;
  const body = {
    fields: {
      email: { stringValue: adminEmail },
      role: { stringValue: "admin" },
      created_at: { stringValue: new Date().toISOString() },
      note: { stringValue: "Super Admin" },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409) {
    console.log(`✓ Record for ${adminEmail} already exists in Firestore admin_users.`);
    return;
  }

  const data = await res.json();
  if (!res.ok) {
    console.error("❌ Failed to create admin document:", data);
    process.exit(1);
  }

  console.log(`✓ Successfully initialized document: admin_users/${adminEmail}`);
  console.log(`🎉 User ${adminEmail} now has full Curator / Admin access!`);
}

main().catch(console.error);
