import { ReportsService } from "./services/reports.service";
import { GeminiVisionService } from "./services/gemini-vision.service";

describe("ReportsService", () => {
  let service: ReportsService;
  let mockReportRepo: any;
  let mockMapPointRepo: any;
  let mockUserRepo: any;
  let mockMapService: any;

  beforeEach(() => {
    mockReportRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    mockMapPointRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    const mockAlertRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    mockMapService = {
      reverseGeocode: jest.fn().mockResolvedValue({
        location: "Nguyễn Hữu Cảnh",
        district: "Bình Thạnh",
      }),
    };
    const mockGeminiVisionService = {
      analyzeImage: jest.fn().mockResolvedValue({
        hasFlooding: true,
        estimatedDepthCm: 32,
        reportType: "flood",
        severity: "critical",
        evidenceStatus: "clear",
        weatherCondition: "Trời đang mưa to",
        drainStatus: "Không quan sát thấy miệng cống trong ảnh",
        visual: "traffic",
        confidence: 88,
        aiSummary: "Nước ngập ngang bánh xe máy.",
        recommendation: "Hạn chế lưu thông.",
        provider: "Google Gemini Vision (gemini-2.5-flash)",
      }),
    };

    service = new ReportsService(
      mockReportRepo,
      mockMapPointRepo,
      mockUserRepo,
      mockAlertRepo as any,
      mockMapService,
      mockGeminiVisionService as any,
    );
  });

  it("approves a pending report and updates the linked map point to flood", async () => {
    mockReportRepo.findOne.mockResolvedValue({
      id: "RP-2418",
      status: "pending",
      aiDepth: 32,
      reportedDepth: 35,
      reporterId: "USR-1048",
    });
    mockMapPointRepo.findOne.mockResolvedValue({
      id: "p3",
      type: "pending",
      depth: 35,
      linkedReportId: "RP-2418",
    });
    mockUserRepo.findOne.mockResolvedValue({
      id: "USR-1048",
      verifiedReports: 25,
      trustScore: 96,
    });

    const result = await service.approve("RP-2418");
    expect(result.report.status).toBe("verified");
    expect(result.updatedMapPoint?.type).toBe("flood");
    expect(result.updatedMapPoint?.depth).toBe(32);
  });

  it("keeps newly created reports with photos in pending state until Admin verifies", async () => {
    const created = await service.create({
      reportType: "flood",
      severity: "high",
      location: "Nguyễn Hữu Cảnh, Bình Thạnh",
      photoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/",
    });

    expect(created.status).toBe("pending");
    expect((created as any).mapPoint?.type).toBe("pending");
    expect(created.estimatedClearAt).toBeUndefined();
    expect(created.estimatedDurationMin).toBeUndefined();
  });

  it("does not fabricate AI vision numbers when GEMINI_API_KEY is not configured", async () => {
    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const vision = new GeminiVisionService();
      const res = await vision.analyzeImage(
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/",
        "Nguyễn Hữu Cảnh",
        "Ngập nước",
      );
      expect(res).toBeNull();
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }
  });
});
