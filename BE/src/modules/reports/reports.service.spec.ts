import { ReportsService } from "./services/reports.service";

describe("ReportsService", () => {
  let service: ReportsService;
  let mockReportRepo: any;
  let mockMapPointRepo: any;
  let mockUserRepo: any;
  let mockMapService: any;

  beforeEach(() => {
    mockReportRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    mockMapPointRepo = {
      findOne: jest.fn(),
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
      reverseGeocode: jest.fn(),
    };
    const mockGeminiVisionService = {
      analyzeImage: jest.fn().mockResolvedValue({
        hasFlooding: true,
        estimatedDepthCm: 32,
        reportType: "flood",
        severity: "critical",
        weatherCondition: "Trời đang mưa to",
        drainStatus: "Bình thường",
        visual: "traffic",
        confidence: 94,
        aiSummary: "Nước ngập ngang bánh xe máy.",
        recommendation: "Hạn chế lưu thông.",
        provider: "Google Gemini 1.5 Flash Vision",
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
});
