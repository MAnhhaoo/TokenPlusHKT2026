import { Injectable, Logger, Optional } from "@nestjs/common";
import { WeatherService } from "../../weather/services/weather.service";
import { MapService } from "../../map/services/map.service";
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
    @Optional() private readonly mapService?: MapService,
  ) {}

  /**
   * Lấy danh sách các khung giờ dự báo mưa và rủi ro ngập đã đồng bộ.
   */
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

  /**
   * Lấy dữ liệu lộ trình đề xuất và dự phòng mặc định từ cơ sở dữ liệu.
   */
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
    // Lấy danh sách điểm ngập thời gian thực theo thuật toán thủy văn (Open-Meteo rain + địa hình + triều cường + ngưỡng lịch sử)
    let floodPoints: MapPointEntity[] = [];
    if (this.mapService) {
      try {
        floodPoints = await this.mapService.findAllPoints({ mode: "realtime" });
      } catch (err) {
        this.logger.warn(
          `Lỗi lấy điểm ngập thời gian thực từ MapService: ${(err as Error).message}`,
        );
        floodPoints = await this.mapPointRepo.find();
      }
    } else {
      floodPoints = await this.mapPointRepo.find();
    }

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

        for (const fp of floodPoints) {
          if (fp.type !== "flood" && fp.type !== "pending") continue;
          const hit = coords.some(
            ([lng, lat]) =>
              this.haversineMeters(lat, lng, fp.lat, fp.lng) <= 220,
          );
          if (!hit) continue;
          const penalty =
            fp.severity === "critical" ? 50 : fp.severity === "high" ? 30 : 15;
          riskPenalty += penalty;
          const depthInfo = fp.depth ? `sâu ~${fp.depth} cm` : "ngập";
          const rainInfo = fp.rainfall ? ` (mưa ${fp.rainfall} mm)` : "";
          nearbyFloodLabels.add(`${fp.label} (${depthInfo}${rainInfo})`);
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
            const distM = Math.max(30, Math.round(s.distance ?? 100));
            const loc = Array.isArray(s.maneuver?.location)
              ? ([
                  Number(s.maneuver.location[0]),
                  Number(s.maneuver.location[1]),
                ] as [number, number])
              : undefined;
            return {
              icon,
              instruction,
              street: s.name || "Trục đường chính",
              distance: `${distM} m`,
              distanceMeters: distM,
              ...(loc ? { coords: loc } : {}),
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
            distanceMeters: Math.round(startDist),
            coords: [fromLng, fromLat],
          });
        }
        navigationSteps = [...navigationSteps, ...mainSteps].slice(0, 15);

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

      const safeBadge =
        safest.riskPenalty === 0
          ? "Tối ưu & Khô ráo"
          : safest.riskPenalty <= 20
            ? "Rủi ro thấp"
            : "Lưu ý điểm ngập";

      const safeDetail =
        safest.avoidedOrNearbyFloods.length === 0
          ? "Lộ trình hoàn toàn khô ráo, không cắt qua điểm ngập nào theo dữ liệu khí tượng Open-Meteo thời gian thực."
          : `Lộ trình tối ưu nhưng cần lưu ý: ${safest.avoidedOrNearbyFloods.slice(0, 2).join("; ")}.`;

      const altBadge =
        alternative.riskPenalty === 0 ? "Tuyến phụ khô ráo" : "Tuyến dự phòng";

      const altDetail =
        alternative.avoidedOrNearbyFloods.length === 0
          ? "Tuyến dự phòng an toàn, hoàn toàn khô ráo."
          : `Tuyến thay thế dự phòng, lưu ý đoạn: ${alternative.avoidedOrNearbyFloods.slice(0, 2).join("; ")}.`;

      return {
        provider: "osrm-live",
        origin: [fromLng, fromLat],
        destination: [toLng, toLat],
        safeRoute: {
          id: "safe",
          name: "Tuyến đề xuất",
          badge: safeBadge,
          ...safest,
          detail: safeDetail,
        },
        balancedRoute: {
          id: "balanced",
          name: "Tuyến dự phòng",
          badge: altBadge,
          ...alternative,
          detail: altDetail,
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
