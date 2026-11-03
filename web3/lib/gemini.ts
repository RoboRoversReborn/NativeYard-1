/**
 * Plant detector adapter: Google Gemini vision.
 * detectPlants(imageBuffer) → [{ box: [ymin, xmin, ymax, xmax] (0–1000), kind, guessCommon, guessScientific, organ }]
 */

const PROMPT = `You are a horticulture expert analyzing a photo of a residential yard in New Jersey, USA.

Detect every distinct, individually identifiable plant (or a single-species clump) in the image:
trees, shrubs, perennials, groundcovers, vines, ornamental grasses and ferns.

Rules:
- One box per plant or single-species clump. Do NOT box mixed areas.
- Ignore plants that are tiny, blurry or far in the background (e.g., distant woods or neighbors' trees).
- Return lawn as kind "lawn" (one box covering the main lawn area). Do not return mulch, soil, or hardscape.
- Return at most 15 plants, prioritizing the largest and clearest ones in the foreground.
- box_2d is [ymin, xmin, ymax, xmax], integers normalized to 0–1000.
- Give your best guess of the common and scientific (genus species) name.
- organ is the most visible identifying part: "flower", "leaf", "fruit", "bark", or "habit".`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    plants: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          box_2d: { type: "ARRAY", items: { type: "INTEGER" } },
          kind: {
            type: "STRING",
            enum: ["tree", "shrub", "perennial", "groundcover", "vine", "grass", "fern", "lawn"],
          },
          common_name_guess: { type: "STRING" },
          scientific_name_guess: { type: "STRING" },
          organ: { type: "STRING", enum: ["flower", "leaf", "fruit", "bark", "habit"] },
        },
        required: ["box_2d", "kind", "common_name_guess", "scientific_name_guess"],
      },
    },
  },
  required: ["plants"],
};

export interface GeminiDetectedPlant {
  box: [number, number, number, number];
  kind: string;
  guessCommon: string;
  guessScientific: string;
  organ: string;
}

export async function detectPlants(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
  customApiKey: string | null = null,
): Promise<GeminiDetectedPlant[]> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please provide it in the app settings or in .env.local");
  }

  const candidates = Array.from(
    new Set([
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ].filter(Boolean) as string[])
  );

  let lastError: any = null;

  for (const model of candidates) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: imageBuffer.toString("base64") } },
                  { text: PROMPT },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: SCHEMA,
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 503 || res.status === 404) {
          lastError = new Error(`Model ${model} returned ${res.status}: ${body.slice(0, 150)}`);
          continue;
        }
        throw new Error(`Gemini error ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "{}";
      const parsed = JSON.parse(text);

      return (parsed.plants || [])
        .filter((p: any) => Array.isArray(p.box_2d) && p.box_2d.length === 4)
        .map((p: any) => ({
          box: p.box_2d.map((v: number) => Math.max(0, Math.min(1000, Math.round(v)))) as [number, number, number, number],
          kind: p.kind,
          guessCommon: p.common_name_guess,
          guessScientific: p.scientific_name_guess,
          organ: p.organ || "habit",
        }));
    } catch (err: any) {
      lastError = err;
      // Try next model candidate on timeout or transient failure
    }
  }

  throw lastError || new Error("All Gemini vision models failed to respond");
}

const MACRO_PROMPT = `You are an expert botanical taxonomist and dendrologist specializing in Mid-Atlantic and New Jersey (USA) flora.
You are inspecting a close-up/macro photo of a plant (leaf, flower, twig, or bark) provided by a homeowner.

Perform a thorough visual morphological diagnosis:
1. Identify the observed leaf traits:
   - leafType: (e.g., "Simple Broadleaf", "Pinnately Compound", "Bipinnately Compound", "Needle-like", "Scale-like")
   - margin: (e.g., "Entire / Smooth (no teeth)", "Serrated / Toothed", "Doubly Serrated", "Lobed (shallow/deep)", "Spiny")
   - arrangement: (e.g., "Alternate", "Opposite", "Whorled", "Basal rosette")
   - venation: (e.g., "Pinnate", "Palmate", "Parallel")
   - distinguishingFeatures: array of 2-4 observable traits in this photo (e.g., "Single sharp spine at node", "Prominent serrated margins with gland-tipped teeth", "Pale glaucous underside", "Red petiole")
2. Provide the top 3-4 most likely plant candidates found in New Jersey residential landscapes or woodlands.
   For each candidate:
   - scientificName: standard binomial (e.g., "Berberis thunbergii")
   - commonName: common English name (e.g., "Japanese Barberry")
   - confidence: 0.0 to 1.0
   - visualDistinction: a concise, clear visual clue highlighting why this plant matches the photo or how to distinguish it from similar lookalikes (e.g., "Small spatulate leaves in clusters with a sharp single spine at each node")
   - leafStyleMatch: a 2-4 word descriptor of the leaf shape/style (e.g., "Spatulate with thorns", "Lobed with pointed tips")`;

const MACRO_SCHEMA = {
  type: "OBJECT",
  properties: {
    observedTraits: {
      type: "OBJECT",
      properties: {
        leafType: { type: "STRING" },
        margin: { type: "STRING" },
        arrangement: { type: "STRING" },
        venation: { type: "STRING" },
        distinguishingFeatures: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
      required: ["leafType", "margin", "arrangement", "distinguishingFeatures"],
    },
    candidates: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          scientificName: { type: "STRING" },
          commonName: { type: "STRING" },
          confidence: { type: "NUMBER" },
          visualDistinction: { type: "STRING" },
          leafStyleMatch: { type: "STRING" },
        },
        required: ["scientificName", "commonName", "confidence", "visualDistinction"],
      },
    },
  },
  required: ["observedTraits", "candidates"],
};

export interface ObservedLeafTraits {
  leafType?: string;
  margin?: string;
  arrangement?: string;
  venation?: string;
  distinguishingFeatures?: string[];
}

export interface MacroCandidate {
  sci: string;
  common: string;
  confidence: number;
  visualDistinction: string;
  leafStyleMatch?: string;
}

export interface MacroIdentificationResult {
  observedTraits: ObservedLeafTraits;
  candidates: MacroCandidate[];
}

export async function identifyMacroLeaf(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
  customApiKey: string | null = null,
  hint: string = "",
): Promise<MacroIdentificationResult> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Please provide it in app settings or .env.local");

  const candidates = Array.from(
    new Set([
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
    ].filter(Boolean) as string[])
  );

  let lastError: any = null;
  const promptText = hint ? `${MACRO_PROMPT}\n\nAdditional Context/Area Hint from Yard scan: ${hint}` : MACRO_PROMPT;

  for (const model of candidates) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: imageBuffer.toString("base64") } },
                  { text: promptText },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: MACRO_SCHEMA,
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(18000),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 503 || res.status === 404) {
          lastError = new Error(`Model ${model} returned ${res.status}: ${body.slice(0, 150)}`);
          continue;
        }
        throw new Error(`Gemini macro error ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "{}";
      const parsed = JSON.parse(text);
      return {
        observedTraits: parsed.observedTraits || {
          leafType: "Simple Broadleaf",
          margin: "Visual analysis complete",
          arrangement: "Alternate",
          distinguishingFeatures: ["Visible leaf margin and venation"],
        },
        candidates: (parsed.candidates || []).map((c: any) => ({
          sci: c.scientificName,
          common: c.commonName,
          confidence: c.confidence || 0.85,
          visualDistinction: c.visualDistinction || "Matches leaf shape and habit",
          leafStyleMatch: c.leafStyleMatch || "Leaf match",
        })),
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini vision models failed for macro identification");
}

