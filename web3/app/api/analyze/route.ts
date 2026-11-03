import { NextRequest } from "next/server";
import sharp from "sharp";
import { buildAuditFromVision, buildDemoAudit } from "@/lib/plants";
import { buildSampleAudit, SampleYardKey } from "@/lib/sampleDetections";
import { isNjZip } from "@/lib/nj-data";
import { detectPlants, GeminiDetectedPlant } from "@/lib/gemini";
import { identifyPlant } from "@/lib/plantnet";
import type { VisionDetection, AuditImage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    let zip = "07645";
    let imageBuffer: Buffer | null = null;
    let isSample = false;

    const contentType = req.headers.get("content-type") || "";
    const customGeminiKey = req.headers.get("x-gemini-api-key") || null;
    const customPlantnetKey = req.headers.get("x-plantnet-api-key") || null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      zip = String(body.zip || "07645").replace(/\D/g, "").slice(0, 5);
      isSample = Boolean(body.sample);

      if (isSample) {
        const sampleKey = (body.sampleId || body.sampleKey || "front-yard") as SampleYardKey;
        return Response.json(buildSampleAudit(sampleKey, zip));
      }

      if (body.image && typeof body.image === "string") {
        const base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
        imageBuffer = Buffer.from(base64Data, "base64");
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      zip = String(formData.get("zip") || "07645").replace(/\D/g, "").slice(0, 5);
      const file = formData.get("file");

      if (file && typeof file !== "string") {
        imageBuffer = Buffer.from(await file.arrayBuffer());
      }
    }

    if (!isNjZip(zip)) {
      zip = "07645"; // Default to northern NJ if invalid
    }

    if (!imageBuffer) {
      return Response.json(
        { error: "Upload a yard photo or select the sample yard to explore." },
        { status: 400 }
      );
    }

    // Auto-orient based on EXIF (crucial for mobile/iPhone cameras)
    const orientedBuffer = await sharp(imageBuffer)
      .rotate()
      .jpeg({ quality: 90 })
      .toBuffer();

    const metadata = await sharp(orientedBuffer).metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 900;
    const imageMeta: AuditImage = { width, height };

    const effectiveGeminiKey = customGeminiKey || process.env.GEMINI_API_KEY;
    const effectivePlantnetKey = customPlantnetKey || process.env.PLANTNET_API_KEY;
    const hasGeminiKey = Boolean(effectiveGeminiKey);
    const hasPlantnetKey = Boolean(effectivePlantnetKey);

    if (!hasGeminiKey) {
      // Fallback demo audit if API key is completely unconfigured
      const fallback = buildDemoAudit(zip, imageMeta);
      fallback.notice = "Gemini API key is unconfigured. Showing illustrative New Jersey sample audit.";
      return Response.json(fallback);
    }

    // ── STAGE 1: Full-Scene Localization with Gemini ────────────────────────
    let rawDetections: GeminiDetectedPlant[] = [];
    try {
      // Downscale to max 1280px for fast vision detection while keeping sharp resolution for crops
      const geminiImageBuffer = await sharp(orientedBuffer)
        .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      rawDetections = await detectPlants(geminiImageBuffer, "image/jpeg", effectiveGeminiKey);
    } catch (geminiErr: any) {
      console.warn("Gemini detection failed:", geminiErr?.message);
    }

    if (!rawDetections || rawDetections.length === 0) {
      return Response.json(
        { error: "No distinct plants could be recognized in this photo. Try a clearer daytime photo of your garden bed." },
        { status: 422 }
      );
    }

    // Filter out turf lawn and cap to top 12 prominent plants (matching original web app)
    const plantDetections = rawDetections
      .filter((d) => d.kind !== "lawn")
      .slice(0, 12);

    // ── STAGE 2: Micro-Organ Botanical Verification (Sharp + Pl@ntNet) ──────
    const analyzedVision: VisionDetection[] = await Promise.all(
      plantDetections.map(async (item) => {
        let finalSci = item.guessScientific;
        let finalCommon = item.guessCommon;
        let confidence = 0.85;

        const [ymin, xmin, ymax, xmax] = item.box;

        if (hasPlantnetKey) {
          try {
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
          } catch (cropErr: any) {
            console.warn("Pl@ntNet crop verification failed for plant:", cropErr?.message);
          }
        }

        // Convert coordinates from 0-1000 to percentages (0-100) for web3 overlay
        const x = Math.round(xmin / 10);
        const y = Math.round(ymin / 10);
        const w = Math.round((xmax - xmin) / 10);
        const h = Math.round((ymax - ymin) / 10);

        return {
          scientificName: finalSci,
          commonName: finalCommon,
          confidence: Math.min(1, Math.max(0.4, confidence)),
          x,
          y,
          width: w,
          height: h,
          kind: item.kind,
          organ: item.organ,
          plantPart: item.organ,
          note: `Observed ${item.organ || "habit"} (${item.kind || "plant"})`,
        };
      })
    );

    const audit = buildAuditFromVision(analyzedVision, zip, {
      image: imageMeta,
      source: "upload",
    });

    if (!audit || audit.detections.length === 0) {
      return Response.json(
        { error: "No clear plants recognized in this photo. Try a wider, brighter photo of your garden bed." },
        { status: 422 }
      );
    }

    const dataUrl = `data:image/jpeg;base64,${orientedBuffer.toString("base64")}`;
    audit.imageUrl = dataUrl;

    return Response.json(audit);
  } catch (err: any) {
    console.error("API /api/analyze error:", err);
    return Response.json(
      { error: err.message || "Failed to analyze yard photo." },
      { status: 500 }
    );
  }
}
