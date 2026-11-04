"use client";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "./client";
import { compressImageToOptimizedBlob } from "../camera";
import type { Plant } from "../types";

/**
 * Fetch all curated plants from Firestore `plants` collection.
 */
export async function fetchPlantsFromDb(): Promise<Plant[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const snap = await getDocs(collection(db, "plants"));
    if (snap.empty) return [];

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        commonName: data.common_name || data.commonName || d.id,
        scientificName: data.scientific_name || data.scientificName || "",
        status: data.status || "native",
        njStatus: data.nj_status || data.njStatus || "NATIVE",
        type: data.type || "Perennial",
        growthHabit: data.growth_habit || data.growthHabit || "PERENNIAL_FORB",
        sun: data.sun || "Full Sun",
        moisture: data.moisture || "Medium",
        bloom: data.bloom || "Summer",
        height: data.height || "2-4 ft",
        description: data.description || "",
        deerResistance: data.deer_resistance || data.deerResistance || "MODERATE",
        specialistBeeSupport: Boolean(data.specialist_bee_support ?? data.specialistBeeSupport),
        swapIds: Array.isArray(data.swap_ids || data.swapIds) ? (data.swap_ids || data.swapIds) : [],
        lepidoptera: Number(data.lepidoptera) || 0,
        removal: data.removal || undefined,
        imageUrl: data.image_url || data.imageUrl || undefined,
        ornamentalFeatures: data.ornamental_features || data.ornamentalFeatures || [],
      } as Plant;
    });
  } catch (err) {
    console.error("Error fetching plants from Firestore:", err);
    return [];
  }
}

/**
 * Upsert a single plant record in Firestore.
 */
export async function upsertPlantInDb(plant: Plant): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured");

  const docRef = doc(db, "plants", plant.id);

  const payload = {
    id: plant.id,
    common_name: plant.commonName,
    scientific_name: plant.scientificName,
    status: plant.status,
    nj_status: plant.njStatus,
    type: plant.type,
    growth_habit: plant.growthHabit || "PERENNIAL_FORB",
    sun: plant.sun,
    moisture: plant.moisture,
    bloom: plant.bloom,
    height: plant.height,
    description: plant.description,
    deer_resistance: plant.deerResistance || "MODERATE",
    specialist_bee_support: Boolean(plant.specialistBeeSupport),
    swap_ids: plant.swapIds || [],
    lepidoptera: plant.lepidoptera || 0,
    removal: plant.removal || null,
    image_url: plant.imageUrl || null,
    ornamental_features: plant.ornamentalFeatures || [],
    updated_at: new Date().toISOString(),
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Delete a plant from Firestore.
 */
export async function deletePlantFromDb(plantId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured");
  await deleteDoc(doc(db, "plants", plantId));
}

/**
 * Batch sync local botanical plants into Firestore.
 */
export async function batchSyncPlantsToDb(plants: Plant[]): Promise<number> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured");

  // Firestore allows up to 500 writes in a batch
  const chunkSize = 400;
  let count = 0;

  for (let i = 0; i < plants.length; i += chunkSize) {
    const chunk = plants.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const plant of chunk) {
      const docRef = doc(db, "plants", plant.id);
      batch.set(
        docRef,
        {
          id: plant.id,
          common_name: plant.commonName,
          scientific_name: plant.scientificName,
          status: plant.status,
          nj_status: plant.njStatus,
          type: plant.type,
          growth_habit: plant.growthHabit || "PERENNIAL_FORB",
          sun: plant.sun,
          moisture: plant.moisture,
          bloom: plant.bloom,
          height: plant.height,
          description: plant.description,
          deer_resistance: plant.deerResistance || "MODERATE",
          specialist_bee_support: Boolean(plant.specialistBeeSupport),
          swap_ids: plant.swapIds || [],
          lepidoptera: plant.lepidoptera || 0,
          removal: plant.removal || null,
          image_url: plant.imageUrl || null,
          ornamental_features: plant.ornamentalFeatures || [],
          synced_at: new Date().toISOString(),
        },
        { merge: true }
      );
      count++;
    }

    await batch.commit();
  }

  return count;
}

/**
 * Upload a plant image to Firebase Cloud Storage.
 * Optimizes the image client-side to keep storage minimal on Spark Free tier.
 */
export async function uploadPlantImageToStorage(file: File, plantId: string): Promise<string> {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage is not configured");

  try {
    const optimized = await compressImageToOptimizedBlob(file, 1000, 0.85);
    const fileRef = ref(storage, `plants/${plantId}.${optimized.extension}`);
    await uploadBytes(fileRef, optimized.blob, { contentType: optimized.contentType });
    return await getDownloadURL(fileRef);
  } catch (e) {
    const ext = file.name.split(".").pop() || "jpg";
    const fileRef = ref(storage, `plants/${plantId}.${ext}`);
    await uploadBytes(fileRef, file, { contentType: file.type || "image/jpeg" });
    return await getDownloadURL(fileRef);
  }
}
