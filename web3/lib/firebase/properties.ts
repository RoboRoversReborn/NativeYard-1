"use client";

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "./client";
import { getCurrentUser } from "./auth";
import { compressImageToOptimizedBlob } from "../camera";
import type { Property, YardArea, YardScan } from "../types";

/**
 * Fetch all properties for the currently authenticated user,
 * including nested yard areas and their recent scans.
 */
export async function getPropertiesWithAreas(): Promise<Property[]> {
  const db = getFirebaseDb();
  const user = getCurrentUser();
  if (!db || !user) return [];

  try {
    const propsQuery = query(
      collection(db, "properties"),
      where("user_id", "==", user.uid)
    );
    const propsSnapshot = await getDocs(propsQuery);

    const properties: Property[] = [];

    for (const propDoc of propsSnapshot.docs) {
      const propData = propDoc.data();
      const propId = propDoc.id;

      // Fetch yard areas for this property
      const areasQuery = query(
        collection(db, `properties/${propId}/yard_areas`),
        orderBy("created_at", "asc")
      );
      const areasSnapshot = await getDocs(areasQuery);

      const yardAreas: YardArea[] = [];

      for (const areaDoc of areasSnapshot.docs) {
        const areaData = areaDoc.data();
        const areaId = areaDoc.id;

        // Fetch recent scans for this yard area
        const scansQuery = query(
          collection(db, `properties/${propId}/yard_areas/${areaId}/yard_scans`),
          orderBy("created_at", "desc")
        );
        const scansSnapshot = await getDocs(scansQuery);

        const yardScans: YardScan[] = scansSnapshot.docs.map((sDoc) => {
          const sData = sDoc.data();
          return {
            id: sDoc.id,
            yard_area_id: areaId,
            photo_url: sData.photo_url || "",
            native_score: sData.native_score ?? 0,
            grade: sData.grade || "Eco Audit",
            plants_count: sData.plants_count || 0,
            native_count: sData.native_count || 0,
            non_native_count: sData.non_native_count || 0,
            invasive_count: sData.invasive_count || 0,
            keystone_count: sData.keystone_count || 0,
            detected_plants: sData.detected_plants || [],
            notes: sData.notes || "",
            created_at: formatTimestamp(sData.created_at),
          };
        });

        yardAreas.push({
          id: areaId,
          property_id: propId,
          name: areaData.name || "Yard Area",
          area_type: areaData.area_type || "other",
          sun_exposure: areaData.sun_exposure || "partial_sun",
          soil_type: areaData.soil_type || "loam",
          created_at: formatTimestamp(areaData.created_at),
          yard_scans: yardScans,
        });
      }

      properties.push({
        id: propId,
        user_id: user.uid,
        name: propData.name || "Primary Residence",
        address: propData.address || "",
        city: propData.city || "",
        state: propData.state || "NJ",
        zip: propData.zip || "",
        hardiness_zone: propData.hardiness_zone || "7a",
        created_at: formatTimestamp(propData.created_at),
        yard_areas: yardAreas,
      });
    }

    return properties;
  } catch (err) {
    console.error("Error fetching properties from Firestore:", err);
    return [];
  }
}

/**
 * Create a new property with default "Front Yard" and "Back Yard" areas.
 */
export async function createProperty(propertyData: Partial<Property>): Promise<Property> {
  const db = getFirebaseDb();
  const user = getCurrentUser();
  if (!db || !user) throw new Error("User must be authenticated to create a property");

  const newPropRef = doc(collection(db, "properties"));
  const now = new Date().toISOString();

  const propertyPayload = {
    user_id: user.uid,
    name: propertyData.name || "Primary Residence",
    address: propertyData.address || "",
    city: propertyData.city || "",
    state: propertyData.state || "NJ",
    zip: propertyData.zip || "",
    hardiness_zone: propertyData.hardiness_zone || "7a",
    created_at: now,
  };

  await setDoc(newPropRef, propertyPayload);

  // Automatically create default initial yard areas: Front Yard & Back Yard
  const defaultAreas = [
    { name: "Front Yard", area_type: "front", sun_exposure: "full_sun", soil_type: "loam", created_at: now },
    { name: "Back Yard", area_type: "back", sun_exposure: "partial_sun", soil_type: "loam", created_at: now },
  ];

  const createdAreas: YardArea[] = [];
  for (const defArea of defaultAreas) {
    const areaRef = doc(collection(db, `properties/${newPropRef.id}/yard_areas`));
    await setDoc(areaRef, { ...defArea, property_id: newPropRef.id });
    createdAreas.push({
      id: areaRef.id,
      property_id: newPropRef.id,
      ...defArea,
      yard_scans: [],
    } as YardArea);
  }

  return {
    id: newPropRef.id,
    ...propertyPayload,
    yard_areas: createdAreas,
  } as Property;
}

