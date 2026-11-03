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
 * Vercel's 4.5MB limit (typically ~250-400KB), and avoids Safari syntax errors on upload.
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
