import { Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WeatherService } from "../services/weather.service";
import { QueryWeatherDto } from "../dtos/query-weather.dto";
import { WeatherSnapshotEntity } from "../models/weather-snapshot.entity";

@ApiTags("1. Weather API (Open-Meteo Thời tiết & Độ cao)")
@Controller("weather")
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get("current")
  @ApiOperation({
    summary:
      "Gọi Open-Meteo API lấy thời tiết hiện tại, lượng mưa, độ cao địa hình tại TP.HCM",
  })
  @ApiResponse({ status: 200, type: WeatherSnapshotEntity })
  getCurrent(@Query() query: QueryWeatherDto) {
    return this.weatherService.getCurrentWeather(
      query.lat,
      query.lng,
      query.locationName,
    );
  }

  @Get("districts")
  @ApiOperation({
    summary:
      "Lấy thời tiết, lượng mưa và độ cao địa hình cho 7 quận/khu vực trọng điểm ngập TP.HCM",
  })
  getDistrictsWeather() {
    return this.weatherService.getDistrictsWeather();
  }

  @Post("sync-forecasts")
  @ApiOperation({
    summary:
      "Đồng bộ lượng mưa thực tế từ Weather API vào các mốc dự báo (now/+30/+60/+90) và cảm biến",
  })
  syncForecasts() {
    return this.weatherService.syncForecastsWithWeather();
  }

  @Get("history")
  @ApiOperation({
    summary: "Lịch sử các bản ghi thời tiết đã thu thập trong PostgreSQL",
  })
  getHistory() {
    return this.weatherService.getWeatherHistory();
  }
}
