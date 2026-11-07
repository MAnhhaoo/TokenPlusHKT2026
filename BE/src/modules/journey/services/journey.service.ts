import { Injectable, Logger, Optional } from "@nestjs/common";
import { WeatherService } from "../../weather/services/weather.service";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { firstValueFrom } from "rxjs";
import { ForecastSlotEntity } from "../models/forecast-slot.entity";
import {
  NavigationStepItem,
  RouteOptionEntity,
} from "../models/route-option.entity";
import { MapPointEntity } from "../../map/models/map-point.entity";
import { ComputeRouteDto } from "../dtos/compute-route.dto";

const CAMPUS_1: [number, number] = [106.6836363, 10.7790693];
const MAIN_CAMPUS: [number, number] = [106.6817595, 10.7597031];

@Injectable()
export class JourneyService {
  private readonly logger = new Logger(JourneyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(ForecastSlotEntity)
    private readonly forecastRepo: Repository<ForecastSlotEntity>,
    @InjectRepository(RouteOptionEntity)
    private readonly routeRepo: Repository<RouteOptionEntity>,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @Optional() private readonly weatherService?: WeatherService,
  ) {}

  async getForecasts(): Promise<ForecastSlotEntity[]> {
    if (this.weatherService) {
      try {
        const syncRes = await this.weatherService.syncForecastsWithWeather();
        if (syncRes?.slots && syncRes.slots.length > 0) {
          return syncRes.slots;
        }
      } catch (err) {
        this.logger.warn(
          `Không thể đồng bộ dự báo thời tiết: ${(err as Error).message}`,
        );
      }
    }
    return this.forecastRepo.find({ order: { sortOrder: "ASC" } });
  }

  async getRoutesData() {
    const routeEntities = await this.routeRepo.find();
    const safe = routeEntities.find((r) => r.id === "safe");
    const balanced = routeEntities.find((r) => r.id === "balanced");

    return {
      campus1: CAMPUS_1,
      mainCampus: MAIN_CAMPUS,
      routes: {
        safe,
        balanced,
      },
      navigationSteps: safe?.navigationSteps ?? [],
    };
  }

