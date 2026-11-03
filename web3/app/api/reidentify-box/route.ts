import { NextRequest } from "next/server";
import sharp from "sharp";
import { findPlantCandidates, getOrCreateFallbackPlant } from "@/lib/plants";
import { registerPlant } from "@/lib/nj-data";
import { identifyPlant } from "@/lib/plantnet";
import type { Detection, BoundingBox, Plant } from "@/lib/types";

export const maxDuration = 60;

const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

function getGeminiModel() {
  return process.env.GEMINI_MODEL || process.env.GEMINI_VISION_MODEL || DEFAULT_GEMINI_MODEL;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, box, zip = "07645", existingDetectionId } = body;

    if (!image || !box) {
      return Response.json(
        { error: "Image data and bounding box are required." },
        { status: 400 }
      );
    }

    const base64Data = String(image).replace(/^data:image\/\w+;base64,/, "");
    const fullBuffer = Buffer.from(base64Data, "base64");

    // Auto-orient based on EXIF
    const orientedBuffer = await sharp(fullBuffer)
      .rotate()
      .jpeg({ quality: 90 })
      .toBuffer();

    const metadata = await sharp(orientedBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 900;

    // Calculate pixel coordinates for crop
    const left = Math.max(0, Math.min(width - 10, Math.round((Number(box.x) / 100) * width)));
    const top = Math.max(0, Math.min(height - 10, Math.round((Number(box.y) / 100) * height)));
    const cropW = Math.max(20, Math.min(width - left, Math.round((Number(box.w) / 100) * width)));
    const cropH = Math.max(20, Math.min(height - top, Math.round((Number(box.h) / 100) * height)));

    const cropBuffer = await sharp(orientedBuffer)
      .extract({ left, top, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Gemini API key is unconfigured for plant identification." },
        { status: 500 }
      );
    }

    let identified = await identifyFoliageCrop(cropBuffer, zip, apiKey);

    // If Pl@ntNet key is available, enhance with micro-organ botanical vision
    const plantnetKey = process.env.PLANTNET_API_KEY;
    if (plantnetKey) {
      try {
        const pnResult = await identifyPlant(cropBuffer, identified?.plantPart || "auto", plantnetKey);
        if (pnResult.candidates && pnResult.candidates.length > 0) {
          const best = pnResult.candidates[0];
          identified = {
            ...identified,
            scientificName: best.sci || identified?.scientificName,
            commonName: best.common || identified?.commonName,
            confidence: Math.max(best.score || 0.85, identified?.confidence || 0.8),
          };
        }
      } catch (pnErr: any) {
        console.warn("Pl@ntNet verification in reidentify-box skipped:", pnErr?.message);
      }
    }

    if (!identified?.scientificName) {
      return Response.json(
        {
          error:
            "Could not identify distinct foliage in the selected region. Try drawing a tighter box around leaves or flowers.",
        },
        { status: 422 }
      );
    }

    // Match against NJ flora database or create fallback taxonomy entry
    const candidates = [
      ...findPlantCandidates(identified.scientificName),
      ...(identified.commonName ? findPlantCandidates(identified.commonName) : []),
    ];

    const plant: Plant = candidates[0] || getOrCreateFallbackPlant({
      scientificName: identified.scientificName,
      commonName: identified.commonName,
      confidence: identified.confidence,
      x: Number(box.x),
      y: Number(box.y),
      width: Number(box.w),
      height: Number(box.h),
      plantPart: identified.plantPart,
      note: identified.note,
    });

    registerPlant(plant);

    const plantId = plant.id;

    const detection: Detection = {
      id: existingDetectionId || `manual-${Date.now()}`,
      plantId,
      confidence: identified.confidence || 0.85,
      box: {
        x: Number(box.x),
        y: Number(box.y),
        w: Number(box.w),
        h: Number(box.h),
      },
      note: identified.note || plant.description?.slice(0, 80),
      plantPart: identified.plantPart || "leaf",
      source: plantnetKey ? "plantnet_crop" : "gemini_crop",
      isUserDrawn: true,
    };

    return Response.json({
      success: true,
      detection,
      plant,
    });
  } catch (err: any) {
    console.error("API /api/reidentify-box error:", err);
    return Response.json(
      { error: err.message || "Failed to re-identify region." },
      { status: 500 }
    );
  }
}

async function identifyFoliageCrop(buffer: Buffer, zip: string, apiKey: string) {
  const model = getGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are an expert New Jersey botanist.
Identify the primary plant, shrub, flower, or tree leaf shown in this close-up crop from a New Jersey yard (ZIP ${zip}).
Return ONLY a valid JSON object with these keys:
{
  "scientificName": "Binomial name",
  "commonName": "Common name",
  "confidence": 0.88,
  "plantPart": "leaf|flower|fruit|bark|habit",
  "note": "brief distinctive botanical identification notes"
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: buffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Gemini error: ${res.statusText}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}
