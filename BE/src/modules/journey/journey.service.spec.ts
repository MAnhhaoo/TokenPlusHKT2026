import { JourneyService } from "./services/journey.service";

describe("JourneyService", () => {
  let service: JourneyService;

  beforeEach(() => {
    service = new JourneyService(
      {} as any,
      { get: jest.fn((_k, def) => def) } as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it("computes Haversine distance in meters between Campus 1 and Main Campus accurately", () => {
    const distance = service.haversineMeters(
      10.7790693,
      106.6836363,
      10.7597031,
      106.6817595,
    );
    expect(distance).toBeGreaterThan(2000);
    expect(distance).toBeLessThan(2500);
  });
});
