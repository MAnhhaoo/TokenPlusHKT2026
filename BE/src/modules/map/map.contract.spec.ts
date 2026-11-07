import { throwError } from "rxjs";
import { MapService } from "./services/map.service";

describe("Map layer and provider contracts", () => {
  const basePoint = {
    id: "p-test",
    label: "Đường thử nghiệm",
    district: "Quận 1",
    type: "risk",
    severity: "high",
    rainfall: 20,
    depth: 40,
    elevationM: 2,
    historyCount: 6,
    lat: 10.77,
    lng: 106.7,
  };
  const make = (rows: any[] = [basePoint]) => {
    const http = {
      get: jest.fn(() =>
        throwError(() => new Error("fixture provider timeout")),
      ),
    };
    const points = {
      find: jest.fn().mockResolvedValue(rows),
      findOne: jest.fn().mockResolvedValue(null),
      insert: jest.fn(),
      create: jest.fn((x) => x),
    };
    const weather = {
      getCurrentWeather: jest
        .fn()
        .mockRejectedValue(new Error("fixture offline")),
      getRealtimeDistrictRainMap: jest.fn().mockResolvedValue(new Map()),
      fetchElevation: jest.fn().mockResolvedValue(2.8),
    };
    return {
      http,
      points,
      weather,
      service: new MapService(
        http as any,
        { get: (_: string, fallback: any) => fallback } as any,
        weather as any,
        points as any,
        { findOne: jest.fn().mockResolvedValue(null) } as any,
      ),
    };
  };
  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date("2026-11-07T05:00:00Z")),
  );
  afterEach(() => jest.useRealTimers());

  it("BE-MAP01 dry weather fallback preserves stored point and exposes selected historical risk only", async () => {
    const { service, weather } = make();
    const original = { ...basePoint };
    expect(await service.findAllPoints({ layers: "flood" })).toEqual([]);
    expect(weather.getCurrentWeather).toHaveBeenCalledTimes(1);
    expect(
      await service.findAllPoints({ layers: "history", rainMm: 0 }),
    ).toEqual([{ ...basePoint, depth: 0, type: "history" }]);
    expect(basePoint).toEqual(original);
  });

  it("BE-MAP02 rainfall severity filtering and layer selection exclude sensors/pending consistently", async () => {
    const { service } = make([
      { ...basePoint, type: "pending", id: "pending" },
      { ...basePoint, type: "sensor", id: "sensor", severity: "medium" },
    ]);
    expect(
      (
        await service.findAllPoints({
          layers: "rain",
          severity: "all",
          rainMm: 0,
        })
      ).map((p) => p.id),
    ).toEqual(["sensor"]);
    expect(
      (
        await service.findAllPoints({
          layers: "flood",
          severity: "high",
          rainMm: 0,
        })
      ).map((p) => p.id),
    ).toEqual(["pending"]);
    expect(
      await service.findAllPoints({
        layers: "rain",
        severity: "critical",
        rainMm: 0,
      }),
    ).toEqual([]);
  });

  it("BE-MAP03 excludes dynamically flooded points when flood layer is disabled [regression]", async () => {
    const { service } = make();
    expect(await service.findAllPoints({ layers: "rain", rainMm: 60 })).toEqual(
      [],
    );
  });

  it("BE-MAP04 blank search avoids providers and normalized Vietnamese search falls back to local points", async () => {
    const { service, http } = make();
    expect(await service.searchPlaces("   ")).toEqual([]);
    expect(http.get).not.toHaveBeenCalled();
    const results = await service.searchPlaces("duong thu nghiem");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "Đường thử nghiệm",
      lat: 10.77,
      lng: 106.7,
    });
  });

  it("BE-MAP05 missing point is 404 and duplicate insert is rejected before elevation lookup", async () => {
    const { service, points, weather } = make();
    await expect(service.findPointById("missing")).rejects.toMatchObject({
      status: 404,
    });
    points.findOne.mockResolvedValueOnce(basePoint);
    await expect(
      service.createPoint({ ...basePoint } as any),
    ).rejects.toMatchObject({ status: 409 });
    expect(weather.fetchElevation).not.toHaveBeenCalled();
    expect(points.insert).not.toHaveBeenCalled();
  });
});
