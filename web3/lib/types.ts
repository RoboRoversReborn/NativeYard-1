export type PlantStatus = "keystone" | "native" | "non-native" | "invasive";

export type PlantType =
  | "Tree"
  | "Shrub"
  | "Perennial"
  | "Groundcover"
  | "Vine"
  | "Grass"
  | "Fern";

export type NjPlantStatus =
  | "NATIVE_KEYSTONE"
  | "NATIVE"
  | "NON_NATIVE_BENIGN"
  | "INVASIVE_REGULATED"
  | "INVASIVE_WATCHLIST";

export type NjGrowthHabit =
  | "CANOPY_TREE"
  | "UNDERSTORY_TREE"
  | "SHRUB"
  | "PERENNIAL_FORB"
  | "GRAMINOID"
  | "VINE"
  | "GROUNDCOVER"
  | "FERN";

export type NjDeerResistance = "HIGH" | "MODERATE" | "LOW";

export type NjLight = "FULL_SUN" | "PART_SHADE" | "FULL_SHADE";
export type NjMoisture = "DRY" | "MEDIUM" | "WET";

export type NjOrnamentalFeature =
  | "RED_FALL_FOLIAGE"
  | "WINTER_BERRIES"
  | "FRAGRANT"
  | "EVERGREEN"
  | "SHOWY_BLOOMS";

export type RemovalProtocol = {
  method: string;
  timing: string;
  safety: string;
  disposal: string;
};

export type Plant = {
  id: string;
  commonName: string;
  scientificName: string;
  status: PlantStatus;
  type: PlantType;
  sun: string;
  moisture: string;
  bloom: string;
  height: string;
  description: string;
  lepidoptera?: number;
  swapIds?: string[];
  removal?: RemovalProtocol;
  njStatus?: NjPlantStatus;
  njStatusLabel?: string;
  growthHabit?: NjGrowthHabit;
  deerResistance?: NjDeerResistance;
  specialistBeeSupport?: boolean;
  bloomMonths?: number[];
  matureHeightFt?: [number, number];
  ornamentalFeatures?: NjOrnamentalFeature[];
  imageUrl?: string;
};

export type BoundingBox = {
  x: number; // Percentage 0 - 100
  y: number; // Percentage 0 - 100
  w: number; // Percentage 0 - 100
  h: number; // Percentage 0 - 100
};

export type Detection = {
  id: string;
  plantId: string;
  confidence: number;
  box: BoundingBox;
  areaSqFt?: number;
  note?: string;
  needsReview?: boolean;
  verified?: boolean;
  verificationMethod?:
    | "manual_select"
    | "macro_camera"
    | "macro_upload"
    | "top_match"
    | "user_confirmed";
  plantPart?: string;
  topMatches?: VisionMatch[];
  polygon?: Array<[number, number]>;
  isUserDrawn?: boolean;
  source?: string;
};

export type VisionMatch = {
  scientificName: string;
  commonName?: string;
  confidence: number;
  plantId?: string;
};

export type Region = {
  zip: string;
  zone: string;
  ecoregion: string;
  ecoregionCode: string;
  city: string;
  state: string;
  county?: string;
  province?: string;
  soilPh?: string;
  isNj?: boolean;
  isEstimate?: boolean;
  notice?: string;
};

export type ScoreMetric = {
  label: string;
  value: string;
  hint: string;
  tone: "good" | "warn" | "bad" | "neutral";
};

export type SwapRecommendation = {
  id: string;
  fromPlantId: string;
  toPlantIds: string[];
  priority: "high" | "medium" | "low";
  areaSqFt: number;
  headline: string;
  ecoGain: string;
  effort: string;
  season: string;
};

export type AuditImage = {
  width: number;
  height: number;
};

export type Audit = {
  id: string;
  demoMode: boolean;
  createdAt: string;
  location: Region;
  detections: Detection[];
  score: number;
  scoreLabel: string;
  metrics: ScoreMetric[];
  summary: string;
  hostGenera: number;
  nativeShare: number;
  invasiveShare: number;
  swaps: SwapRecommendation[];
  notice?: string;
  image?: AuditImage;
  source?: "sample" | "upload";
  imageUrl?: string;
  dataVersion?: string;
  reviewCount?: number;
};

export type VisionDetection = {
  scientificName: string;
  commonName?: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: string;
  organ?: string;
  note?: string;
  isPlant?: boolean;
  plantPart?: string;
  topMatches?: VisionMatch[];
  polygon?: Array<[number, number]>;
};

export type NjPlantRecord = {
  id: string;
  legacyPlantId: string;
  scientificName: string;
  commonName: string;
  status: PlantStatus;
  njStatus: NjPlantStatus;
  type: PlantType;
  growthHabit: NjGrowthHabit;
  sun: string;
  lightRange: NjLight[];
  moisture: string;
  moistureRange: NjMoisture[];
  bloom: string;
  bloomMonths: number[];
  height: string;
  matureHeightFt: [number, number];
  lepidoptera: number;
  lepidopteraCount: number;
  specialistBeeSupport: boolean;
  deerResistance: NjDeerResistance;
  ornamentalFeatures: NjOrnamentalFeature[];
  description: string;
  removalProtocolId?: string;
};

export type NjRemovalProtocol = RemovalProtocol & {
  id: string;
  plantId: string;
};

export type NjReplacement = {
  mappingId: string;
  targetPlantId: string;
  substitutePlantId: string;
  matchReason: string;
  removalProtocolId: string | null;
  priority: "high" | "medium";
  isPrimary: boolean;
};

export type NjRegionRecord = {
  zip: string;
  city: string;
  county: string;
  province: string;
  zone: string;
  ecoregion: string;
  ecoregionCode: string;
  soilPh: string;
  state: string;
  isNj: boolean;
  isEstimate: boolean;
};

export type NjCounty = {
  name: string;
  province: string;
  zone: string;
  ecoregion: string;
  ecoregionCode: string;
  soilPh: string;
};

export type NjNursery = {
  id: string;
  name: string;
  county: string;
  location: string;
  note: string;
  url: string;
  lastVerified: string;
};

export type NjSynonym = {
  synonym: string;
  acceptedPlantId: string;
};

export type NjDataset = {
  meta: {
    version: string;
    generatedAt: string;
    locale: string;
    ecoregion: string;
    sources: string[];
    notes: string;
  };
  plants: NjPlantRecord[];
  removalProtocols: NjRemovalProtocol[];
  replacements: NjReplacement[];
  regions: NjRegionRecord[];
  counties: NjCounty[];
  nurseries: NjNursery[];
  synonyms: NjSynonym[];
};

// Property Management Models (Firestore / Cloud Database)
export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  hardiness_zone: string;
  created_at: string;
  yard_areas?: YardArea[];
}

export interface YardArea {
  id: string;
  property_id: string;
  name: string;
  area_type: "front" | "back" | "side" | "patio" | "other";
  sun_exposure?: string;
  soil_type?: string;
  created_at?: string;
  yard_scans?: YardScan[];
}

export interface YardScan {
  id: string;
  yard_area_id: string;
  photo_url: string;
  native_score: number;
  grade: string;
  plants_count: number;
  native_count: number;
  non_native_count: number;
  invasive_count: number;
  keystone_count: number;
  detected_plants: Detection[];
  notes?: string;
  created_at: string;
}
