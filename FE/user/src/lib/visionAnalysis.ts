import type { FloodAiAnalysis } from "@/lib/api";

export interface VisionProcessResult {
  dataUrl: string;
  analysis: FloodAiAnalysis | null;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/**
 * Kiểm tra định dạng ảnh hợp lệ và nén ảnh (tối đa 640px, JPEG 0.78) để tối ưu băng thông/token
 * trước khi gửi lên Backend Google Gemini Vision API.
 * Tuyệt đối không tự phát sinh kết quả AI giả định trên trình duyệt.
 */
export function processAndAnalyzeImageFile(
  file: File,
  _location?: string,
  _userDescription?: string,
): Promise<VisionProcessResult> {
  return new Promise((resolve) => {
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      resolve({ dataUrl: "", analysis: null });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        resolve({ dataUrl: "", analysis: null });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
          resolve({ dataUrl, analysis: null });
        } else {
          resolve({ dataUrl: result, analysis: null });
        }
      };
      img.onerror = () => resolve({ dataUrl: result, analysis: null });
      img.src = result;
    };
    reader.onerror = () => resolve({ dataUrl: "", analysis: null });
    reader.readAsDataURL(file);
  });
}