  /**
   * Tính khoảng cách Haversine (mét) giữa 2 tọa độ (lat1, lng1) và (lat2, lng2)
   */
  public haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Gọi OSRM API tính toán lộ trình thực tế và chấm điểm an toàn né các điểm đang ngập
   */
  async computeSafeRoutes(dto: ComputeRouteDto) {
    const fromLng = dto.fromLng ?? CAMPUS_1[0];
    const fromLat = dto.fromLat ?? CAMPUS_1[1];
    const toLng = dto.toLng ?? MAIN_CAMPUS[0];
    const toLat = dto.toLat ?? MAIN_CAMPUS[1];

    const osrmBase = this.configService.get<string>(
      "OSRM_BASE_URL",
      "https://router.project-osrm.org",
    );
    const floodPoints = await this.mapPointRepo.find();

    try {
      const isCar = dto.mode === "car" || (dto as any).vehicleType === "car";
      const profile = isCar ? "driving" : "bike";
      const url = `${osrmBase}/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}`;
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            alternatives: "true",
            steps: "true",
            geometries: "geojson",
            overview: "full",
          },
          timeout: 2500,
          headers: { "User-Agent": "SaigonDrain-AI/1.0" },
        }),
      );

      const rawRoutes: any[] = [...(response.data?.routes ?? [])];
      if (rawRoutes.length === 0) {
        throw new Error("OSRM returned empty routes");
      }

      // Nếu OSRM chỉ trả về 1 tuyến hoặc tuyến chính cắt qua điểm ngập nặng, tự động tính thêm tuyến vòng (detour waypoint)
      if (rawRoutes.length < 2) {
        const midLng = (fromLng + toLng) / 2 + 0.0055;
        const midLat = (fromLat + toLat) / 2 - 0.0035;
        try {
          const detourUrl = `${osrmBase}/route/v1/${profile}/${fromLng},${fromLat};${midLng},${midLat};${toLng},${toLat}`;
          const detourRes = await firstValueFrom(
            this.httpService.get(detourUrl, {
              params: {
                steps: "true",
                geometries: "geojson",
                overview: "full",
              },
              timeout: 1500,
            }),
          );
          if (detourRes.data?.routes?.[0]) {
            rawRoutes.push(detourRes.data.routes[0]);
          }
        } catch {
          // ignore detour error
        }
      }

      const scoredRoutes = rawRoutes.map((route, idx) => {
        const rawCoords: number[][] = route.geometry?.coordinates ?? [];
        const coords: number[][] = [...rawCoords];
        const startDist =
          coords.length > 0
            ? this.haversineMeters(fromLat, fromLng, coords[0][1], coords[0][0])
            : 0;
        const alleyConnector: number[][] =
          startDist > 5 && coords.length > 0
            ? [[fromLng, fromLat], coords[0]]
            : [];

        // Tự động kết nối vị trí hẻm với trục đường
        if (coords.length > 0) {
          // startDist is computed above
          // Khong chen diem chim bay dam xuyen nha
          const endDist = this.haversineMeters(
            toLat,
            toLng,
            coords[coords.length - 1][1],
            coords[coords.length - 1][0],
          );
          if (endDist > 4) {
            coords.push([toLng, toLat]);
          }
        }

        let riskPenalty = 0;
        const nearbyFloodLabels = new Set<string>();

        for (const [lng, lat] of coords) {
          for (const fp of floodPoints) {
            if (fp.type !== "flood" && fp.type !== "pending") continue;
            const dist = this.haversineMeters(lat, lng, fp.lat, fp.lng);
            if (dist <= 300) {
              const penalty =
                fp.severity === "critical"
                  ? 50
                  : fp.severity === "high"
                    ? 30
                    : 15;
              riskPenalty += penalty;
              nearbyFloodLabels.add(fp.label);
            }
          }
        }

        const durationMinutes = Math.max(
          1,
          Math.round((route.duration ?? 720) / 60),
        );
        const distanceKm = ((route.distance ?? 3400) / 1000)
          .toFixed(1)
          .replace(".", ",");

        const rawSteps: any[] = route.legs?.[0]?.steps ?? [];

        const mainSteps: NavigationStepItem[] = rawSteps
          .filter((s) => s.name || s.distance > 15)
          .map((s) => {
            const modifier: string = s.maneuver?.modifier || "";
            const icon: "turn-left" | "turn-right" | "straight" =
              modifier.includes("left")
                ? "turn-left"
                : modifier.includes("right")
                  ? "turn-right"
                  : "straight";
            const instruction =
              icon === "turn-left"
                ? "Rẽ trái vào"
                : icon === "turn-right"
                  ? "Rẽ phải vào"
                  : "Đi theo";
            return {
              icon,
              instruction,
              street: s.name || "Trục đường chính",
              distance: `${Math.max(30, Math.round(s.distance ?? 100))} m`,
            };
          });

        let navigationSteps: NavigationStepItem[] = [];
        if (startDist > 8) {
          const firstRoad =
            rawSteps[0]?.name || mainSteps[0]?.street || "trục đường chính";
          navigationSteps.push({
            icon: "straight",
            instruction: "Từ vị trí trong hẻm, đi ra",
            street: `${firstRoad} (${Math.round(startDist)} m)`,
            distance: `Trong ${Math.round(startDist)} m`,
          });
        }
        navigationSteps = [...navigationSteps, ...mainSteps].slice(0, 6);

        return {
          index: idx,
          durationMinutes,
          time: `${durationMinutes} phút`,
          distance: `${distanceKm} km`,
          riskPenalty,
          safetyScore: Math.max(10, 100 - riskPenalty),
          avoidedOrNearbyFloods: [...nearbyFloodLabels],
          coordinates: coords,
          alleyConnector,
          navigationSteps,
        };
      });

      scoredRoutes.sort(
        (a, b) =>
          a.riskPenalty - b.riskPenalty ||
          a.durationMinutes - b.durationMinutes,
      );

      const safest = scoredRoutes[0];
      const alternative = scoredRoutes[1] ?? scoredRoutes[0];

      return {
        provider: "osrm-live",
        origin: [fromLng, fromLat],
        destination: [toLng, toLat],
        safeRoute: {
          id: "safe",
          name: "Tuyến đề xuất",
          badge: safest.riskPenalty === 0 ? "An toàn nhất" : "Nhanh nhất",
          ...safest,
          detail:
            safest.avoidedOrNearbyFloods.length === 0
              ? "Lộ trình khô ráo, không đi qua điểm ngập nào đã ghi nhận."
              : `Cần lưu ý khu vực: ${safest.avoidedOrNearbyFloods.join(", ")}.`,
        },
        balancedRoute: {
          id: "balanced",
          name: "Tuyến dự phòng",
          badge: "Ít điểm ngập",
          ...alternative,
          detail:
            "Tuyến dự phòng được sử dụng khi hệ thống ghi nhận ngập trên lộ trình chính.",
        },
      };
    } catch (error) {
      this.logger.warn(
        `OSRM Routing fallback (${(error as Error).message}), trả về lộ trình lưu trong DB.`,
      );
      const saved = await this.getRoutesData();
      return {
        provider: "database-fallback",
        origin: [fromLng, fromLat],
        destination: [toLng, toLat],
        safeRoute: saved.routes.safe,
        balancedRoute: saved.routes.balanced,
      };
    }
  }
}
