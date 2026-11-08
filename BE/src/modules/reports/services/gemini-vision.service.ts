import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

export type EvidenceStatus = "clear" | "uncertain" | "insufficient_evidence";

export interface FloodImageAnalysisResult {
  hasFlooding: boolean;
  estimatedDepthCm: number | null;
  reportType: "flood" | "drain";
  severity: "critical" | "high" | "medium" | "low";
  evidenceStatus: EvidenceStatus;
  weatherCondition: string | null;
  drainStatus: string | null;
  visual: "street" | "drain" | "night" | "traffic";
  confidence: number | null;
  aiSummary: string;
  recommendation: string;
  provider: string;
}

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

@Injectable()
export class GeminiVisionService {
  private readonly logger = new Logger(GeminiVisionService.name);

  /**
   * Phân tích ảnh hiện trường bằng mô hình đa phương thức Google Gemini Vision (JSON có cấu trúc).
   * Lưu ý: Kết quả từ AI chỉ đóng vai trò gợi ý hỗ trợ kiểm duyệt, không bảo đảm chính xác 100%
   * và không dùng để tự động duyệt báo cáo. Nếu chưa cấu hình GEMINI_API_KEY, ảnh không hợp lệ
   * hoặc gọi API thất bại, hệ thống trả về null (tuyệt đối không tự sinh dữ liệu giả).
   */
  async analyzeImage(
    imageDataUrlOrBase64: string,
    location?: string,
    userDescription?: string,
  ): Promise<FloodImageAnalysisResult | null> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

    const isValidKey = Boolean(apiKey && apiKey.length >= 20);
    if (!isValidKey || !this.isBase64Image(imageDataUrlOrBase64)) {
      return null;
    }

    const candidateModels = [
      primaryModel,
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-3-flash-preview",
    ];
    const uniqueModels = Array.from(new Set(candidateModels));

    for (const model of uniqueModels) {
      try {
        const geminiResult = await this.callGeminiVisionApi(
          apiKey!,
          model,
          imageDataUrlOrBase64,
          location,
          userDescription,
        );
        if (geminiResult) {
          return geminiResult;
        }
      } catch (err: any) {
        this.logger.warn(
          `Gọi Gemini Vision API với ${model} thất bại (${err?.response?.status || err?.message}). Thử mô hình kế tiếp...`,
        );
      }
    }