/**
 * Add a new yard area to an existing property.
 */
export async function createYardArea(
  propertyId: string,
  areaData: Partial<YardArea>
): Promise<YardArea> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured");

  const areaRef = doc(collection(db, `properties/${propertyId}/yard_areas`));
  const now = new Date().toISOString();

  const payload = {
    property_id: propertyId,
    name: areaData.name || "Custom Yard Area",
    area_type: areaData.area_type || "other",
    sun_exposure: areaData.sun_exposure || "partial_sun",
    soil_type: areaData.soil_type || "loam",
    created_at: now,
  };

  await setDoc(areaRef, payload);

  return {
    id: areaRef.id,
    ...payload,
    yard_scans: [],
  } as YardArea;
}

/**
 * Upload a yard photo to Firebase Cloud Storage and save the scan audit record.
 */
export async function saveYardScan(
  yardAreaId: string,
  {
    imageBlobOrDataUrl,
    score,
    scoreLabel,
    detections,
    counts,
    notes = "",
    propertyId,
  }: {
    imageBlobOrDataUrl: string;
    score: number;
    scoreLabel: string;
    detections: any[];
    counts?: { native?: number; non_native?: number; invasive?: number; keystone?: number };
    notes?: string;
    propertyId?: string;
  }
): Promise<YardScan> {
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  const user = getCurrentUser();

  if (!db || !user) throw new Error("User must be authenticated to save scans");

  let photoUrl = "";

  // 1. Optimize and upload image to Firebase Cloud Storage (Spark Free Tier optimization)
  if (
    storage &&
    typeof imageBlobOrDataUrl === "string" &&
    imageBlobOrDataUrl.startsWith("data:")
  ) {
    try {
      // Compress to high-efficiency WebP/JPEG (max 1280px, quality 0.8)
      // This reduces raw 8MB camera photos to ~90KB - 130KB, maximizing the Spark 5GB free tier
      const optimized = await compressImageToOptimizedBlob(imageBlobOrDataUrl, 1280, 0.8);
      const filename = `yard-photos/${user.uid}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${optimized.extension}`;
      const fileRef = ref(storage, filename);

      await uploadBytes(fileRef, optimized.blob, { contentType: optimized.contentType });
      photoUrl = await getDownloadURL(fileRef);
    } catch (e) {
      console.warn("Storage upload warning, saving inline reference:", e);
      photoUrl = imageBlobOrDataUrl;
    }
  } else {
    photoUrl = imageBlobOrDataUrl || "/samples/front-yard.jpg";
  }

  // Find target property path
  const targetPropId = propertyId || (await findPropertyForArea(db, user.uid, yardAreaId));
  const now = new Date().toISOString();

  const scanPayload = {
    yard_area_id: yardAreaId,
    user_id: user.uid,
    photo_url: photoUrl,
    native_score: score ?? 0,
    grade: scoreLabel || "Eco Audit",
    plants_count: detections.length,
    native_count: counts?.native || 0,
    non_native_count: counts?.non_native || 0,
    invasive_count: counts?.invasive || 0,
    keystone_count: counts?.keystone || 0,
    detected_plants: detections,
    notes: notes,
    created_at: now,
  };

  const scanRef = doc(
    collection(db, `properties/${targetPropId}/yard_areas/${yardAreaId}/yard_scans`)
  );
  await setDoc(scanRef, scanPayload);

  return {
    id: scanRef.id,
    ...scanPayload,
  } as YardScan;
}

async function findPropertyForArea(db: any, userId: string, areaId: string): Promise<string> {
  try {
    const propsQuery = query(collection(db, "properties"), where("user_id", "==", userId));
    const snap = await getDocs(propsQuery);
    for (const p of snap.docs) {
      const areaDoc = await getDoc(doc(db, `properties/${p.id}/yard_areas/${areaId}`));
      if (areaDoc.exists()) return p.id;
    }
    return snap.docs[0]?.id || "primary";
  } catch (e) {
    return "primary";
  }
}

function formatTimestamp(value: any): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (value.toDate && typeof value.toDate === "function") return value.toDate().toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  return String(value);
}
