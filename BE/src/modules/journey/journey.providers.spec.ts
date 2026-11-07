import { of, throwError } from "rxjs";
import { JourneyService } from "./services/journey.service";
describe("Journey provider isolation", () => {
  const create = (get: any, floods: any[] = []) =>
    new JourneyService(
      { get } as any,
      { get: (_: string, d: any) => d } as any,
      { find: async () => [] } as any,
      { find: async () => [{ id: "safe" }, { id: "balanced" }] } as any,
      { find: async () => floods } as any,
    );
  it.each(["timeout", "empty"])(
    "falls back to stored routes on %s provider failure",
    async (kind) => {
      const service = create(
        jest.fn(() =>
          kind === "timeout"
            ? throwError(() => new Error("timeout"))
            : of({ data: { routes: [] } }),
        ),
      );
      const result = await service.computeSafeRoutes({});
      expect(result.provider).toBe("database-fallback");
      expect(result.safeRoute?.id).toBe("safe");
    },
  );
  it("prefers a dry route over faster route through critical flood", async () => {
    const route = (coordinates: number[][], duration: number) => ({
      geometry: { coordinates },
      duration,
      distance: 1000,
      legs: [],
    });
    const service = create(
      () =>
        of({
          data: {
            routes: [
              route([[106.7, 10.7], [106.75, 10.75], [106.8, 10.8]], 60),
              route([[106.7, 10.7], [106.78, 10.72], [106.8, 10.8]], 600),
            ],
          },
        }),
      [
        {
          type: "flood",
          severity: "critical",
          lat: 10.75,
          lng: 106.75,
          label: "Flood",
        },
      ],
    );
    const result = await service.computeSafeRoutes({
      fromLat: 10.7,
      fromLng: 106.7,
      toLat: 10.8,
      toLng: 106.8,
    });
    expect(result.provider).toBe("osrm-live");
    expect((result.safeRoute as any)?.safetyScore).toBe(100);
    expect((result.safeRoute as any)?.coordinates[1]).toEqual([106.78, 10.72]);
    expect((result.balancedRoute as any)?.safetyScore).toBe(50);
    expect((result.safeRoute as any)?.durationMinutes).toBe(10);
  });
});
