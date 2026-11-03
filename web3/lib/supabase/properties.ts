import { createClient } from "./client";
import type { Property, YardArea, YardScan } from "../types";

/**
 * Fetch all properties for a user, including nested yard areas and their recent scans.
 */
export async function getPropertiesWithAreas(): Promise<Property[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data: properties, error } = await supabase
    .from("properties")
    .select(`
      id,
      name,
      address,
      city,
      state,
      zip,
      hardiness_zone,
      created_at,
      yard_areas (
        id,
        name,
        area_type,
        sun_exposure,
        soil_type,
        created_at,
        yard_scans (
          id,
          yard_area_id,
          photo_url,
          native_score,
          grade,
          plants_count,
          native_count,
          non_native_count,
          invasive_count,
          keystone_count,
          detected_plants,
          notes,
          created_at
        )
      )
    `)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching properties:", error.message);
    return [];
  }

  // Ensure all yard_scans are sorted newest first
  for (const prop of (properties as Property[]) || []) {
    for (const area of prop.yard_areas || []) {
      if (area.yard_scans && Array.isArray(area.yard_scans)) {
        area.yard_scans.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    }
  }

  return (properties as Property[]) || [];
}

/**
 * Create a new property with default "Front Yard" and "Back Yard" areas.
 */
export async function createProperty(propertyData: Partial<Property>): Promise<Property> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be authenticated to create a property");

  // 1. Insert property
  const { data: property, error: propError } = await supabase
    .from("properties")
    .insert([
      {
        user_id: user.id,
        name: propertyData.name || "Primary Residence",
        address: propertyData.address || "",
        city: propertyData.city || "",
        state: propertyData.state || "NJ",
        zip: propertyData.zip || "",
        hardiness_zone: propertyData.hardiness_zone || "7a",
      },
    ])
    .select()
    .single();

  if (propError) throw propError;

  // 2. Automatically create default initial yard areas: Front Yard & Back Yard
  const defaultAreas = [
    { property_id: property.id, name: "Front Yard", area_type: "front" },
    { property_id: property.id, name: "Back Yard", area_type: "back" },
  ];

  const { data: areas, error: areaError } = await supabase
    .from("yard_areas")
    .insert(defaultAreas)
    .select();

  if (areaError) console.warn("Error creating default areas:", areaError.message);

  return { ...property, yard_areas: areas || [] } as Property;
}

/**
 * Add a new yard area to an existing property.
 */
export async function createYardArea(
  propertyId: string,
  areaData: Partial<YardArea>
): Promise<YardArea> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("yard_areas")
    .insert([
      {
        property_id: propertyId,
        name: areaData.name || "Custom Yard Area",
        area_type: areaData.area_type || "other",
        sun_exposure: areaData.sun_exposure || "partial_sun",
        soil_type: areaData.soil_type || "loam",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as YardArea;
}

/**
 * Upload a yard photo to Supabase Storage and save the scan audit record.
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
  }: {
    imageBlobOrDataUrl: string;
    score: number;
    scoreLabel: string;
    detections: any[];
    counts?: { native?: number; non_native?: number; invasive?: number; keystone?: number };
    notes?: string;
  }
): Promise<YardScan> {
  const supabase = createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User must be authenticated to save scans");

  let photoUrl = "";

  // 1. Upload image to Supabase Storage if dataUrl
  if (typeof imageBlobOrDataUrl === "string" && imageBlobOrDataUrl.startsWith("data:")) {
    try {
      const res = await fetch(imageBlobOrDataUrl);
      const blob = await res.blob();
      const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("yard-photos")
        .upload(filename, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from("yard-photos")
          .getPublicUrl(uploadData.path);
        photoUrl = publicUrlData.publicUrl;
      } else {
        console.warn("Storage upload warning, using inline reference:", uploadError?.message);
        photoUrl = imageBlobOrDataUrl;
      }
    } catch (e) {
      console.warn("Failed to upload image blob, saving inline reference:", e);
      photoUrl = imageBlobOrDataUrl;
    }
  } else {
    photoUrl = imageBlobOrDataUrl || "/samples/front-yard.jpg";
  }

  // 2. Insert record into yard_scans
  const { data: scanRecord, error: scanError } = await supabase
    .from("yard_scans")
    .insert([
      {
        yard_area_id: yardAreaId,
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
      },
    ])
    .select()
    .single();

  if (scanError) throw scanError;
  return scanRecord as YardScan;
}
