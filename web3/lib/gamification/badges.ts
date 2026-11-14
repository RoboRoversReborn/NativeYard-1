import type { BadgeDefinition, BadgeProgress } from "../types";

export interface BadgeEvaluationContext {
  totalScans: number;
  scannedAreasCount: number;
  bestScore: number;
  maxNativeSharePct: number;
  totalKeystones: number;
  maxCaterpillarCapacity: number;
  invasivesRemoved: number;
  maxAreaScoreImprovement: number;
  distinctMonthsCount: number;
  usedMacroVerification: boolean;
}

export interface EvaluatedBadge {
  definition: BadgeDefinition;
  unlocked: boolean;
  progress: BadgeProgress;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: "first_audit",
    name: "First Yard Audit",
    description: "Save your first yard scan to start tracking your ecological score.",
    category: "getting_started",
    icon: "🌱",
    xpReward: 50,
  },
  {
    id: "property_mapper",
    name: "Property Mapper",
    description: "Scan at least 2 distinct yard areas (e.g., Front Yard & Back Yard).",
    category: "getting_started",
    icon: "🗺️",
    xpReward: 75,
  },
  {
    id: "macro_botanist",
    name: "Macro Botanist",
    description: "Verify a plant using close-up leaf/flower macro identification.",
    category: "getting_started",
    icon: "🔬",
    xpReward: 75,
  },
  {
    id: "keystone_guardian",
    name: "Keystone Guardian",
    description: "Document at least 1 Keystone Native plant (Oak, Cherry, Goldenrod, etc.).",
    category: "ecological",
    icon: "⭐",
    xpReward: 100,
  },
  {
    id: "caterpillar_haven",
    name: "Caterpillar Haven",
    description: "Reach 250+ lepidoptera (caterpillar) host capacity in a single yard scan.",
    category: "ecological",
    icon: "🦋",
    xpReward: 150,
  },
  {
    id: "native_majority",
    name: "Native Majority",
    description: "Achieve 70% or higher native plants in a saved yard scan.",
    category: "ecological",
    icon: "🌿",
    xpReward: 150,
  },
  {
    id: "eco_sanctuary",
    name: "Eco-Sanctuary",
    description: "Earn a Yard Native Score of 85 or higher.",
    category: "ecological",
    icon: "🏆",
    xpReward: 200,
  },
  {
    id: "invasive_buster",
    name: "Invasive Buster",
    description: "Reduce invasive plant count in a re-scan of the same yard area.",
    category: "progress",
    icon: "🪓",
    xpReward: 175,
  },
  {
    id: "comeback_yard",
    name: "Comeback Yard",
    description: "Improve a yard area's Native Score by +15 points or more over time.",
    category: "progress",
    icon: "📈",
    xpReward: 200,
  },
  {
    id: "seasonal_steward",
    name: "Seasonal Steward",
    description: "Log yard scans across 2 or more different calendar months.",
    category: "progress",
    icon: "📅",
    xpReward: 125,
  },
];

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((b) => b.id === id);
}

/**
 * Evaluate all badges against the user's current ecological stats.
 */
export function evaluateBadges(ctx: BadgeEvaluationContext): EvaluatedBadge[] {
  const progressMap: Record<string, BadgeProgress> = {
    first_audit: {
      current: Math.min(ctx.totalScans, 1),
      target: 1,
      unit: "scan",
    },
    property_mapper: {
      current: Math.min(ctx.scannedAreasCount, 2),
      target: 2,
      unit: "areas",
    },
    macro_botanist: {
      current: ctx.usedMacroVerification ? 1 : 0,
      target: 1,
      unit: "macro",
    },
    keystone_guardian: {
      current: Math.min(ctx.totalKeystones, 1),
      target: 1,
      unit: "keystone",
    },
    caterpillar_haven: {
      current: Math.min(ctx.maxCaterpillarCapacity, 250),
      target: 250,
      unit: "species",
    },
    native_majority: {
      current: Math.min(Math.round(ctx.maxNativeSharePct), 70),
      target: 70,
      unit: "%",
    },
    eco_sanctuary: {
      current: Math.min(ctx.bestScore, 85),
      target: 85,
      unit: "pts",
    },
    invasive_buster: {
      current: Math.min(ctx.invasivesRemoved, 1),
      target: 1,
      unit: "removed",
    },
    comeback_yard: {
      current: Math.min(Math.max(0, ctx.maxAreaScoreImprovement), 15),
      target: 15,
      unit: "pts gain",
    },
    seasonal_steward: {
      current: Math.min(ctx.distinctMonthsCount, 2),
      target: 2,
      unit: "months",
    },
  };

  return BADGE_CATALOG.map((definition) => {
    const progress = progressMap[definition.id] || { current: 0, target: 1 };
    const unlocked = progress.current >= progress.target;
    return {
      definition,
      unlocked,
      progress,
    };
  });
}
