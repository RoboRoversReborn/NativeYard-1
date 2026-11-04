/**
 * Camera & device detection helper utilities
 */

export function isMobileOrTablet(): boolean {
  if (typeof window === "undefined" || !navigator) return false;

  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isIPadOS = navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua);

  return isMobileUA || isIPadOS;
}

/**
 * Downscale and compress an image File/Blob on the client before upload.
 * Converts iPhone HEIC/large PNGs to standard JPEG, keeps file size well below
 * payload limits (typically ~200-350KB), and avoids Safari syntax errors on upload.
 */
export async function compressImageFile(
  file: File | Blob,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<File | Blob> {
  if (!file || typeof window === "undefined" || !(file instanceof Blob)) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        resolve(file);
        return;
      }

      // Compute scaled dimensions preserving aspect ratio
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const fileName = (file instanceof File ? file.name : "photo").replace(/\.[^/.]+$/, "") + ".jpg";
          const compressedFile = new File([blob], fileName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export interface OptimizedImageResult {
  blob: Blob;
  contentType: string;
  extension: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Optimizes a user-uploaded yard photo or dataUrl down to a high-efficiency
 * WebP / JPEG format (~80KB - 140KB) prior to uploading to Firebase Cloud Storage.
 * This maximizes the Firebase Spark free tier (5 GB) allowing up to ~35,000 - 50,000 photos.
 */
export async function compressImageToOptimizedBlob(
  source: string | Blob | File,
  maxDimension: number = 1280,
  quality: number = 0.8
): Promise<OptimizedImageResult> {
  if (typeof window === "undefined") {
    throw new Error("compressImageToOptimizedBlob must be executed in browser context");
  }

  return new Promise(async (resolve, reject) => {
    let objectUrl = "";
    let isCreatedUrl = false;

    if (typeof source === "string") {
      objectUrl = source;
    } else if (source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      isCreatedUrl = true;
    } else {
      return reject(new Error("Invalid image source provided for compression"));
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isCreatedUrl) URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        return reject(new Error("Unable to determine image natural dimensions"));
      }

      // Constrain max dimension to maxDimension (e.g. 1280px)
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Could not acquire 2D canvas rendering context"));
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Check if browser supports image/webp encoding
      const supportsWebp = canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
      const targetType = supportsWebp ? "image/webp" : "image/jpeg";
      const targetExt = supportsWebp ? "webp" : "jpg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Canvas failed to serialize optimized image blob"));
          }
          resolve({
            blob,
            contentType: targetType,
            extension: targetExt,
            width,
            height,
            sizeBytes: blob.size,
          });
        },
        targetType,
        quality
      );
    };

    img.onerror = (err) => {
      if (isCreatedUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

