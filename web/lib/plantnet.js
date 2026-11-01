/**
 * Plant ID adapter: Pl@ntNet API (free, non-commercial tier).
 * identify(cropBuffer, organ) → { candidates: [{ sci, common, genus, family, score }], remaining }
 */

const ORGAN_MAP = { flower: "flower", leaf: "leaf", fruit: "fruit", bark: "bark", habit: "auto" };

export async function identifyPlant(imageBuffer, organ = "auto", customApiKey = null) {
  const apiKey = customApiKey || process.env.PLANTNET_API_KEY;
  if (!apiKey) throw new Error("PLANTNET_API_KEY is not set");
  const project = process.env.PLANTNET_PROJECT || "all";

  const form = new FormData();
  form.append("images", new Blob([imageBuffer], { type: "image/jpeg" }), "plant.jpg");
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
    candidates: (data.results || []).slice(0, 3).map((r) => ({
      sci: r.species?.scientificNameWithoutAuthor,
      common: r.species?.commonNames?.[0] || null,
      genus: r.species?.genus?.scientificNameWithoutAuthor,
      family: r.species?.family?.scientificNameWithoutAuthor,
      score: r.score,
    })),
  };
}
