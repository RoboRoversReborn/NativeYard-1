"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./client";
import { getCurrentUser } from "./auth";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
};

export type AdminAuthState = {
  isLoading: boolean;
  user: any | null;
  isAdmin: boolean;
  adminRole: string | null;
};

/**
 * Built-in Super-Admin emails recognized automatically.
 */
export const INITIAL_ADMIN_EMAILS = ["niravgadhia@gmail.com"];

/**
 * Checks whether the currently signed-in user is an authorized admin/curator.
 * Checks:
 *  1. Built-in super-admin whitelist (niravgadhia@gmail.com)
 *  2. Firestore collection `admin_users/{uid}`
 *  3. Firestore collection `admin_users/{email}`
 */
export async function checkAdminStatus(): Promise<{
  user: any | null;
  isAdmin: boolean;
  adminRole: string | null;
}> {
  const user = getCurrentUser();
  if (!user) {
    return { user: null, isAdmin: false, adminRole: null };
  }

  const userEmail = (user.email || "").toLowerCase().trim();
  const db = getFirebaseDb();

  // 1. Instant check against built-in admin email list
  if (userEmail && INITIAL_ADMIN_EMAILS.includes(userEmail)) {
    // Self-heal / ensure document exists in Firestore for cross-service visibility
    if (db) {
      const now = new Date().toISOString();
      const payload = {
        email: userEmail,
        role: "admin",
        uid: user.uid,
        updated_at: now,
      };
      // Upsert by both UID and Email
      setDoc(doc(db, "admin_users", user.uid), payload, { merge: true }).catch(() => {});
      setDoc(doc(db, "admin_users", userEmail), payload, { merge: true }).catch(() => {});
    }

    return {
      user,
      isAdmin: true,
      adminRole: "super_admin",
    };
  }

  if (!db) {
    return { user, isAdmin: false, adminRole: null };
  }

  try {
    // 2. Check by user UID
    const uidSnap = await getDoc(doc(db, "admin_users", user.uid));
    if (uidSnap.exists()) {
      const data = uidSnap.data();
      return {
        user,
        isAdmin: true,
        adminRole: data?.role || "curator",
      };
    }

    // 3. Check by user Email
    if (userEmail) {
      const emailSnap = await getDoc(doc(db, "admin_users", userEmail));
      if (emailSnap.exists()) {
        const data = emailSnap.data();
        return {
          user,
          isAdmin: true,
          adminRole: data?.role || "curator",
        };
      }
    }

    return { user, isAdmin: false, adminRole: null };
  } catch (err) {
    console.warn("Could not verify admin status in Firestore:", err);
    return { user, isAdmin: false, adminRole: null };
  }
}

/**
 * Grant admin privileges to a user by email or UID.
 */
export async function grantAdminRole(
  emailOrUid: string,
  role: string = "admin"
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");

  const clean = emailOrUid.trim().toLowerCase();
  const now = new Date().toISOString();

  await setDoc(
    doc(db, "admin_users", clean),
    {
      email: clean.includes("@") ? clean : null,
      uid: !clean.includes("@") ? clean : null,
      role,
      created_at: now,
    },
    { merge: true }
  );
}
