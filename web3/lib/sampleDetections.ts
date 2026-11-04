import { rebuildAudit } from "./plants";
import type { Audit, Detection, SwapRecommendation } from "./types";

export type SampleYardKey = "front-yard" | "back-yard" | "side-yard";

export interface SampleYardConfig {
  id: SampleYardKey;
  name: string;
  tagline: string;
  filename: string;
  description: string;
  initialScore: number;
  initialScoreLabel: string;
  detections: Detection[];
}

export const SAMPLE_YARDS: Record<SampleYardKey, SampleYardConfig> = {
  "front-yard": {
    id: "front-yard",
    name: "Suburban NJ Front Yard",
    tagline: "Classic foundation planting with invasive shrubs & keystone oak",
    filename: "/samples/front-yard.jpg",
    description: "Typical New Jersey suburban front foundation with a mix of invasive Japanese Barberry, Burning Bush, and an overarching keystone Oak.",
    initialScore: 37,
    initialScoreLabel: "Eco-transitional",
    detections: [
      {
        id: "fy-1",
        plantId: "berberis-thunbergii",
        confidence: 0.96,
        box: { x: 8.5, y: 41.5, w: 19.0, h: 23.5 },
        note: "Dense spiny invasive shrub with red berries and yellow inner wood",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "fy-2",
        plantId: "euonymus-alatus",
        confidence: 0.94,
        box: { x: 25.5, y: 43.0, w: 15.5, h: 20.5 },
        note: "Invasive winged burning bush displacing native woodland understories",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "fy-3",
        plantId: "hosta",
        confidence: 0.98,
        box: { x: 35.5, y: 52.0, w: 16.5, h: 16.0 },
        note: "Benign non-native shade perennial; zero caterpillar host value",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "fy-4",
        plantId: "buxus-sempervirens",
        confidence: 0.95,
        box: { x: 49.8, y: 48.0, w: 14.2, h: 18.0 },
        note: "European boxwood hedge; highly vulnerable to boxwood blight",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "fy-5",
        plantId: "rudbeckia-fulgida",
        confidence: 0.92,
        box: { x: 59.5, y: 51.5, w: 18.0, h: 20.0 },
        note: "High-value native pollinator perennial; supports native bees and goldfinches",
        plantPart: "flower",
        source: "sample",
      },
      {
        id: "fy-6",
        plantId: "quercus-alba",
        confidence: 0.97,
        box: { x: 67.0, y: 4.0, w: 28.5, h: 63.5 },
        note: "#1 NJ Keystone Native tree hosting 500+ species of caterpillars",
        plantPart: "leaf",
        source: "sample",
      },
    ],
  },

  "back-yard": {
    id: "back-yard",
    name: "Pollinator Backyard Border",
    tagline: "Vibrant flower border featuring keystone native perennials & ivy",
    filename: "/samples/back-yard.jpg",
    description: "Lush sunny border along a fence line featuring milkweed, goldenrod, and highbush blueberry alongside invasive English Ivy.",
    initialScore: 59,
    initialScoreLabel: "Eco-transitional",
    detections: [
      {
        id: "by-1",
        plantId: "acer-palmatum",
        confidence: 0.95,
        box: { x: 12.0, y: 3.0, w: 38.0, h: 43.5 },
        note: "Japanese Maple ornamental specimen; benign non-native",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "by-2",
        plantId: "hydrangea-macrophylla",
        confidence: 0.93,
        box: { x: 13.0, y: 39.0, w: 14.0, h: 21.0 },
        note: "Bigleaf Hydrangea ornamental shrub; benign non-native",
        plantPart: "flower",
        source: "sample",
      },
      {
        id: "by-3",
        plantId: "asclepias-tuberosa",
        confidence: 0.97,
        box: { x: 33.5, y: 24.0, w: 18.5, h: 67.5 },
        note: "Essential host plant for Monarch butterfly caterpillars (Danaus plexippus)",
        plantPart: "flower",
        source: "sample",
      },
      {
        id: "by-4",
        plantId: "solidago-rugosa",
        confidence: 0.96,
        box: { x: 43.5, y: 40.5, w: 20.0, h: 21.5 },
        note: "Critical late-season keystone nectar source for migrating pollinators",
        plantPart: "flower",
        source: "sample",
      },
      {
        id: "by-5",
        plantId: "symphyotrichum-novae-angliae",
        confidence: 0.94,
        box: { x: 52.0, y: 54.5, w: 25.0, h: 38.5 },
        note: "Native keystone Aster hosting 100+ caterpillar species",
        plantPart: "flower",
        source: "sample",
      },
      {
        id: "by-6",
        plantId: "vaccinium-corymbosum",
        confidence: 0.91,
        box: { x: 56.0, y: 25.0, w: 27.5, h: 42.0 },
        note: "NJ state fruit; super-food for native birds, bumblebees, and mammals",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "by-7",
        plantId: "hedera-helix",
        confidence: 0.99,
        box: { x: 82.5, y: 8.0, w: 17.5, h: 63.0 },
        note: "Aggressive invasive evergreen vine smothering native trees and fencing",
        plantPart: "leaf",
        source: "sample",
      },
    ],
  },

  "side-yard": {
    id: "side-yard",
    name: "Woodland Edge Side Yard",
    tagline: "Overgrown boundary hedgerow with invasive privet & native dogwood",
    filename: "/samples/side-yard.jpg",
    description: "Side property line with dense invasive Callery pear and privet mixed with native flowering understory trees.",
    initialScore: 20,
    initialScoreLabel: "Invasive pressure",
    detections: [
      {
        id: "sy-1",
        plantId: "pyrus-calleryana",
        confidence: 0.94,
        box: { x: 13.0, y: 10.0, w: 39.0, h: 43.5 },
        note: "Banned NJ invasive Callery/Bradford pear with weak branch crotches",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "sy-2",
        plantId: "ligustrum-sinense",
        confidence: 0.92,
        box: { x: 27.5, y: 51.0, w: 20.0, h: 27.5 },
        note: "Dense invasive privet hedge crowding out native seedlings",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "sy-3",
        plantId: "rosa-multiflora",
        confidence: 0.95,
        box: { x: 42.0, y: 49.0, w: 17.5, h: 31.0 },
        note: "Thorny invasive multiflora rose forming impenetrable thickets",
        plantPart: "flower",
        source: "sample",
      },
      {
        id: "sy-4",
        plantId: "cornus-florida",
        confidence: 0.95,
        box: { x: 54.5, y: 22.5, w: 41.0, h: 45.5 },
        note: "Iconic NJ understory native tree with spring bracts and autumn berries",
        plantPart: "leaf",
        source: "sample",
      },
      {
        id: "sy-5",
        plantId: "hemerocallis-fulva",
        confidence: 0.97,
        box: { x: 76.0, y: 68.5, w: 23.5, h: 31.0 },
        note: "Invasive ditch lily spreading vigorously via underground rhizomes",
        plantPart: "flower",
        source: "sample",
      },
    ],
  },
};

export function buildSampleAudit(sampleKey: SampleYardKey, zip: string = "07645"): Audit {
  const config = SAMPLE_YARDS[sampleKey] || SAMPLE_YARDS["front-yard"];

  // Base audit structure
  const baseAudit: Audit = {
    id: `audit-${sampleKey}-${Date.now()}`,
    demoMode: true,
    createdAt: new Date().toISOString(),
    location: {
      zip,
      city: "Montvale",
      county: "Bergen",
      province: "PIEDMONT",
      zone: "6b",
      ecoregion: "Northern Piedmont",
      ecoregionCode: "EPA Level III 64",
      soilPh: "Piedmont clay/shale loam",
      state: "NJ",
      isNj: true,
    },
    detections: config.detections,
    score: config.initialScore,
    scoreLabel: config.initialScoreLabel,
    metrics: [],
    summary: config.description,
    hostGenera: 0,
    nativeShare: 0,
    invasiveShare: 0,
    swaps: [],
    source: "sample",
    image: { width: 1400, height: 900 },
  };

  // Run through standard ecological rebuild to dynamically populate swaps, scores, and metrics
  return rebuildAudit(baseAudit, config.detections);
}
