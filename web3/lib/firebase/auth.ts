"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./client";

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Authentication is not configured.");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Authentication is not configured.");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch (e) {
      console.warn("Could not set display name:", e);
    }
  }
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Authentication is not configured.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (err: any) {
    if (err.code === "auth/unauthorized-domain") {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "this domain";
      throw new Error(
        `Domain "${currentHost}" is not authorized in Firebase. Please add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`
      );
    }
    if (err.code === "auth/popup-blocked") {
      throw new Error("Sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
    }
    if (err.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in window was closed before completing.");
    }
    throw err;
  }
}

export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
}
