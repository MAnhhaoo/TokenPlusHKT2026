import { Injectable, Logger, Optional } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { firstValueFrom } from "rxjs";
import {
  HourlyWeatherItem,
  WeatherSnapshotEntity,
} from "../models/weather-snapshot.entity";
import { ForecastSlotEntity } from "../../journey/models/forecast-slot.entity";
import { MapPointEntity } from "../../map/models/map-point.entity";
import { RealtimeService } from "../../realtime/services/realtime.service";

export interface DistrictWeatherResult {
  district: string;
  hotspot: string;
  lat: number;
  lng: number;
  elevationM: number;
  temperatureC: number;
  humidityPercent: number;
  windSpeedKmh: number;
  currentRainMm: number;
  weatherCondition: string;
  floodRiskLevel: "Thấp" | "Trung bình" | "Cao" | "Rất cao";
  riskScore: number;
}

export const HCMC_DISTRICTS = [
  {
    district: "Bình Thạnh",
    hotspot: "Nguyễn Hữu Cảnh",
    lat: 10.7934,
    lng: 106.7185,
    defaultElevationM: 1.6,
  },
  {
    district: "TP. Thủ Đức",
    hotspot: "Thảo Điền - Quốc Hương",
    lat: 10.8038,
    lng: 106.7329,
    defaultElevationM: 1.9,
  },
  {
    district: "Quận 7",
    hotspot: "Huỳnh Tấn Phát",
    lat: 10.734,
    lng: 106.7315,
    defaultElevationM: 1.5,
  },
  {
    district: "Quận 12",
    hotspot: "Nguyễn Văn Quá",
    lat: 10.8381,
    lng: 106.6304,
    defaultElevationM: 4.2,
  },
  {
    district: "Gò Vấp",
    hotspot: "Phan Huy Ích",
    lat: 10.8336,
    lng: 106.6341,
    defaultElevationM: 5.1,
  },
  {
    district: "Bình Chánh",
    hotspot: "Nguyễn Văn Linh",
    lat: 10.7079,
    lng: 106.6366,
    defaultElevationM: 2.1,
  },
  {
    district: "Nhà Bè",
    hotspot: "Lê Văn Lương",
    lat: 10.6842,
    lng: 106.7021,
    defaultElevationM: 1.4,
  },
  {
    district: "Quận 1",
    hotspot: "Bến Nghé - Bến Thành",
    lat: 10.7769,
    lng: 106.7009,
    defaultElevationM: 3.5,
  },
  {
    district: "Quận 3",
    hotspot: "Nam Kỳ Khởi Nghĩa",
    lat: 10.7844,
    lng: 106.6844,
    defaultElevationM: 4.0,
  },
  {
    district: "Quận 4",
    hotspot: "Đoàn Văn Bơ",
    lat: 10.7578,
    lng: 106.7012,
    defaultElevationM: 2.0,
  },
  {
    district: "Quận 5",
    hotspot: "Hải Thượng Lãn Ông",
    lat: 10.7554,
    lng: 106.6669,
    defaultElevationM: 3.2,
  },
  {
    district: "Quận 6",
    hotspot: "An Dương Vương",
    lat: 10.7471,
    lng: 106.6352,
    defaultElevationM: 2.3,
  },
  {
    district: "Quận 8",
    hotspot: "Cầu Chà Và - Bến Bình Đông",
    lat: 10.7501,
    lng: 106.6567,
    defaultElevationM: 1.6,
  },
  {
    district: "Quận 10",
    hotspot: "Đường 3 Tháng 2",
    lat: 10.7716,
    lng: 106.6675,
    defaultElevationM: 3.8,
  },
  {
    district: "Quận 11",
    hotspot: "Lạc Long Quân",
    lat: 10.7629,
    lng: 106.6504,
    defaultElevationM: 3.6,
  },
  {
    district: "Tân Bình",
    hotspot: "Tân Sơn Nhất - Trường Chinh",
    lat: 10.8188,
    lng: 106.6519,
    defaultElevationM: 4.5,
  },
  {
    district: "Tân Phú",
    hotspot: "Thoại Ngọc Hầu",
    lat: 10.7901,
    lng: 106.6284,
    defaultElevationM: 4.8,
  },
  {
    district: "Bình Tân",
    hotspot: "Kinh Dương Vương - An Lạc",
    lat: 10.7445,
    lng: 106.6083,
    defaultElevationM: 3.2,
  },
  {
    district: "Hóc Môn",
    hotspot: "Quốc lộ 22",
    lat: 10.8847,
    lng: 106.5919,
    defaultElevationM: 6.2,
  },
  {
    district: "Cần Giờ",
    hotspot: "Rừng Sác",
    lat: 10.4114,
    lng: 106.9556,
    defaultElevationM: 1.1,
  },
];

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private latestMinutely15Slots: [number, number, number, number] | null = null;
  private weatherCache = new Map<
    string,
    { snapshot: WeatherSnapshotEntity; expiresAt: number }
  >();
  private inflightWeather = new Map<string, Promise<WeatherSnapshotEntity>>();
  private districtRainCache: {
    map: Map<string, number>;
    expiresAt: number;
  } | null = null;
  private inflightDistrictRain: Promise<Map<string, number>> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(WeatherSnapshotEntity)
    private readonly weatherRepo: Repository<WeatherSnapshotEntity>,
    @InjectRepository(ForecastSlotEntity)
    private readonly forecastRepo: Repository<ForecastSlotEntity>,
    @InjectRepository(MapPointEntity)
    private readonly mapPointRepo: Repository<MapPointEntity>,
    @Optional() private readonly realtimeService?: RealtimeService,
  ) {}

  /**
   * Tính mức độ rủi ro ngập kết hợp Lượng mưa (mm) và Độ cao địa hình (m)
   */
  public calculateFloodRisk(
    rainMm: number,
    elevationM: number,
  ): {
    level: "Thấp" | "Trung bình" | "Cao" | "Rất cao";
    zone: number;
    score: number;
  } {
    const terrainFactor =
      elevationM <= 2.5 ? 1.4 : elevationM <= 6.0 ? 1.0 : 0.7;
    const score = Math.round(rainMm * terrainFactor * 10) / 10;

    if (score >= 45) return { level: "Rất cao", zone: 2, score };
    if (score >= 25) return { level: "Cao", zone: 1, score };
    if (score >= 10) return { level: "Trung bình", zone: 1, score };
    return { level: "Thấp", zone: 0, score };
  }

  /**
   * Chuyển đổi mã thời tiết WMO và lượng mưa thực tế sang mô tả tiếng Việt.
   */
  public describeWmoCode(code: number, rainMm: number): string {
    if (code >= 95 || rainMm >= 40) return "Mưa dông diện rộng";
    if (code >= 80 || rainMm >= 20) return "Mưa rào lớn";
    if (code >= 61 || rainMm >= 5) return "Mưa vừa";
    if (code >= 51 || rainMm > 0) return "Mưa nhỏ rải rác";
    if (code >= 2) return "Nhiều mây";
    return "Trời quang mây";
  }

  /**
   * Gọi Open-Meteo Elevation API lấy độ cao mặt đất (mét so với mực nước biển)
   */
  async fetchElevation(
    lat: number,
    lng: number,
    fallback = 3.2,
  ): Promise<number> {
    const baseUrl = this.configService.get<string>(
      "OPEN_METEO_BASE_URL",
      "https://api.open-meteo.com/v1",
    );
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/elevation`, {
          params: { latitude: lat, longitude: lng },
          timeout: 4500,
        }),
      );
      const elevation = response.data?.elevation?.[0];
      return typeof elevation === "number" ? elevation : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Gọi Open-Meteo Weather API (hoặc fallback về cache/simulation nếu mất mạng)
   */
  async getCurrentWeather(
    lat?: number,
    lng?: number,
    locationName = "TP. Hồ Chí Minh",
  ): Promise<WeatherSnapshotEntity> {
    const targetLat =
      lat ?? Number(this.configService.get<number>("DEFAULT_LAT", 10.7769));
    const targetLng =
      lng ?? Number(this.configService.get<number>("DEFAULT_LNG", 106.7009));
    const cacheKey = `${targetLat.toFixed(3)},${targetLng.toFixed(3)}`;
    const now = Date.now();
    const cached = this.weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.snapshot;
    }
    const existingInflight = this.inflightWeather.get(cacheKey);
    if (existingInflight) {
      return existingInflight;
    }

    const requestPromise = this.fetchCurrentWeatherInternal(
      targetLat,
      targetLng,
      locationName,
      cacheKey,
    );
    this.inflightWeather.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      this.inflightWeather.delete(cacheKey);
    }
  }

  private async fetchCurrentWeatherInternal(
    targetLat: number,
    targetLng: number,
    locationName: string,
    cacheKey: string,
  ): Promise<WeatherSnapshotEntity> {
    const baseUrl = this.configService.get<string>(
      "OPEN_METEO_BASE_URL",
      "https://api.open-meteo.com/v1",
    );

    try {
      const [weatherResp, elevationM] = await Promise.all([
        firstValueFrom(
          this.httpService.get(`${baseUrl}/forecast`, {
            params: {
              latitude: targetLat,
              longitude: targetLng,
              current:
                "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m",
              minutely_15: "precipitation,rain",
              hourly:
                "temperature_2m,precipitation_probability,precipitation,rain",
              timezone: "Asia/Bangkok",
              forecast_days: 2,
            },
            timeout: 5000,
          }),
        ),
        this.fetchElevation(targetLat, targetLng, 3.0),
      ]);

      const data = weatherResp.data;
      const current = data?.current ?? {};
      const currentRainMm = Number(current.rain ?? current.precipitation ?? 0);
      const temperatureC = Number(current.temperature_2m ?? 28.5);
      const humidityPercent = Number(current.relative_humidity_2m ?? 82);
      const windSpeedKmh = Number(current.wind_speed_10m ?? 12.4);
      const weatherCode = Number(current.weather_code ?? 61);

      const min15Times: string[] = data?.minutely_15?.time ?? [];
      const min15Precip: number[] =
        data?.minutely_15?.rain ?? data?.minutely_15?.precipitation ?? [];
      if (min15Times.length > 0 && min15Precip.length > 0) {
        const curTimeStr = String(current.time ?? "");
        const mIdx = Math.max(
          0,
          curTimeStr ? min15Times.findIndex((t) => t === curTimeStr) : 0,
        );
        this.latestMinutely15Slots = [
          Math.round(currentRainMm * 10) / 10,
          Math.round(Number(min15Precip[mIdx + 2] ?? 0) * 10) / 10,
          Math.round(Number(min15Precip[mIdx + 4] ?? 0) * 10) / 10,
          Math.round(Number(min15Precip[mIdx + 6] ?? 0) * 10) / 10,
        ];
      } else {
        this.latestMinutely15Slots = null;
      }

      const hourlyTimes: string[] = data?.hourly?.time ?? [];
      const hourlyRain: number[] = data?.hourly?.precipitation ?? [];
      const hourlyProb: number[] =
        data?.hourly?.precipitation_probability ?? [];
      const hourlyTemp: number[] = data?.hourly?.temperature_2m ?? [];

      // Lấy đúng giờ hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh - GMT+7)
      const vnHourStr = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        hour12: false,
      }).format(new Date());
      const startIdx = Math.max(
        0,
        hourlyTimes.findIndex((t) => t.includes(`T${vnHourStr}:`)),
      );

      const hourlyForecast: HourlyWeatherItem[] = hourlyTimes
        .slice(startIdx, startIdx + 8)
        .map((timeStr, offset) => {
          const idx = startIdx + offset;
          return {
            time: timeStr.slice(11, 16) || `${idx % 24}:00`,
            rainMm: Number(hourlyRain[idx] ?? 0),
            precipitationProbability: Number(hourlyProb[idx] ?? 50),
            temperatureC: Number(hourlyTemp[idx] ?? temperatureC),
          };
        });

      const maxUpcomingRain = Math.max(
        currentRainMm,
        ...hourlyForecast.map((h) => h.rainMm),
      );
      const risk = this.calculateFloodRisk(maxUpcomingRain, elevationM);

      const snapshot = this.weatherRepo.create({
        provider: "open-meteo",
        locationName,
        lat: targetLat,
        lng: targetLng,
        elevationM,
        temperatureC,
        humidityPercent,
        windSpeedKmh,
        currentRainMm,
        weatherCondition: this.describeWmoCode(weatherCode, currentRainMm),
        floodRiskLevel: risk.level,
        hourlyForecast,
      });

      const saved = await this.weatherRepo.save(snapshot);
      this.weatherCache.set(cacheKey, {
        snapshot: saved,
        expiresAt: Date.now() + 180_000,
      });
      return saved;
    } catch (error) {
      this.logger.warn(
        `Không thể kết nối Open-Meteo API (${(error as Error).message}), sử dụng dữ liệu fallback/cache.`,
      );
      const latest = await this.weatherRepo.find({
        order: { fetchedAt: "DESC" },
        take: 1,
      });
      if (latest.length > 0) {
        this.weatherCache.set(cacheKey, {
          snapshot: latest[0],
          expiresAt: Date.now() + 60_000,
        });
        return latest[0];
      }

      const fallbackSnapshot = this.weatherRepo.create({
        provider: "fallback",
        locationName,
        lat: targetLat,
        lng: targetLng,
        elevationM: 2.2,
        temperatureC: 28.0,
        humidityPercent: 78,
        windSpeedKmh: 12.0,
        currentRainMm: 0,
        weatherCondition: "Trời quang mây",
        floodRiskLevel: "Thấp",
        hourlyForecast: [
          {
            time: "Hiện tại",
            rainMm: 0,
            precipitationProbability: 10,
            temperatureC: 28.0,
          },
          {
            time: "+30 phút",
            rainMm: 0,
            precipitationProbability: 10,
            temperatureC: 28.0,
          },
          {
            time: "+60 phút",
            rainMm: 0,
            precipitationProbability: 10,
            temperatureC: 27.5,
          },
          {
            time: "+90 phút",
            rainMm: 0,
            precipitationProbability: 10,
            temperatureC: 27.0,
          },
        ],
      });
      const savedFallback = await this.weatherRepo.save(fallbackSnapshot);
      this.weatherCache.set(cacheKey, {
        snapshot: savedFallback,
        expiresAt: Date.now() + 60_000,
      });
      return savedFallback;
    }
  }

  /**
   * Gọi Open-Meteo multi-location để lấy lượng mưa thời gian thực chính xác của từng quận/huyện
   */
  async getRealtimeDistrictRainMap(): Promise<Map<string, number>> {
    const now = Date.now();
    if (this.districtRainCache && this.districtRainCache.expiresAt > now) {
      return this.districtRainCache.map;
    }
    if (this.inflightDistrictRain) {
      return this.inflightDistrictRain;
    }

    const requestPromise = this.fetchRealtimeDistrictRainMapInternal();
    this.inflightDistrictRain = requestPromise;
    try {
      return await requestPromise;
    } finally {
      this.inflightDistrictRain = null;
    }
  }

  private async fetchRealtimeDistrictRainMapInternal(): Promise<
    Map<string, number>
  > {
    const rainMap = new Map<string, number>();
    const baseUrl = this.configService.get<string>(
      "OPEN_METEO_BASE_URL",
      "https://api.open-meteo.com/v1",
    );

    try {
      const lats = HCMC_DISTRICTS.map((d) => d.lat).join(",");
      const lngs = HCMC_DISTRICTS.map((d) => d.lng).join(",");
      const resp = await firstValueFrom(
        this.httpService.get(`${baseUrl}/forecast`, {
          params: {
            latitude: lats,
            longitude: lngs,
            current: "precipitation,rain",
            timezone: "Asia/Bangkok",
          },
          timeout: 4500,
        }),
      );

      const items = Array.isArray(resp.data) ? resp.data : [resp.data];
      items.forEach((item: any, idx: number) => {
        const d = HCMC_DISTRICTS[idx];
        if (d) {
          const cur = item?.current ?? {};
          const rain = Number(cur.rain ?? cur.precipitation ?? 0);
          rainMap.set(d.district, rain);
          rainMap.set(d.district.toLowerCase(), rain);
          if (d.district.includes("Thủ Đức")) {
            rainMap.set("thủ đức", rain);
            rainMap.set("tp thủ đức", rain);
            rainMap.set("tp. thủ đức", rain);
            rainMap.set("quận 2", rain);
            rainMap.set("quận 9", rain);
          }
        }
      });
      this.districtRainCache = {
        map: rainMap,
        expiresAt: Date.now() + 180_000,
      };
      return rainMap;
    } catch (err) {
      this.logger.warn(
        `Lỗi lấy mưa quận Open-Meteo: ${(err as Error).message}`,
      );
      try {
        const latest = await this.weatherRepo.find?.({
          order: { fetchedAt: "DESC" },
          take: 1,
        });
        const baseRain = Number(latest?.[0]?.currentRainMm ?? 0);
        HCMC_DISTRICTS.forEach((d) => {
          rainMap.set(d.district, baseRain);
          rainMap.set(d.district.toLowerCase(), baseRain);
        });
      } catch {
        // ignore
      }
      this.districtRainCache = {
        map: rainMap,
        expiresAt: Date.now() + 60_000,
      };
      return rainMap;
    }
  }

  /**
   * Lấy thông tin thời tiết, độ cao và rủi ro ngập của các quận/huyện TP.HCM từ Open-Meteo thực tế
   */
  async getDistrictsWeather(): Promise<DistrictWeatherResult[]> {
    const [baseSnapshot, districtRainMap] = await Promise.all([
      this.getCurrentWeather(),
      this.getRealtimeDistrictRainMap(),
    ]);

    return HCMC_DISTRICTS.map((item) => {
      const rainMm =
        districtRainMap.get(item.district.toLowerCase()) ??
        baseSnapshot.currentRainMm;
      const risk = this.calculateFloodRisk(rainMm, item.defaultElevationM);

      return {
        district: item.district,
        hotspot: item.hotspot,
        lat: item.lat,
        lng: item.lng,
        elevationM: item.defaultElevationM,
        temperatureC: Math.round(baseSnapshot.temperatureC * 10) / 10,
        humidityPercent: Math.round(baseSnapshot.humidityPercent),
        windSpeedKmh: baseSnapshot.windSpeedKmh,
        currentRainMm: rainMm,
        weatherCondition:
          baseSnapshot.weatherCondition || this.describeWmoCode(0, rainMm),
        floodRiskLevel: risk.level,
        riskScore: risk.score,
      };
    });
  }

  /**
   * Đồng bộ dữ liệu thời tiết thực vào bảng forecast_slots và map_points
   */
  async syncForecastsWithWeather() {
    const snapshot = await this.getCurrentWeather();
    const hourly = snapshot.hourlyForecast ?? [];

    const [nowRain, slot30Rain, slot60Rain, slot90Rain] = this
      .latestMinutely15Slots ?? [
      Math.round((snapshot.currentRainMm || 0) * 10) / 10,
      Math.round((hourly[1]?.rainMm ?? 0) * 10) / 10,
      Math.round((hourly[2]?.rainMm ?? 0) * 10) / 10,
      Math.round((hourly[3]?.rainMm ?? 0) * 10) / 10,
    ];

    const riskNow = this.calculateFloodRisk(nowRain, snapshot.elevationM);
    const risk30 = this.calculateFloodRisk(slot30Rain, snapshot.elevationM);
    const risk60 = this.calculateFloodRisk(slot60Rain, snapshot.elevationM);
    const risk90 = this.calculateFloodRisk(slot90Rain, snapshot.elevationM);

    const slots: ForecastSlotEntity[] = [
      {
        id: "now",
        label: "Hiện tại",
        rain: `${nowRain} mm`,
        rainMm: nowRain,
        risk: riskNow.level,
        zone: riskNow.zone,
        sortOrder: 0,
      },
      {
        id: "30",
        label: "+30 phút",
        rain: `${slot30Rain} mm`,
        rainMm: slot30Rain,
        risk: risk30.level,
        zone: risk30.zone,
        sortOrder: 1,
      },
      {
        id: "60",
        label: "+60 phút",
        rain: `${slot60Rain} mm`,
        rainMm: slot60Rain,
        risk: risk60.level,
        zone: risk60.zone,
        sortOrder: 2,
      },
      {
        id: "90",
        label: "+90 phút",
        rain: `${slot90Rain} mm`,
        rainMm: slot90Rain,
        risk:
          slot90Rain < slot60Rain && slot60Rain >= 10
            ? "Giảm dần"
            : risk90.level,
        zone: risk90.zone,
        sortOrder: 3,
      },
    ];

    await this.forecastRepo.save(slots);

    const sensorPoints = await this.mapPointRepo.find({
      where: { type: "sensor" },
    });
    for (const point of sensorPoints) {
      point.rainfall = slot30Rain;
      await this.mapPointRepo.save(point);
    }

    const result = {
      message:
        "Đã đồng bộ dữ liệu mưa từ Weather API vào các mốc dự báo và cảm biến.",
      provider: snapshot.provider,
      syncedAt: new Date().toISOString(),
      slots,
    };

    this.realtimeService?.broadcast("weather.updated", {
      snapshot,
      slots,
    });

    return result;
  }

  /**
   * Lấy lịch sử các bản chụp thời tiết gần nhất đã lưu trong cơ sở dữ liệu.
   */
  async getWeatherHistory(limit = 10): Promise<WeatherSnapshotEntity[]> {
    return this.weatherRepo.find({
      order: { fetchedAt: "DESC" },
      take: limit,
    });
  }
}
