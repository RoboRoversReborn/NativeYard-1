/**
 * Plant ID adapter: Pl@ntNet API (free, non-commercial tier).
 * identifyPlant(cropBuffer, organ) → { candidates: [{ sci, common, genus, family, score }], remaining }
 */

const ORGAN_MAP: Record<string, string> = {
  flower: "flower",
  leaf: "leaf",
  fruit: "fruit",
  bark: "bark",
  habit: "auto",
};

export interface PlantNetCandidate {
  sci: string;
  common: string | null;
  genus?: string;
  family?: string;
  score: number;
}

export interface PlantNetResult {
  remaining: number | null;
  candidates: PlantNetCandidate[];
}

export async function identifyPlant(
  imageBuffer: Buffer,
  organ: string = "auto",
  customApiKey: string | null = null,
): Promise<PlantNetResult> {
  const apiKey = customApiKey || process.env.PLANTNET_API_KEY;
  if (!apiKey) throw new Error("PLANTNET_API_KEY is not set");
  const project = process.env.PLANTNET_PROJECT || "all";

  const form = new FormData();
  form.append("images", new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" }), "plant.jpg");
  form.append("organs", ORGAN_MAP[organ] || "auto");

  const url =
    `https://my-api.plantnet.org/v2/identify/${project}` +
    `?api-key=${encodeURIComponent(apiKey)}&nb-results=3&lang=en&include-related-images=false`;

  const res = await fetch(url, { method: "POST", body: form });

  if (res.status === 404) return { candidates: [], remaining: null }; // "Species not found"
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pl@ntNet error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    remaining: data.remainingIdentificationRequests ?? null,
    candidates: (data.results || []).slice(0, 3).map((r: any) => ({
      sci: r.species?.scientificNameWithoutAuthor,
      common: r.species?.commonNames?.[0] || null,
      genus: r.species?.genus?.scientificNameWithoutAuthor,
      family: r.species?.family?.scientificNameWithoutAuthor,
      score: r.score,
    })),
  };
}