    return null;
  }

  /**
   * Gọi Google Generative Language REST API với JSON Schema kiểm soát cấu trúc đầu ra.
   * Temperature thấp và JSON Schema chỉ giúp chuẩn hóa định dạng phản hồi, không triệt tiêu hoàn toàn sai số nhận diện.
   */
  private async callGeminiVisionApi(
    apiKey: string,
    model: string,
    imageDataUrl: string,
    location?: string,
    userDescription?: string,
  ): Promise<FloodImageAnalysisResult | null> {
    const { mimeType, base64Data } = this.extractBase64(imageDataUrl);
    if (!base64Data || !ALLOWED_IMAGE_MIMES.has(mimeType.toLowerCase())) {
      return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const prompt = `
Bạn là trợ lý phân tích hình ảnh hỗ trợ kiểm duyệt báo cáo ngập úng và thoát nước đô thị của hệ thống SaigonDrain AI (TP. Hồ Chí Minh).
Nhiệm vụ của bạn là quan sát trung thực bức ảnh do người dân gửi lên để hỗ trợ điều phối viên xác minh. Tuyệt đối KHÔNG tự bịa đặt thông tin không có trong ảnh.

Thông tin ngữ cảnh người dùng cung cấp (chỉ để tham khảo):
- Vị trí báo cáo: ${location || "Chưa rõ"}
- Mô tả của người gửi: ${userDescription || "Không có mô tả"}

QUY TẮC PHÂN TÍCH TRUNG THỰC (KHÔNG TỰ PHÁT SINH DỮ LIỆU):
1. Nhận diện cảnh ngập / tắc cống (hasFlooding) và trạng thái bằng chứng (evidenceStatus):
   - Cần phân biệt rõ: cảnh ngập đường thực sự hoặc miệng cống bị nghẹt rác VỚI ảnh mặt đường chỉ hơi ướt sau mưa, vũng nước nhỏ không đáng kể, hoặc ảnh không liên quan.
   - Nếu ảnh không có ngập và không thấy sự cố cống thoát nước, hoặc ảnh mờ/không liên quan: trả "hasFlooding": false, "estimatedDepthCm": null, "evidenceStatus": "insufficient_evidence".
   - "evidenceStatus":
     + "clear": Ảnh rõ nét, thấy rõ tình trạng ngập hoặc miệng cống và có vật tham chiếu.
     + "uncertain": Thấy có nước hoặc cống nhưng góc chụp/ánh sáng khó xác định mức độ.
     + "insufficient_evidence": Ảnh mờ, thiếu vật tham chiếu hoặc không đủ căn cứ kết luận.
2. Ước lượng độ sâu ngập (estimatedDepthCm):
   - Chỉ ước lượng khi trong ảnh có mặt nước ngập VÀ nhìn thấy vật tham chiếu đủ rõ.
   - Hướng dẫn tham khảo tương đối (lưu ý kích thước vỉa hè, bánh xe từng loại xe và góc chụp có thể khác nhau, KHÔNG coi là chuẩn cố định tuyệt đối):
     + Nước mấp mé mặt đường / mắt cá chân: khoảng 10 - 15 cm.
     + Nước ngập khoảng nửa bánh xe máy: khoảng 20 - 30 cm.
     + Nước ngập quá nửa bánh xe máy / chạm ống xả: khoảng 35 - 50 cm.
   - NẾU ảnh không thấy rõ vật tham chiếu để ước lượng hoặc không có ngập: BẮT BUỘC trả "estimatedDepthCm": null. Tuyệt đối không tự tạo số cm.
3. Mức độ đề xuất (severity): "low" | "medium" | "high" | "critical" dựa trên mức độ quan sát được.
4. Loại báo cáo (reportType): "drain" nếu trọng tâm ảnh là miệng cống/hố ga; "flood" nếu là mặt đường.
5. Thời tiết (weatherCondition) & Tình trạng cống (drainStatus):
   - Chỉ mô tả những gì thực sự nhìn thấy trong ảnh. Nếu qua ảnh không nhìn thấy miệng cống thì ghi rõ "Không quan sát thấy miệng cống trong ảnh". Nếu không rõ thời tiết thì trả null.
6. Khuyến nghị (recommendation): Chỉ đưa khuyến cáo an toàn giao thông thận trọng, không tuyên bố cấm đường tự động hoặc giờ nước rút.
`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            hasFlooding: { type: "BOOLEAN" },
            estimatedDepthCm: { type: "INTEGER", nullable: true },
            reportType: { type: "STRING", enum: ["flood", "drain"] },
            severity: {
              type: "STRING",
              enum: ["critical", "high", "medium", "low"],
            },
            evidenceStatus: {
              type: "STRING",
              enum: ["clear", "uncertain", "insufficient_evidence"],
            },
            weatherCondition: { type: "STRING", nullable: true },
            drainStatus: { type: "STRING", nullable: true },
            visual: {
              type: "STRING",
              enum: ["street", "drain", "traffic", "night"],
            },
            confidence: { type: "INTEGER", nullable: true },
            aiSummary: { type: "STRING" },
            recommendation: { type: "STRING" },
          },
          required: [
            "hasFlooding",
            "reportType",
            "severity",
            "evidenceStatus",
            "visual",
            "aiSummary",
            "recommendation",
          ],
        },
      },
    };

    const response = await axios.post(endpoint, requestBody, {
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    });

    const candidates = response.data?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    const rawText = candidates[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== "string") return null;

    try {
      const cleanJson = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanJson);
      if (!parsed || typeof parsed !== "object") return null;

      const rawDepth = parsed.estimatedDepthCm;
      const estimatedDepthCm =
        typeof rawDepth === "number" &&
        Number.isFinite(rawDepth) &&
        rawDepth > 0 &&
        rawDepth <= 200
          ? Math.round(rawDepth)
          : null;

      const rawConfidence = parsed.confidence;
      const confidence =
        typeof rawConfidence === "number" &&
        Number.isFinite(rawConfidence) &&
        rawConfidence >= 0 &&
        rawConfidence <= 100
          ? Math.round(rawConfidence)
          : null;

      const evidenceStatus: EvidenceStatus = [
        "clear",
        "uncertain",
        "insufficient_evidence",
      ].includes(parsed.evidenceStatus)
        ? parsed.evidenceStatus
        : estimatedDepthCm !== null
          ? "uncertain"
          : "insufficient_evidence";

      return {
        hasFlooding: Boolean(parsed.hasFlooding),
        estimatedDepthCm,
        reportType: parsed.reportType === "drain" ? "drain" : "flood",
        severity: ["critical", "high", "medium", "low"].includes(
          parsed.severity,
        )
          ? parsed.severity
          : "medium",
        evidenceStatus,
        weatherCondition:
          typeof parsed.weatherCondition === "string" &&
          parsed.weatherCondition.trim()
            ? parsed.weatherCondition.trim()
            : null,
        drainStatus:
          typeof parsed.drainStatus === "string" && parsed.drainStatus.trim()
            ? parsed.drainStatus.trim()
            : null,
        visual: ["street", "drain", "traffic", "night"].includes(parsed.visual)
          ? parsed.visual
          : "street",
        confidence,
        aiSummary:
          typeof parsed.aiSummary === "string" && parsed.aiSummary.trim()
            ? parsed.aiSummary.trim()
            : "Đề xuất AI từ ảnh hiện trường (cần quản trị viên kiểm duyệt).",
        recommendation:
          typeof parsed.recommendation === "string" &&
          parsed.recommendation.trim()
            ? parsed.recommendation.trim()
            : "Chú ý quan sát thực tế tại hiện trường và di chuyển thận trọng.",
        provider: `Google Gemini Vision (${model})`,
      };
    } catch (parseErr) {
      this.logger.error("Lỗi parse JSON phản hồi từ Gemini API:", parseErr);
      return null;
    }
  }

  private isBase64Image(str: string): boolean {
    if (!str || typeof str !== "string") return false;
    // Giới hạn kích thước chuỗi base64 (~10MB) để tránh quá tải bộ nhớ
    if (str.length > 14_000_000) return false;
    return (
      str.startsWith("data:image/") ||
      (str.length > 100 && !str.startsWith("http"))
    );
  }

  private extractBase64(dataUrl: string): {
    mimeType: string;
    base64Data: string;
  } {
    if (dataUrl.startsWith("data:")) {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], base64Data: match[2] };
      }
    }
    return { mimeType: "image/jpeg", base64Data: dataUrl };
  }
}
