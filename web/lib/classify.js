import { PLANTS, KEYSTONE_GENERA, GENUS_FALLBACK } from "./njPlants";

export const STATUS_META = {
  keystone: { label: "Native · Keystone", short: "Keystone", color: "#22c55e", points: 100 },
  native: { label: "Native to NJ", short: "Native", color: "#22c55e", points: 85 },
  na_native: { label: "Native to US (not NJ)", short: "US native", color: "#a3e635", points: 60 },
  non_native: { label: "Non-native", short: "Non-native", color: "#fb923c", points: 30 },
  invasive: { label: "Invasive in NJ", short: "Invasive", color: "#ef4444", points: 0 },
  unknown: { label: "Unknown", short: "Unknown", color: "#94a3b8", points: null },
};

/** Normalize a scientific name for lookup: lowercase, drop hybrid markers / extra spaces. */
export function normalizeName(name = "") {
  return name
    .toLowerCase()
    .replace(/×/g, " ")
    .replace(/\s+x\s+/g, " ")
    .replace(/[^a-z\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INDEX = new Map();
for (const p of PLANTS) {
  INDEX.set(normalizeName(p.sci), p);
  for (const s of p.synonyms || []) INDEX.set(normalizeName(s), p);
}

export function findPlant(sciName) {
  const n = normalizeName(sciName);
  if (!n) return null;
  if (INDEX.has(n)) return INDEX.get(n);
  const binomial = n.split(" ").slice(0, 2).join(" ");
  if (INDEX.has(binomial)) return INDEX.get(binomial);
  return null;
}

function genusOf(sciName = "") {
  const g = sciName.replace(/^×\s*/, "").trim().split(/\s+/)[0] || "";
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

/** Classify a scientific name for New Jersey. */
export function classify(sciName) {
  const genus = genusOf(sciName);
  const entry = findPlant(sciName);
  let status = entry?.status;
  let matchLevel = entry ? "species" : null;

  if (!status && GENUS_FALLBACK[genus]) {
    status = GENUS_FALLBACK[genus];
    matchLevel = "genus";
  }
  if (!status) status = "unknown";

  const isKeystone = status === "native" && genus in KEYSTONE_GENERA;
  const displayStatus = isKeystone ? "keystone" : status;

  const substitutes = (entry?.subs || []).map((s) => {
    const sub = findPlant(s);
    const subGenus = genusOf(s);
    return {
      sci: s,
      common: sub?.common || s,
      type: sub?.type,
      keystone: subGenus in KEYSTONE_GENERA,
    };
  });

  return {
    status: displayStatus,
    baseStatus: status,
    matchLevel,
    genus,
    keystone: isKeystone,
    caterpillarHosts: isKeystone ? KEYSTONE_GENERA[genus] : null,
    knownCommon: entry?.common || null,
    note: entry?.note || null,
    substitutes,
  };
}

/** Compute the yard Native Score (0–100) and summary stats. */
export function computeScore(plants) {
  const counted = plants.filter((p) => p.status !== "unknown");
  const counts = { keystone: 0, native: 0, na_native: 0, non_native: 0, invasive: 0, unknown: 0 };
  for (const p of plants) counts[p.status] = (counts[p.status] || 0) + 1;

  if (counted.length === 0) {
    return { score: null, grade: "Not enough data", counts, breakdown: [], caterpillarSpecies: 0 };
  }

  const avg = counted.reduce((s, p) => s + STATUS_META[p.status].points, 0) / counted.length;
  const invasivePenalty = Math.min(25, counts.invasive * 5);
  const nativeSpecies = new Set(
    counted.filter((p) => p.status === "native" || p.status === "keystone").map((p) => p.sci)
  );
  const keystoneBonus = counts.keystone > 0 ? 5 : 0;
  const diversityBonus = nativeSpecies.size >= 3 ? 5 : 0;

  const score = Math.max(0, Math.min(100, Math.round(avg - invasivePenalty + keystoneBonus + diversityBonus)));

  // Caterpillar support: sum host counts across distinct keystone genera.
  const genera = new Map();
  for (const p of counted) if (p.keystone) genera.set(p.genus, p.caterpillarHosts);
  const caterpillarSpecies = [...genera.values()].reduce((a, b) => a + b, 0);

  let grade, message;
  if (score >= 80) {
    grade = "Pollinator Paradise";
    message = "Your yard is a strong habitat for pollinators and birds. Keep it up!";
  } else if (score >= 60) {
    grade = "Native Friendly";
    message = "A great foundation. A few swaps will make a big difference.";
  } else if (score >= 40) {
    grade = "Room to Grow";
    message = "You have some natives. Replacing invasives is your fastest win.";
  } else {
    grade = "Big Opportunity";
    message = "Small changes here will have a huge impact on local wildlife.";
  }

  return {
    score,
    grade,
    message,
    counts,
    caterpillarSpecies,
    breakdown: [
      { label: "Plant mix (average)", value: Math.round(avg) },
      { label: `Invasive penalty (${counts.invasive} × −5)`, value: -invasivePenalty },
      { label: "Keystone plant bonus", value: keystoneBonus },
      { label: "Native diversity bonus (3+ species)", value: diversityBonus },
    ],
  };
}

export const COLOR_MAP = {
  keystone: {
    color: "#16a34a",
    borderColor: "#22c55e",
    bgTag: "rgba(34, 197, 94, 0.15)",
    label: "Native (Keystone)",
    badge: "🌟 Native · Keystone",
    type: "native"
  },
  native: {
    color: "#16a34a",
    borderColor: "#22c55e",
    bgTag: "rgba(34, 197, 94, 0.15)",
    label: "Native to NJ",
    badge: "🟢 Native",
    type: "native"
  },
  na_native: {
    color: "#65a30d",
    borderColor: "#84cc16",
    bgTag: "rgba(132, 204, 22, 0.15)",
    label: "US Native (not local to NJ)",
    badge: "🌱 US Native",
    type: "native"
  },
  non_native: {
    color: "#ea580c",
    borderColor: "#f97316",
    bgTag: "rgba(249, 115, 22, 0.15)",
    label: "Non-native",
    badge: "🟠 Non-native",
    type: "non_native"
  },
  invasive: {
    color: "#dc2626",
    borderColor: "#ef4444",
    bgTag: "rgba(239, 68, 68, 0.15)",
    label: "Invasive in NJ",
    badge: "🔴 Invasive",
    type: "invasive"
  },
  unknown: {
    color: "#64748b",
    borderColor: "#94a3b8",
    bgTag: "rgba(148, 163, 184, 0.15)",
    label: "Unverified",
    badge: "⚪ Unverified",
    type: "unknown"
  }
};

export function enrichPlant(raw, index) {
  const c = classify(raw.sci || raw.guessScientific || "");
  // Prioritize explicitly confirmed/verified status from user selection or macro match
  let status = (raw.status && raw.status !== "unknown") ? raw.status : c.status;

  // If user verified via manual selection or macro match, ensure it is assigned a concrete verified status
  if ((!status || status === "unknown") && (raw.source === "manual_selection" || raw.source === "macro_leaf_match")) {
    status = raw.styling?.type || "non_native";
  }
  if (!status) status = "unknown";

  const isKeystone = status === "keystone" || (status === "native" && c.keystone);
  const styling = COLOR_MAP[status] || COLOR_MAP.unknown;

  return {
    id: raw.id || `plant-${index + 1}`,
    index: index + 1,
    box: raw.box,
    common: raw.common || c.knownCommon || raw.guessCommon || "Unverified Plant",
    sci: raw.sci || raw.guessScientific || "Unknown species",
    kind: raw.kind || "plant",
    confidence: raw.confidence ?? 0.85,
    source: raw.source || "gemini_plantnet",
    organ: raw.organ || "leaf",
    status,
    styling,
    isKeystone,
    genus: c.genus,
    caterpillarHosts: c.caterpillarHosts,
    note: raw.note || c.note,
    substitutes: c.substitutes || []
  };
}
