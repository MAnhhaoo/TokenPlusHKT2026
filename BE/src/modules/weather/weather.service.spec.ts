import { WeatherService } from "./services/weather.service";

describe("WeatherService", () => {
  let service: WeatherService;

  beforeEach(() => {
    service = new WeatherService(
      {} as any,
      { get: jest.fn((_k, def) => def) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("calculates flood risk accurately combining rainfall and low elevation", () => {
    const lowLyingRisk = service.calculateFloodRisk(35, 1.8);
    expect(lowLyingRisk.level).toBe("Rất cao");
    expect(lowLyingRisk.zone).toBe(2);

    const moderateRisk = service.calculateFloodRisk(15, 4.0);
    expect(moderateRisk.level).toBe("Trung bình");
    expect(moderateRisk.zone).toBe(1);

    const safeRisk = service.calculateFloodRisk(3, 8.0);
    expect(safeRisk.level).toBe("Thấp");
    expect(safeRisk.zone).toBe(0);
  });

  it("describes WMO weather codes in Vietnamese properly", () => {
    expect(service.describeWmoCode(95, 42)).toBe("Mưa dông diện rộng");
    expect(service.describeWmoCode(61, 10)).toBe("Mưa vừa");
    expect(service.describeWmoCode(1, 0)).toBe("Trời quang mây");
  });
});
