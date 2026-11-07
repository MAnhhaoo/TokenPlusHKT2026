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

    // 2. Chế độ chẩn đoán ngập theo thời tiết thời gian thực (Thuật toán Thủy văn & Địa hình thực tế)
    let cityRainMm = 0;
    let districtRainMap: Map<string, number> = new Map();

    if (query.rainMm !== undefined) {
      cityRainMm = Number(query.rainMm);
    } else {
      try {
        const [weather, rainMap] = await Promise.all([
          this.weatherService.getCurrentWeather(),
          this.weatherService.getRealtimeDistrictRainMap(),
        ]);
        cityRainMm = Number(weather?.currentRainMm ?? 0);
        districtRainMap = rainMap;
      } catch {
        cityRainMm = 0;
      }
    }

    // Tính chu kỳ triều cường sông Sài Gòn (thường đạt đỉnh 16h30-19h30 chiều hoặc 04h30-07h30 sáng)
    const vnHour = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    ).getHours();
    const vnMinute = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    ).getMinutes();
    const timeDecimal = vnHour + vnMinute / 60;
    const isTidePeak =
      (timeDecimal >= 16.5 && timeDecimal <= 19.5) ||
      (timeDecimal >= 4.5 && timeDecimal <= 7.5);

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

      if (point.type === "pending" || Boolean(point.linkedReportId)) {
        const isActiveReportPoint =
          point.type === "pending" ||
          (point.type === "flood" && (point.depth || 0) > 0);
        if (
          isActiveReportPoint &&
          (activeLayers.includes("flood") || activeLayers.includes("risk")) &&
          (!query.severity ||
            query.severity === "all" ||
            point.severity === query.severity)
        ) {
          dynamicPoints.push(point);
        }
        continue;
      }

      // Tra cứu lượng mưa thực tế theo từng quận từ Open-Meteo
      const cleanDistrict = (point.district || "").toLowerCase().trim();
      let localRain = query.rainMm !== undefined ? cityRainMm : 0;
      if (query.rainMm === undefined) {
        if (districtRainMap.has(cleanDistrict)) {
          localRain = districtRainMap.get(cleanDistrict)!;
        } else {
          // Khớp mờ tên quận
          for (const [distKey, rVal] of districtRainMap.entries()) {
            if (
              cleanDistrict.includes(distKey) ||
              distKey.includes(cleanDistrict)
            ) {
              localRain = rVal;
              break;
            }
          }
          if (localRain === 0 && cityRainMm > 0) {
            localRain = cityRainMm;
          }
        }
      }

      // 1. Hệ số địa hình trũng thấp (Topographic Vulnerability Index)
      const elevation = point.elevationM || 2.0;
      const terrainFactor =
        elevation <= 1.4
          ? 1.45
          : elevation <= 1.8
            ? 1.3
            : elevation <= 2.5
              ? 1.15
              : elevation <= 4.0
                ? 1.0
                : 0.8;

      // 2. Hệ số tổn thương tần suất ngập lịch sử (Historical Vulnerability Factor)
      const histCount = point.historyCount || 5;
      const histFactor = 1 + Math.min(0.35, histCount * 0.015);

      // 3. Lượng mưa hiệu dụng tích lũy tại mặt đường
      const effectiveRain = localRain * terrainFactor * histFactor;
      const threshold = point.rainfall || 35;

      // 4. Mực nước dâng do triều cường sông Sài Gòn
      let tideDepth = 0;
      const isRiversideLowland =
        elevation <= 1.6 &&
        (cleanDistrict.includes("7") ||
          cleanDistrict.includes("nhà bè") ||
          cleanDistrict.includes("bình thạnh") ||
          cleanDistrict.includes("thủ đức") ||
          cleanDistrict.includes("8") ||
          cleanDistrict.includes("4"));

      if (isTidePeak && isRiversideLowland) {
        const tidePeakHeight =
          (timeDecimal >= 17 && timeDecimal <= 18.5) ||
          (timeDecimal >= 5 && timeDecimal <= 6.5)
            ? 1.68
            : 1.58;
        tideDepth = Math.max(0, Math.round((tidePeakHeight - elevation) * 70));
      }

      const isRainFlooded = localRain >= 5 && effectiveRain >= threshold;
      const isTideFlooded = tideDepth >= 15;
      const isAtRisk =
        !isRainFlooded &&
        !isTideFlooded &&
        ((localRain >= 3 && effectiveRain >= threshold * 0.65) ||
          tideDepth >= 10);

      // Nếu không có mưa và không triều cường: ĐƯỜNG KHÔ RÁO HOÀN TOÀN
      if (!isRainFlooded && !isTideFlooded && !isAtRisk) {
        if (
          activeLayers.includes("history") &&
          histCount >= 5 &&
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

      // Tính toán mực nước ngập ước tính theo thuật toán thủy văn
      let dynamicDepth = 0;
      let calculatedType: "flood" | "risk" = "risk";

      if (isRainFlooded || isTideFlooded) {
        calculatedType = "flood";
        if (isRainFlooded) {
          const rainDepth = Math.round((effectiveRain - threshold) * 0.85 + 15);
          dynamicDepth = Math.max(15, rainDepth + Math.round(tideDepth * 0.5));
        } else {
          dynamicDepth = Math.max(16, tideDepth + 10);
        }
        const maxLimit = point.depth && point.depth > 20 ? point.depth : 65;
        dynamicDepth = Math.min(maxLimit, dynamicDepth);
      } else if (isAtRisk) {
        calculatedType = "risk";
        dynamicDepth = 0;
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

      if (
        (calculatedType === "flood" && !activeLayers.includes("flood")) ||
        (calculatedType === "risk" && !activeLayers.includes("risk"))
      ) {
        continue;
      }

      dynamicPoints.push({
        ...point,
        rainfall: localRain,
        depth: dynamicDepth,
        type: calculatedType,
        severity,
      });
    }

    if (
      typeof this.reportRepo?.find === "function" &&
      (activeLayers.includes("flood") || activeLayers.includes("risk"))
    ) {
      try {
        const verifiedReports = await this.reportRepo.find({
          where: { status: "verified" },
        });
        for (const r of verifiedReports) {
          if (dynamicPoints.some((p) => p.linkedReportId === r.id)) continue;
          if (!r.coordinates) continue;
          const parts = r.coordinates
            .split(",")
            .map((s) => Number.parseFloat(s.trim()));
          if (
            parts.length !== 2 ||
            Number.isNaN(parts[0]) ||
            Number.isNaN(parts[1])
          ) {
            continue;
          }
          const depth = r.reportedDepth || r.aiDepth || 24;
          if (depth <= 0) continue;
          const severity: PointSeverity =
            r.severity === "critical" ||
            r.severity === "high" ||
            r.severity === "medium"
              ? r.severity
              : "medium";
          if (
            query.severity &&
            query.severity !== "all" &&
            severity !== query.severity
          ) {
            continue;
          }
          dynamicPoints.push({
            id: `p_${r.id}`,
            x: 50,
            y: 50,
            lat: parts[0],
            lng: parts[1],
            elevationM: 2.5,
            type: "flood",
            severity,
            label: r.location,
            district: r.district,
            rainfall: cityRainMm ?? 0,
            depth,
            historyCount: r.historyCount || 1,
            linkedReportId: r.id,
            updatedAt: new Date(),
          });
        }
      } catch {
        // Bỏ qua nếu không truy vấn được bảng báo cáo
      }
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
    const hcmDistricts: Array<{ name: string; lat: number; lng: number }> = [
      { name: "Quận 1", lat: 10.7756, lng: 106.7004 },
      { name: "Quận 3", lat: 10.7844, lng: 106.6844 },
      { name: "Quận 4", lat: 10.7578, lng: 106.7013 },
      { name: "Quận 5", lat: 10.754, lng: 106.6634 },
      { name: "Quận 6", lat: 10.7481, lng: 106.6352 },
      { name: "Quận 7", lat: 10.734, lng: 106.7218 },
      { name: "Quận 8", lat: 10.7241, lng: 106.6286 },
      { name: "Quận 10", lat: 10.7716, lng: 106.6672 },
      { name: "Quận 11", lat: 10.763, lng: 106.6502 },
      { name: "Quận 12", lat: 10.8672, lng: 106.6413 },
      { name: "Bình Thạnh", lat: 10.8106, lng: 106.7091 },
      { name: "Gò Vấp", lat: 10.8387, lng: 106.6653 },
      { name: "Phú Nhuận", lat: 10.7992, lng: 106.6803 },
      { name: "Tân Bình", lat: 10.8015, lng: 106.6526 },
      { name: "Tân Phú", lat: 10.7901, lng: 106.628 },
      { name: "Bình Tân", lat: 10.7653, lng: 106.6047 },
      { name: "TP. Thủ Đức", lat: 10.8494, lng: 106.7717 },
      { name: "Nhà Bè", lat: 10.6953, lng: 106.7287 },
      { name: "Bình Chánh", lat: 10.6874, lng: 106.5938 },
      { name: "Hóc Môn", lat: 10.8839, lng: 106.5934 },
      { name: "Củ Chi", lat: 10.9731, lng: 106.4938 },
      { name: "Cần Giờ", lat: 10.4114, lng: 106.8642 },
    ];
    let fallbackDistrict = "Quận 1";
    let minD = Infinity;
    for (const d of hcmDistricts) {
      const dist = (d.lat - lat) ** 2 + (d.lng - lng) ** 2;
      if (dist < minD) {
        minD = dist;
        fallbackDistrict = d.name;
      }
    }

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
          timeout: 3500,
        }),
      );
      const addr = response.data?.address ?? {};
      const road = [addr.house_number, addr.road]
        .filter(Boolean)
        .join(" ")
        .trim();
      const ward = addr.suburb || addr.quarter || addr.neighbourhood || "";
      const rawDistrict =
        addr.city_district || addr.district || addr.county || "";
      const district =
        !rawDistrict ||
        rawDistrict === "Thành phố Hồ Chí Minh" ||
        rawDistrict.toLowerCase().startsWith("phường") ||
        rawDistrict.toLowerCase().startsWith("xã")
          ? fallbackDistrict
          : rawDistrict;
      const location =
        [road, ward].filter(Boolean).join(", ") ||
        response.data?.name ||
        `${district}, TP. Hồ Chí Minh`;

      return {
        lat,
        lng,
        location,
        district,
        displayName:
          response.data?.display_name || `${location}, ${district}, TP.HCM`,
      };
    } catch {
      const isNearSguCs1 =
        Math.abs(lat - 10.779) < 0.005 && Math.abs(lng - 106.6836) < 0.005;
      const location = isNearSguCs1
        ? "105 Bà Huyện Thanh Quan"
        : `${fallbackDistrict}, TP. Hồ Chí Minh`;
      return {
        lat,
        lng,
        location,
        district: isNearSguCs1 ? "Quận 3" : fallbackDistrict,
        displayName: `${location}, ${isNearSguCs1 ? "Quận 3" : fallbackDistrict}, TP. Hồ Chí Minh`,
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
   * Tính toán chỉ số nhạy cảm ngập lụt thực tế từ dữ liệu quan trắc lịch sử IRD và cao độ thực tế (elevationM, historyCount, depth).
   */
  async getMlSusceptibility() {
    const points = await this.mapPointRepo.find();

    const evaluated = points.map((p) => {
      const elev = typeof p.elevationM === "number" ? p.elevationM : null;
      const historyCount = p.historyCount || 0;
      const depth = p.depth || 0;

      const sElev =
        elev !== null ? Math.max(0, Math.min(1, 1.0 - (elev - 0.5) / 4.0)) : 0;
      const sHistory = Math.max(0, Math.min(1, historyCount / 10));
      const sDepth = Math.max(0, Math.min(1, depth / 60));

      const score = Number(
        (0.4 * sElev + 0.35 * sHistory + 0.25 * sDepth).toFixed(3),
      );

      const riskTier =
        score >= 0.75
          ? "Rất cao"
          : score >= 0.55
            ? "Cao"
            : score >= 0.35
              ? "Trung bình"
              : "Thấp";

      return {
        id: p.id,
        label: p.label,
        district: p.district,
        lat: p.lat,
        lng: p.lng,
        elevationMedianM: elev,
        historyCount,
        depthCm: depth,
        susceptibilityScore: score,
        riskTier,
        primaryHazard:
          elev !== null && elev <= 1.5 ? "Triều cường & Mưa lớn" : "Mưa lớn",
      };
    });

    return {
      modelVersion: "2.0.0",
      algorithm: "IRD-Empirical-Observation-Score",
      featureSpec: {
        elevation_median_m: "lower_is_higher_risk",
        history_count: "higher_is_higher_risk",
        depth_cm: "higher_is_higher_risk",
      },
      totalPointsEvaluated: evaluated.length,
      segments: evaluated,
    };
  }
}
