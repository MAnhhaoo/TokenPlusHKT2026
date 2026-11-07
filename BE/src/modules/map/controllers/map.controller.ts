import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MapService } from "../services/map.service";
import {
  CreateMapPointDto,
  QueryMapPointsDto,
  UpdateMapPointDto,
} from "../dtos/query-map-points.dto";
import { ReverseGeocodeDto, SearchGeocodeDto } from "../dtos/geocode-query.dto";
import { OperatorAuthGuard } from "../../../common/guards/operator-auth.guard";

@ApiTags("2. Map, Geocoding & Elevation (Bản đồ, Địa chỉ & Độ cao)")
@Controller("map")
export class MapController {
  constructor(private readonly mapService: MapService) {}

  /**
   * Trả về cấu hình Vector Basemap miễn phí cho giao diện bản đồ.
   */
  @Get("config")
  @ApiOperation({
    summary:
      "Lấy cấu hình Vector Map miễn phí đẹp như Google Maps (OpenFreeMap Liberty/Bright, CARTO Voyager)",
  })
  getConfig() {
    return this.mapService.getMapConfig();
  }

  /**
   * Truy vấn danh sách điểm giám sát bản đồ theo lớp hiển thị và mức độ ngập.
   */
  @Get("points")
  @ApiOperation({
    summary:
      "Lấy danh sách điểm giám sát bản đồ theo 4 lớp (flood, risk, rain, history) và mức độ",
  })
  findAllPoints(@Query() query: QueryMapPointsDto) {
    return this.mapService.findAllPoints(query);
  }

  /**
   * Xem chi tiết một điểm giám sát trên bản đồ kèm báo cáo liên kết.
   */
  @Get("points/:id")
  @ApiOperation({
    summary: "Xem chi tiết một điểm trên bản đồ kèm báo cáo cộng đồng liên kết",
  })
  findPointById(@Param("id") id: string) {
    return this.mapService.findPointById(id);
  }

  /**
   * Thêm điểm giám sát hoặc cảm biến mới lên bản đồ (yêu cầu quyền điều phối viên).
   */
  @UseGuards(OperatorAuthGuard)
  @Post("points")
  @ApiOperation({ summary: "Thêm điểm giám sát hoặc cảm biến mới lên bản đồ" })
  createPoint(@Body() dto: CreateMapPointDto) {
    return this.mapService.createPoint(dto);
  }

  /**
   * Cập nhật lượng mưa hoặc độ sâu ngập tại một điểm trên bản đồ.
   */
  @UseGuards(OperatorAuthGuard)
  @Patch("points/:id")
  @ApiOperation({ summary: "Cập nhật lượng mưa hoặc mức ngập tại điểm bản đồ" })
  updatePoint(@Param("id") id: string, @Body() dto: UpdateMapPointDto) {
    return this.mapService.updatePoint(id, dto);
  }

  @Get("geocode/search")
  @ApiOperation({
    summary:
      "Tìm kiếm địa điểm / Autocomplete tại TP.HCM qua Photon (Komoot) API miễn phí",
  })
  searchPlaces(@Query() query: SearchGeocodeDto) {
    return this.mapService.searchPlaces(query.q, query.limit ?? 5);
  }

  @Get("geocode/reverse")
  @ApiOperation({
    summary:
      "Reverse Geocoding: Đổi tọa độ GPS (lat, lng) sang tên đường, Quận/Huyện qua Nominatim OSM",
  })
  reverseGeocode(@Query() query: ReverseGeocodeDto) {
    return this.mapService.reverseGeocode(query.lat, query.lng);
  }

  @Get("elevation")
  @ApiOperation({
    summary:
      "Lấy độ cao mặt đất (mét so với mực nước biển) từ Open-Meteo Elevation API và đánh giá vùng trũng",
  })
  getElevation(@Query() query: ReverseGeocodeDto) {
    return this.mapService.getElevationAndTerrainRisk(query.lat, query.lng);
  }
  @Get("ml/susceptibility")
  @ApiOperation({
    summary:
      "Lay danh sach diem ngap kem chi so nhay cam ngap lut duoc tinh toan tu mo hinh ML / MCDA",
  })
  getMlSusceptibility() {
    return this.mapService.getMlSusceptibility();
  }
}
