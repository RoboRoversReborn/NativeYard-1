"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebaseDb } from "./client";
import { getCurrentUser } from "./auth";
import {
  computeGamificationSnapshot,
  formatPublicDisplayName,
} from "../gamification/scoring";
import { getDemoLeaderboardProfiles } from "../gamification/demoLeaderboard";
import type {
  BadgeDefinition,
  LeaderboardFilter,
  Property,
  UserGamificationProfile,
} from "../types";

const COLLECTION_NAME = "user_profiles";

/**
 * Fetch a user's gamification profile from Firestore.
 */
export async function getUserGamificationProfile(
  uid?: string
): Promise<UserGamificationProfile | null> {
  const db = getFirebaseDb();
  const currentUser = getCurrentUser();
  const targetUid = uid || currentUser?.uid;
  if (!db || !targetUid) return null;

  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, targetUid));
    if (!snap.exists()) return null;
    return snap.data() as UserGamificationProfile;
  } catch (err) {
    console.warn("Could not fetch user_profiles:", err);
    return null;
  }
}

/**
 * Recompute gamification stats & badges from the user's properties and upsert `user_profiles/{uid}`.
 * Users are opted in by default (`showOnLeaderboard: true`) and can opt out in settings.
 */
export async function syncUserGamificationProfile(
  properties: Property[]
): Promise<{
  profile: UserGamificationProfile | null;
  newlyUnlockedBadges: BadgeDefinition[];
}> {
  const db = getFirebaseDb();
  const user = getCurrentUser();
  if (!db || !user) return { profile: null, newlyUnlockedBadges: [] };

  const existing = await getUserGamificationProfile(user.uid);
  const showOnLeaderboard = existing?.showOnLeaderboard ?? true;
  const shareYardDetails = existing?.shareYardDetails ?? true;
  const shareYardPhotos = existing?.shareYardPhotos ?? true;

  const snapshot = computeGamificationSnapshot(properties, {
    existingBadges: existing?.badges || [],
    shareYardDetails,
    shareYardPhotos,
  });

  const primaryProp = properties[0];
  const displayName =
    existing?.displayName ||
    formatPublicDisplayName(user.displayName, user.email);

  const profile: UserGamificationProfile = {
    uid: user.uid,
    displayName,
    city: (primaryProp?.city || existing?.city || "").trim(),
    state: (primaryProp?.state || existing?.state || "NJ").trim(),
    hardinessZone: (primaryProp?.hardiness_zone || existing?.hardinessZone || "7a").trim(),
    showOnLeaderboard,
    shareYardDetails,
    shareYardPhotos,
    bestScore: snapshot.bestScore,
    latestScore: snapshot.latestScore,
    averageScore: snapshot.averageScore,
    ecoPoints: snapshot.ecoPoints,
    totalScans: snapshot.totalScans,
    totalAreas: snapshot.totalAreas,
    totalNatives: snapshot.totalNatives,
    totalKeystones: snapshot.totalKeystones,
    invasivesRemoved: snapshot.invasivesRemoved,
    caterpillarCapacity: snapshot.caterpillarCapacity,
    badges: snapshot.earnedBadges,
    showcaseYards: shareYardDetails ? snapshot.showcaseYards : [],
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, COLLECTION_NAME, user.uid), profile, { merge: true });
  } catch (err) {
    console.warn("Failed to sync user_profiles:", err);
  }

  return {
    profile,
    newlyUnlockedBadges: snapshot.newlyUnlockedBadges,
  };
}

/**
 * Update leaderboard privacy and display preferences for the current user.
 */
export async function updateLeaderboardPreferences(
  prefs: Partial<
    Pick<
      UserGamificationProfile,
      "displayName" | "showOnLeaderboard" | "shareYardDetails" | "shareYardPhotos"
    >
  >,
  properties?: Property[]
): Promise<UserGamificationProfile | null> {
  const db = getFirebaseDb();
  const user = getCurrentUser();
  if (!db || !user) throw new Error("User must be signed in to update settings");

  const existing = await getUserGamificationProfile(user.uid);
  const nextShareDetails = prefs.shareYardDetails ?? existing?.shareYardDetails ?? true;
  const nextSharePhotos = prefs.shareYardPhotos ?? existing?.shareYardPhotos ?? true;

  const updatedFields: Partial<UserGamificationProfile> = {
    uid: user.uid,
    displayName:
      prefs.displayName !== undefined
        ? prefs.displayName.trim() || formatPublicDisplayName(user.displayName, user.email)
        : existing?.displayName || formatPublicDisplayName(user.displayName, user.email),
    showOnLeaderboard: prefs.showOnLeaderboard ?? existing?.showOnLeaderboard ?? true,
    shareYardDetails: nextShareDetails,
    shareYardPhotos: nextSharePhotos,
    updatedAt: new Date().toISOString(),
  };

  if (properties) {
    const snapshot = computeGamificationSnapshot(properties, {
      existingBadges: existing?.badges || [],
      shareYardDetails: nextShareDetails,
      shareYardPhotos: nextSharePhotos,
    });
    updatedFields.showcaseYards = nextShareDetails ? snapshot.showcaseYards : [];
  } else if (!nextShareDetails) {
    updatedFields.showcaseYards = [];
  } else if (!nextSharePhotos && existing?.showcaseYards) {
    updatedFields.showcaseYards = existing.showcaseYards.map((y) => ({
      ...y,
      photoUrl: undefined,
    }));
  }

  await setDoc(doc(db, COLLECTION_NAME, user.uid), updatedFields, { merge: true });
  return getUserGamificationProfile(user.uid);
}

/**
 * Fetch public leaderboard entries sorted by Eco Points, Best Score, or Average Score,
 * with optional State, Town (City), and Hardiness Zone filters.
 */
export async function getLeaderboard(
  filter: LeaderboardFilter = { sortBy: "ecoPoints" }
): Promise<UserGamificationProfile[]> {
  const db = getFirebaseDb();
  let entries: UserGamificationProfile[] = [];

  const sortField =
    filter.sortBy === "bestScore"
      ? "bestScore"
      : filter.sortBy === "averageScore"
        ? "averageScore"
        : "ecoPoints";

  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("showOnLeaderboard", "==", true),
        orderBy(sortField, "desc"),
        limit(100)
      );
      const snap = await getDocs(q);
      entries = snap.docs
        .map((d) => d.data() as UserGamificationProfile)
        .filter((e) => (e.totalScans || 0) > 0);
    } catch (err) {
      console.warn("Leaderboard query failed (using NJ demo data fallback):", err);
    }
  }

  // Merge NJ demo profiles if Firestore has no seeded demo profiles yet
  if (entries.length < 5) {
    const demoEntries = getDemoLeaderboardProfiles(filter);
    const existingIds = new Set(entries.map((e) => e.uid));
    for (const demo of demoEntries) {
      if (!existingIds.has(demo.uid)) {
        entries.push(demo);
      }
    }
  }

  if (filter.state && filter.state !== "ALL") {
    const targetState = filter.state.toLowerCase();
    entries = entries.filter((e) => (e.state || "").toLowerCase() === targetState);
  }

  if (filter.city && filter.city !== "ALL") {
    const targetCity = filter.city.toLowerCase();
    entries = entries.filter((e) => (e.city || "").toLowerCase() === targetCity);
  }

  if (filter.hardinessZone && filter.hardinessZone !== "ALL") {
    entries = entries.filter((e) => e.hardinessZone === filter.hardinessZone);
  }

  entries.sort((a, b) => (b[sortField] || 0) - (a[sortField] || 0));
  return entries.slice(0, 50);
}
