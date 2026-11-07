import { of, throwError } from "rxjs";
import { WeatherService } from "./services/weather.service";
describe("Weather provider failures", () => {
  const config: any = { get: (_: string, d: any) => d };
  it("uses supplied elevation fallback on malformed provider response", async () => {
    const service = new WeatherService(
      { get: () => of({ data: { elevation: ["invalid"] } }) } as any,
      config,
      {} as any,
      {} as any,
      {} as any,
    );
    expect(await service.fetchElevation(10, 106, 4)).toBe(4);
  });
  it("returns most recent stored snapshot after provider timeout", async () => {
    const cached = { provider: "cached", temperatureC: 27 };
    const service = new WeatherService(
      { get: () => throwError(() => new Error("timeout")) } as any,
      config,
      { find: async () => [cached] } as any,
      {} as any,
      {} as any,
    );
    expect(await service.getCurrentWeather()).toEqual(cached);
  });
  it("persists a labeled simulation when offline without cache", async () => {
    const repo: any = {
      find: async () => [],
      create: (x: any) => x,
      save: async (x: any) => x,
    };
    const service = new WeatherService(
      { get: () => throwError(() => new Error("offline")) } as any,
      config,
      repo,
      {} as any,
      {} as any,
    );
    expect(await service.getCurrentWeather(10.7, 106.7, "Test")).toMatchObject({
      provider: "fallback",
      locationName: "Test",
      currentRainMm: 0,
      floodRiskLevel: "Thấp",
    });
  });
});
