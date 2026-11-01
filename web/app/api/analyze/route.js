import { classify, computeScore, enrichPlant, COLOR_MAP } from "@/lib/classify";
import { SAMPLE_DATA } from "@/lib/sampleDetections";
import { detectPlants } from "@/lib/gemini";
import { identifyPlant } from "@/lib/plantnet";
import sharp from "sharp";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";

    const customGeminiKey = req.headers.get("x-gemini-api-key") || null;
    const customPlantnetKey = req.headers.get("x-plantnet-api-key") || null;

    // 1. Handle JSON payload (e.g. sample selection or base64 photo)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { sampleId, imageBase64, mimeType = "image/jpeg" } = body;

      // Sample image analysis
      if (sampleId && SAMPLE_DATA[sampleId]) {
        const sample = SAMPLE_DATA[sampleId];
        const enrichedPlants = sample.plants.map((p, idx) => enrichPlant(p, idx));
        const scoreReport = computeScore(enrichedPlants);

        return Response.json({
          success: true,
          mode: "sample",
          imageUrl: sample.filename,
          sampleName: sample.name,
          description: sample.description,
          plants: enrichedPlants,
          scoreReport
        });
      }

      // Base64 upload analysis via live Gemini + Pl@ntNet (if provided)
      if (imageBase64) {
        const buffer = Buffer.from(imageBase64, "base64");
        return await processUploadedBuffer(buffer, mimeType, customGeminiKey, customPlantnetKey);
      }
    }

    // 2. Handle multipart/form-data upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return Response.json({ error: "No image file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      return await processUploadedBuffer(buffer, file.type || "image/jpeg", customGeminiKey, customPlantnetKey);
    }

    return Response.json({ error: "Invalid request format" }, { status: 400 });
  } catch (err) {
    console.error("API /api/analyze error:", err);
    return Response.json(
      { error: err.message || "Failed to analyze yard photo" },
      { status: 500 }
    );
  }
}

async function processUploadedBuffer(fullImageBuffer, mimeType, customGeminiKey = null, customPlantnetKey = null) {
  // Auto-orient based on EXIF (crucial for mobile/iPhone cameras)
  const orientedBuffer = await sharp(fullImageBuffer)
    .rotate()
    .jpeg({ quality: 90 })
    .toBuffer();

  const metadata = await sharp(orientedBuffer).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 900;

  let rawDetections = [];
  const effectiveGeminiKey = customGeminiKey || process.env.GEMINI_API_KEY;
  const effectivePlantnetKey = customPlantnetKey || process.env.PLANTNET_API_KEY;
  const hasGeminiKey = Boolean(effectiveGeminiKey);
  const hasPlantnetKey = Boolean(effectivePlantnetKey);

  if (hasGeminiKey) {
    try {
      // Downscale to max 1280px for fast vision detection while keeping sharp resolution for crops
      const geminiImageBuffer = await sharp(orientedBuffer)
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      rawDetections = await detectPlants(geminiImageBuffer, "image/jpeg", effectiveGeminiKey);
    } catch (e) {
      console.warn("Gemini plant detection failed, falling back to heuristics:", e.message);
    }
  }

  // If Gemini wasn't configured or returned 0 items, provide intelligent defaults or prompt
  if (!rawDetections || rawDetections.length === 0) {
    if (!hasGeminiKey) {
      return Response.json({
        error: "Gemini API key is required to detect plants in your uploaded photo. Click '⚙️ API Key' in the header to enter your key, or select one of the 3 sample yards."
      }, { status: 400 });
    }
    return Response.json({
      error: "No distinct plants could be recognized in this photo. Try a clearer daytime photo of your garden bed."
    }, { status: 422 });
  }

  // Filter out lawn and cap to 12 plants
  const plantDetections = rawDetections.filter(d => d.kind !== "lawn").slice(0, 12);

  // If Pl@ntNet key is available, crop and query Pl@ntNet for each box in parallel
  const analyzedPlants = await Promise.all(
    plantDetections.map(async (item, idx) => {
      let finalSci = item.guessScientific;
      let finalCommon = item.guessCommon;
      let confidence = 0.85;

      if (hasPlantnetKey && item.box) {
        try {
          const [ymin, xmin, ymax, xmax] = item.box;
          const left = Math.max(0, Math.round((xmin / 1000) * width));
          const top = Math.max(0, Math.round((ymin / 1000) * height));
          const cropW = Math.min(width - left, Math.round(((xmax - xmin) / 1000) * width));
          const cropH = Math.min(height - top, Math.round(((ymax - ymin) / 1000) * height));

          if (cropW > 40 && cropH > 40) {
            const cropBuffer = await sharp(orientedBuffer)
              .extract({ left, top, width: cropW, height: cropH })
              .jpeg({ quality: 85 })
              .toBuffer();

            const pnResult = await identifyPlant(cropBuffer, item.organ || "auto", effectivePlantnetKey);
            if (pnResult.candidates && pnResult.candidates.length > 0) {
              const best = pnResult.candidates[0];
              finalSci = best.sci || finalSci;
              finalCommon = best.common || finalCommon;
              confidence = best.score || confidence;
            }
          }
        } catch (cropErr) {
          console.warn("Crop/Pl@ntNet failure for plant:", cropErr.message);
        }
      }

      return enrichPlant(
        {
          id: `det-${idx + 1}`,
          box: item.box,
          common: finalCommon,
          sci: finalSci,
          kind: item.kind,
          confidence,
          source: hasPlantnetKey ? "plantnet" : "gemini",
          organ: item.organ
        },
        idx
      );
    })
  );

  const scoreReport = computeScore(analyzedPlants);
  const dataUrl = `data:image/jpeg;base64,${orientedBuffer.toString("base64")}`;

  return Response.json({
    success: true,
    mode: "live",
    imageUrl: dataUrl,
    plants: analyzedPlants,
    scoreReport
  });
}
