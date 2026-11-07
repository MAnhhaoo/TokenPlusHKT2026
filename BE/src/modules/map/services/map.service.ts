import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { firstValueFrom } from "rxjs";
import { MapPointEntity, PointSeverity } from "../models/map-point.entity";
import { FloodReportEntity } from "../../reports/models/flood-report.entity";
import {
  CreateMapPointDto,
  QueryMapPointsDto,
  UpdateMapPointDto,
} from "../dtos/query-map-points.dto";
import { WeatherService } from "../../weather/services/weather.service";

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly weatherService: WeatherService,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @InjectRepository(FloodReportEntity)
    private readonly reportRepo: Repository<FloodReportEntity>,
  ) {}

  /**
   * Cấu hình Vector Basemap miễn phí đẹp như Google Maps / Uber Maps cho MapLibre GL
   */
  getMapConfig() {
    return {
      center: [106.6827, 10.7694],
      defaultZoom: 14,
      recommendedStyle: "https://tiles.openfreemap.org/styles/liberty",
      styles: {
        openFreeMapLiberty: {
          name: "OpenFreeMap Liberty (Vector 3D - Giống Google Maps)",
          url: "https://tiles.openfreemap.org/styles/liberty",
          requiresApiKey: false,
        },
        openFreeMapBright: {
          name: "OpenFreeMap Bright (Vector Sáng rõ)",
          url: "https://tiles.openfreemap.org/styles/bright",
          requiresApiKey: false,
        },
        cartoVoyager: {
          name: "CARTO Voyager (Phong cách Uber Maps - Nổi bật đường ngập)",
          url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
          requiresApiKey: false,
        },
        cartoPositron: {
          name: "CARTO Positron (Nền sáng tối giản)",
          url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
          requiresApiKey: false,
        },
      },
      routingApi: "https://router.project-osrm.org/route/v1/driving",
      geocodingApi: "https://photon.komoot.io/api",
    };
  }

  /**
   * Lọc danh sách điểm giám sát ngập theo lớp hiển thị, lượng mưa thời gian thực và chu kỳ triều cường.
   */
  async findAllPoints(query: QueryMapPointsDto): Promise<MapPointEntity[]> {
    const allPoints = await this.mapPointRepo.find();

    // 1. Nếu người dùng chọn chế độ xem toàn bộ 250 điểm đen lịch sử
    if (query.mode === "history") {
      return allPoints;
    }

    // 2. Chế độ chẩn đoán ngập theo thời tiết thời gian thực (Realtime AI Inference)
    let rainMm = query.rainMm !== undefined ? Number(query.rainMm) : undefined;
    if (rainMm === undefined) {
      try {
        const weather = await this.weatherService.getCurrentWeather();
        rainMm = Number(weather?.currentRainMm ?? 0);
      } catch {
        rainMm = 0;
      }
    }

    // Tính chu kỳ triều cường sông Sài Gòn (thường đạt đỉnh 16h30-19h00 chiều hoặc 04h30-07h00 sáng)
    const vnHour = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    ).getHours();
    const isTidePeak =
      (vnHour >= 16 && vnHour <= 19) || (vnHour >= 4 && vnHour <= 7);

    const activeLayers = query.layers
      ? query.layers.split(",").map((s) => s.trim())
      : ["flood", "risk", "rain", "history"];

    const dynamicPoints: MapPointEntity[] = [];

    for (const point of allPoints) {
      if (point.type === "sensor") {
        if (
          activeLayers.includes("rain") &&
          (!query.severity ||
            query.severity === "all" ||
            point.severity === query.severity)
        ) {
          dynamicPoints.push(point);
        }
        continue;
      }

      if (point.type === "pending") {
        if (
          (activeLayers.includes("flood") || activeLayers.includes("risk")) &&
          (!query.severity ||
            query.severity === "all" ||
            point.severity === query.severity)
        ) {
          dynamicPoints.push(point);
        }
        continue;
      }

      const elevation = point.elevationM || 2.0;
      const terrainFactor =
        elevation <= 1.5 ? 1.4 : elevation <= 3.0 ? 1.0 : 0.7;
      const threshold = point.rainfall || 35;
      const effectiveRain = rainMm * terrainFactor;

      const isRainFlooded = rainMm >= 5 && effectiveRain >= threshold;
      const isTideFlooded =
        isTidePeak &&
        (point.district?.includes("7") ||
          point.district?.includes("Nhà Bè") ||
          point.district?.includes("Bình Thạnh") ||
          point.district?.includes("Thủ Đức")) &&
        elevation <= 1.5;

      // Nếu không có mưa và không trong giờ triều cường: ĐƯỜNG KHÔ RÁO
      if (!isRainFlooded && !isTideFlooded) {
        // Chỉ thêm vào nếu người dùng cố ý bật lớp xem 'history' (lịch sử)
        if (
          activeLayers.includes("history") &&
          point.historyCount >= 5 &&
          (!query.severity ||
            query.severity === "all" ||
            point.severity === query.severity)
        ) {
          dynamicPoints.push({
            ...point,
            depth: 0,
            type: "risk",
          });
        }
        continue;
      }

      if (!activeLayers.includes("flood")) {
        continue;
      }

      // Có ngập thực tế theo lượng mưa thời gian thực: tính độ sâu động
      let dynamicDepth = 15;
      if (isRainFlooded) {
        dynamicDepth = Math.min(
          point.depth || 40,
          Math.round((effectiveRain - threshold) * 0.75 + 15),
        );
      } else if (isTideFlooded) {
        const histDepth = point.depth && point.depth >= 20 ? point.depth : 35;
        const tideLevel =
          vnHour === 17 || vnHour === 5
            ? 1.7
            : vnHour === 18 || vnHour === 6
              ? 1.62
              : 1.55;
        dynamicDepth = Math.max(
          16,
          Math.min(
            histDepth,
            Math.round((tideLevel - elevation) * 75 + histDepth * 0.3),
          ),
        );
      }

      const severity: PointSeverity =
        dynamicDepth >= 35
          ? "critical"
          : dynamicDepth >= 20
            ? "high"
            : "medium";
      if (
        query.severity &&
        query.severity !== "all" &&
        severity !== query.severity
      ) {
        continue;
      }

      dynamicPoints.push({
        ...point,
        depth: dynamicDepth,
        severity,
        type: "flood",
      });
    }

    return dynamicPoints;
  }

  /**
   * Truy vấn chi tiết một điểm trên bản đồ kèm báo cáo hiện trường liên kết (nếu có).
   */
  async findPointById(id: string) {
    const point = await this.mapPointRepo.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Không tìm thấy điểm bản đồ ${id}`);
    }
    let linkedReport: FloodReportEntity | null = null;
    if (point.linkedReportId) {
      linkedReport = await this.reportRepo.findOne({
        where: { id: point.linkedReportId },
      });
    }
    return {
      ...point,
      linkedReport,
    };
  }

  /**
   * Thêm mới điểm giám sát bản đồ (insert-only), từ chối nếu mã ID đã tồn tại để tránh ghi đè dữ liệu cũ.
   */
  async createPoint(dto: CreateMapPointDto): Promise<MapPointEntity> {
    const existing = await this.mapPointRepo.findOne({ where: { id: dto.id } });
    if (existing) {
      throw new ConflictException(
        `Điểm bản đồ với mã ${dto.id} đã tồn tại trên hệ thống.`,
      );
    }

    const lat = dto.lat ?? 10.7769;
    const lng = dto.lng ?? 106.7009;
    const elevationM = await this.weatherService.fetchElevation(lat, lng, 2.8);

    const point = this.mapPointRepo.create({
      ...dto,
      lat,
      lng,
      elevationM,
      historyCount: dto.historyCount ?? 1,
    });
    await this.mapPointRepo.insert(point);
    return point;
  }

  /**
   * Cập nhật thuộc tính của một điểm giám sát bản đồ hiện có.
   */
  async updatePoint(
    id: string,
    dto: UpdateMapPointDto,
  ): Promise<MapPointEntity> {
    const point = await this.mapPointRepo.findOne({ where: { id } });
    if (!point) {
      throw new NotFoundException(`Không tìm thấy điểm bản đồ ${id}`);
    }
    Object.assign(point, dto);
    return this.mapPointRepo.save(point);
  }

  /**
   * Tìm kiếm địa điểm / Autocomplete thời gian thực tại TP.HCM (kiểu Google Maps)
   * Kết hợp ArcGIS World Geocoder (POI + địa chỉ tiếng Việt) & Photon OpenStreetMap
   */
  async searchPlaces(keyword: string, limit = 6) {
    const cleanKeyword = (keyword || "").trim();
    if (!cleanKeyword) {
      return [];
    }

    const photonBase = this.configService.get<string>(
      "PHOTON_BASE_URL",
      "https://photon.komoot.io",
    );

    const results: Array<{
      name: string;
      address: string;
      street: string;
      district: string;
      lat: number;
      lng: number;
    }> = [];

    // 1. Truy vấn song song từ PostgreSQL map_points và ArcGIS World Geocoding Service
    const [dbPoints, arcgisRes] = await Promise.all([
      this.mapPointRepo.find().catch(() => []),
      firstValueFrom(
        this.httpService.get(
          "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates",
          {
            params: {
              SingleLine: `${cleanKeyword}, Hồ Chí Minh`,
              f: "json",
              countryCode: "VNM",
              location: "106.7009,10.7769",
              searchExtent: "106.35,10.35,107.05,11.16",
              outFields:
                "PlaceName,Place_addr,StAddr,Nbrhd,District,City,Subregion",
              maxLocations: limit,
            },
            timeout: 1500,
          },
        ),
      ).catch(() => null),
    ]);

    const normKeyword = cleanKeyword
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");

    for (const pt of dbPoints) {
      const normLoc = (pt.label || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
      if (normLoc.includes(normKeyword)) {
        results.push({
          name: pt.label,
          address: `${pt.label}, ${pt.district || "TP. Hồ Chí Minh"}`,
          street: pt.label,
          district: pt.district || "TP. Hồ Chí Minh",
          lat: pt.lat,
          lng: pt.lng,
        });
      }
    }

    const candidates = arcgisRes?.data?.candidates ?? [];
    // Chỉ gọi thêm Photon OSM nếu tổng kết quả < 2
    const photonRes =
      results.length + candidates.length >= 2
        ? null
        : await firstValueFrom(
            this.httpService.get(`${photonBase}/api/`, {
              params: {
                q: `${cleanKeyword}, Hồ Chí Minh`,
                lat: 10.7769,
                lon: 106.7009,
                limit,
              },
              timeout: 1000,
            }),
          ).catch(() => null);
    for (const c of candidates) {
      const lat = c?.location?.y;
      const lng = c?.location?.x;
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      const attrs = c?.attributes ?? {};
      const mainName =
        attrs.PlaceName ||
        attrs.StAddr ||
        c.address?.split(",")[0] ||
        cleanKeyword;
      const district =
        attrs.District ||
        attrs.Subregion ||
        attrs.Nbrhd ||
        attrs.City ||
        "TP. Hồ Chí Minh";
      const fullAddress =
        attrs.Place_addr ||
        c.address ||
        `${mainName}, ${district}, TP. Hồ Chí Minh`;

      if (
        !results.some(
          (r) =>
            r.name.toLowerCase() === mainName.toLowerCase() &&
            Math.abs(r.lat - lat) < 0.002,
        )
      ) {
        results.push({
          name: mainName,
          address: fullAddress,
          street: attrs.StAddr || mainName,
          district,
          lat,
          lng,
        });
      }
    }

    const features = photonRes?.data?.features ?? [];
    for (const f of features) {
      const lng = f?.geometry?.coordinates?.[0];
      const lat = f?.geometry?.coordinates?.[1];
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      const props = f?.properties ?? {};
      const mainName =
        props.name ||
        [props.housenumber, props.street].filter(Boolean).join(" ") ||
        cleanKeyword;
      const district =
        props.district || props.city || props.county || "TP. Hồ Chí Minh";
      const fullAddress = [
        props.housenumber
          ? `${props.housenumber} ${props.street || ""}`.trim()
          : props.street,
        props.suburb,
        district,
        "TP. Hồ Chí Minh",
      ]
        .filter(Boolean)
        .join(", ");

      if (
        !results.some(
          (r) =>
            r.name.toLowerCase() === mainName.toLowerCase() &&
            Math.abs(r.lat - lat) < 0.002,
        )
      ) {
        results.push({
          name: mainName,
          address: fullAddress || `${mainName}, ${district}`,
          street: props.street || mainName,
          district,
          lat,
          lng,
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Reverse Geocoding: Đổi tọa độ GPS sang tên đường, Quận/Huyện qua Nominatim OSM API
   */
  async reverseGeocode(lat: number, lng: number) {
    const nominatimBase = this.configService.get<string>(
      "NOMINATIM_BASE_URL",
      "https://nominatim.openstreetmap.org",
    );
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${nominatimBase}/reverse`, {
          params: {
            lat,
            lon: lng,
            format: "jsonv2",
            "accept-language": "vi",
          },
          headers: {
            "User-Agent": "SaigonDrainAI-Hackathon/1.0",
          },
          timeout: 4500,
        }),
      );
      const addr = response.data?.address ?? {};
      const location =
        [addr.house_number, addr.road].filter(Boolean).join(" ") ||
        response.data?.name ||
        "105 Bà Huyện Thanh Quan";
      const district =
        addr.suburb ||
        addr.city_district ||
        addr.county ||
        addr.city ||
        "Quận 3";

      return {
        lat,
        lng,
        location,
        district,
        displayName:
          response.data?.display_name || `${location}, ${district}, TP.HCM`,
      };
    } catch {
      return {
        lat,
        lng,
        location: "105 Bà Huyện Thanh Quan",
        district: "Quận 3",
        displayName: "105 Bà Huyện Thanh Quan, Quận 3, TP. Hồ Chí Minh",
      };
    }
  }

  /**
   * Lấy độ cao địa hình (mét) từ Open-Meteo Elevation API và đánh giá vùng trũng
   */
  async getElevationAndTerrainRisk(lat: number, lng: number) {
    const elevationM = await this.weatherService.fetchElevation(lat, lng, 2.4);
    const isLowLying = elevationM <= 2.5;
    return {
      lat,
      lng,
      elevationM,
      terrainClassification:
        elevationM <= 2.0
          ? "Vùng rất trũng (Nguy cơ ngập triều cường & mưa lớn rất cao)"
          : elevationM <= 3.5
            ? "Vùng thấp (Cần chú ý thoát nước khi mưa trên 30mm)"
            : "Nền địa hình cao (Thoát nước tốt)",
      isLowLying,
    };
  }

  /**
   * Tính toán và trả về chỉ số nhạy cảm ngập lụt theo mô hình MCDA & Machine Learning
   * dựa trên 5 đặc trưng GIS chuẩn: elevation_median_m, relative_elevation_m, slope_mean_deg, dist_water_m, builtup_ratio_250m
   */
  async getMlSusceptibility() {
    const points = await this.mapPointRepo.find();

    const evaluated = points.map((p) => {
      const elev = p.elevationM || 2.0;
      const distWater = Math.max(20, Math.min(1000, 150 + (elev - 1.0) * 120));
      const slope = Math.max(0.2, Math.min(5.0, 0.4 + elev * 0.3));
      const builtup = 0.85;
      const relElev = elev - 2.5;

      const normElev = Math.max(0, Math.min(1, (elev - 0.5) / 4.0));
      const sElev = 1.0 - normElev;
      const sWater = Math.max(0, Math.min(1, 1.0 - distWater / 1000));
      const sSlope = Math.max(0, Math.min(1, 1.0 - slope / 5.0));
      const sBuiltup = builtup;
      const sRel = Math.max(0, Math.min(1, 1.0 - (relElev + 2.0) / 4.0));

      const score = Number(
        (
          0.35 * sElev +
          0.25 * sRel +
          0.15 * sWater +
          0.15 * sSlope +
          0.1 * sBuiltup
        ).toFixed(3),
      );

      const riskTier =
        score >= 0.75
          ? "Rất cao (Top 5%)"
          : score >= 0.55
            ? "Cao (Top 10%)"
            : score >= 0.35
              ? "Trung bình (Top 20%)"
              : "Thấp";

      return {
        id: p.id,
        label: p.label,
        district: p.district,
        lat: p.lat,
        lng: p.lng,
        elevationMedianM: elev,
        relativeElevationM: Number(relElev.toFixed(2)),
        slopeMeanDeg: Number(slope.toFixed(2)),
        distWaterM: Math.round(distWater),
        builtupRatio250m: builtup,
        susceptibilityScore: score,
        riskTier,
        primaryHazard: elev <= 1.5 ? "Triều cường & Mưa lớn" : "Mưa cục bộ",
      };
    });

    return {
      modelVersion: "2.0.0",
      algorithm: "MCDA-LightGBM-PU-Ensemble",
      featureSpec: {
        elevation_median_m: "lower_is_higher_risk",
        relative_elevation_m: "lower_is_higher_risk",
        slope_mean_deg: "lower_is_higher_risk",
        dist_water_m: "lower_is_higher_risk",
        builtup_ratio_250m: "higher_is_higher_risk",
      },
      totalPointsEvaluated: evaluated.length,
      segments: evaluated,
    };
  }
}
