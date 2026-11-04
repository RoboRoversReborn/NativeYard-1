"use client";

import { doc, getDoc } from "firebase/firestore";
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
 * Checks whether the currently signed-in user is an authorized admin/curator.
 * Checks Firestore collection `admin_users/{uid}`.
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

  const db = getFirebaseDb();
  if (!db) {
    return { user, isAdmin: false, adminRole: null };
  }

  try {
    const adminDocRef = doc(db, "admin_users", user.uid);
    const adminSnap = await getDoc(adminDocRef);

    if (adminSnap.exists()) {
      const data = adminSnap.data();
      return {
        user,
        isAdmin: true,
        adminRole: data?.role || "curator",
      };
    }

    return { user, isAdmin: false, adminRole: null };
  } catch (err) {
    console.warn("Could not verify admin status in Firestore:", err);
    return { user, isAdmin: false, adminRole: null };
  }
}
