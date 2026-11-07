# API SPECIFICATION
## SaigonDrain AI — Danh Mục & Quy Chuẩn Giao Tiếp API

**Mã tài liệu:** SD-API-2026-V2  
**Phiên bản:** 2.0.0  
**Giao thức:** RESTful JSON & Server-Sent Events (SSE)  
**Địa chỉ máy chủ (Local Development):** `http://localhost:3000/api`  
**Tài liệu tương tác Swagger:** `http://localhost:3000/api/docs`  

---

## 1. Quy chuẩn Chung (General Conventions)

### 1.1. Cấu trúc Phản hồi Thành công (Success Response Standard)
Tất cả các endpoint trả về định dạng JSON được chuẩn hóa qua `TransformInterceptor`:
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Thành công",
  "timestamp": "2026-11-06T12:00:00.000Z"
}
```

### 1.2. Cấu trúc Phản hồi Lỗi (Error Response Standard)
Xử lý tập trung qua `HttpExceptionFilter`:
```json
{
  "statusCode": 400,
  "message": "Tham số kinh độ và vĩ độ không hợp lệ",
  "error": "Bad Request",
  "timestamp": "2026-11-06T12:00:00.000Z",
  "path": "/api/journey/compute-route"
}
```

---

## 2. Phân hệ Thời tiết & Thủy văn (`/api/weather`)

### 2.1. `GET /api/weather/current`
Lấy thông tin thời tiết và đỉnh triều thời gian thực tại TP.HCM.

- **Request:** Không tham số hoặc tùy chọn query `lat`, `lng`.
- **Response 200 OK:**
```json
{
  "temperature": 29.5,
  "weatherCode": 2,
  "weatherDescription": "Ít mây, trời khô ráo",
  "precipitationMm": 0.0,
  "rainRiskLevel": "Thấp",
  "tideHeightM": 1.45,
  "tideStatus": "Đang lên (chu kỳ bán nhật triều chiều)",
  "peakTideTime": "18:30"
}
```

### 2.2. `GET /api/weather/forecast`
Lấy dữ liệu lượng mưa dự báo theo các mốc thời gian (+0h, +30m, +60m, +90m).

- **Response 200 OK:**
```json
[
  { "timeLabel": "Hiện tại", "rainfallMm": 0.3, "riskLevel": "Thấp" },
  { "timeLabel": "+30 phút", "rainfallMm": 0.2, "riskLevel": "Thấp" },
  { "timeLabel": "+60 phút", "rainfallMm": 0.1, "riskLevel": "Thấp" },
  { "timeLabel": "+90 phút", "rainfallMm": 0.1, "riskLevel": "Thấp" }
]
```

---

## 3. Phân hệ Định tuyến & Hành trình (`/api/journey`)

### 3.1. `POST /api/journey/compute-route`
**Endpoint cốt lõi:** Tính toán 2 tuyến đường di chuyển thực tế, né tránh điểm ngập theo từng loại phương tiện và hỗ trợ kết nối từ hẻm.

- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "fromLng": 106.6836363,
  "fromLat": 10.7790693,
  "toLng": 106.6817595,
  "toLat": 10.7597031,
  "vehicleType": "motorcycle"
}
```
*Ghi chú tham số:*
- `vehicleType`: `"motorcycle"` (xe máy) hoặc `"car"` (xe hơi).
- Khi chọn `"car"`, hệ thống cấm điều hướng vào đường nhỏ dưới 3m và áp dụng hệ số phạt rủi ro ngập nghiêm ngặt gấp đôi để phòng tránh thủy kích.

- **Response 200 OK:**
```json
{
  "provider": "osrm-live",
  "origin": [106.6836363, 10.7790693],
  "destination": [106.6817595, 10.7597031],
  "vehicleType": "motorcycle",
  "safeRoute": {
    "id": "safe",
    "name": "Tuyến đề xuất",
    "badge": "An toàn nhất",
    "time": "18 phút",
    "distance": "4,8 km",
    "durationMinutes": 18,
    "riskPenalty": 0,
    "safetyScore": 100,
    "avoidedOrNearbyFloods": [],
    "detail": "Lộ trình khô ráo, không đi qua điểm ngập nào đã ghi nhận.",
    "coordinates": [
      [106.6836363, 10.7790693],
      [106.68352, 10.77891],
      [106.6817595, 10.7597031]
    ],
    "navigationSteps": [
      {
        "icon": "straight",
        "instruction": "Từ vị trí trong hẻm, đi ra",
        "street": "Võ Thị Sáu (45 m)",
        "distance": "Trong 45 m"
      },
      {
        "icon": "turn-left",
        "instruction": "Rẽ trái vào",
        "street": "Nam Kỳ Khởi Nghĩa",
        "distance": "450 m"
      }
    ]
  },
  "balancedRoute": {
    "id": "balanced",
    "name": "Tuyến dự phòng",
    "badge": "Dự phòng",
    "time": "22 phút",
    "distance": "5,6 km",
    "durationMinutes": 22,
    "riskPenalty": 15,
    "safetyScore": 85,
    "avoidedOrNearbyFloods": ["Nguyễn Thị Minh Khai"],
    "detail": "Tuyến dự phòng đường rộng, ít khả năng ùn ứ khi triều cường.",
    "coordinates": [ ... ],
    "navigationSteps": [ ... ]
  }
}
```

### 3.2. `GET /api/journey/forecasts`
Lấy các khung giờ dự báo ngập được đồng bộ từ `WeatherService`.

---

## 4. Phân hệ Bản đồ & Điểm Ngập (`/api/map`)

### 4.1. `GET /api/map/config`
Lấy cấu hình vector basemap 3D và các style khuyến nghị (OpenFreeMap / CARTO).

- **Response 200 OK:**
```json
{
  "center": [106.6827, 10.7694],
  "defaultZoom": 14,
  "recommendedStyle": "https://tiles.openfreemap.org/styles/liberty",
  "styles": {
    "openFreeMapLiberty": {
      "name": "OpenFreeMap Liberty (Vector 3D - Giống Google Maps)",
      "url": "https://tiles.openfreemap.org/styles/liberty",
      "requiresApiKey": false
    },
    "cartoVoyager": {
      "name": "CARTO Voyager (Phong cách Uber Maps)",
      "url": "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      "requiresApiKey": false
    }
  }
}
```

### 4.2. `GET /api/map/points`
Truy vấn danh sách điểm ngập và trạm cảnh báo trên bản đồ.

- **Query Parameters:**
  - `type`: Lọc theo loại (`"flood"`, `"pending"`, `"drain"`, `"camera"`).
  - `severity`: Lọc theo độ nghiêm trọng (`"critical"`, `"high"`, `"medium"`, `"low"`).
  - `district`: Lọc theo quận/huyện (ví dụ: `"Quận 7"`).
- **Response 200 OK:**
```json
[
  {
    "id": "hcmc-flood-2",
    "label": "Đường Trần Xuân Soạn",
    "lat": 10.752863,
    "lng": 106.708234,
    "type": "flood",
    "severity": "critical",
    "depthCm": 38,
    "cause": "Triều cường dâng",
    "district": "Quận 7",
    "susceptibilityScore": 0.89,
    "verified": true
  }
]
```

### 4.3. `GET /api/map/ml/susceptibility`
**Tích hợp Module AI:** Lấy danh sách phân đoạn đường kèm chỉ số nhạy cảm ngập lụt được tính toán từ mô hình Machine Learning / MCDA trong `ml/`.

- **Response 200 OK:**
```json
{
  "modelVersion": "2.0.0",
  "algorithm": "LightGBM-PU-Ensemble",
  "totalSegmentsEvaluated": 425,
  "segments": [
    {
      "segmentId": "SEG_Q7_HUYNH_TAN_PHAT",
      "street": "Huỳnh Tấn Phát",
      "district": "Quận 7",
      "susceptibilityScore": 0.92,
      "elevationMedianM": 0.85,
      "distanceWaterM": 65.0,
      "builtupRatio": 0.84,
      "riskCategory": "Rất cao"
    }
  ]
}
```

---

## 5. Phân hệ Báo cáo Cộng đồng (`/api/reports`)

### 5.1. `POST /api/reports`
Gửi báo cáo hiện trường ngập lụt từ người dân.

- **Request Body:**
```json
{
  "reporterName": "Nguyễn Văn B",
  "lat": 10.7612,
  "lng": 106.6985,
  "reportedDepthCm": 25,
  "photoUrl": "https://storage.saigondrain.vn/reports/img_123.jpg",
  "description": "Nước ngập nửa bánh xe máy trước cổng trường học",
  "passableForMotorbike": false,
  "passableForCar": true
}
```
- **Response 201 Created:** Báo cáo được khởi tạo với trạng thái `"pending"` và tự động hiển thị pin màu cam trên bản đồ để chờ kiểm duyệt.

### 5.2. `PATCH /api/reports/:id/review`
Quản trị viên phê duyệt hoặc từ chối phản ánh.

- **Request Body:**
```json
{
  "status": "approved",
  "verifiedDepthCm": 30,
  "reviewNotes": "Đã xác nhận với camera giao thông ngã tư"
}
```

---

## 6. Phân hệ Cảnh báo & Phát trực tiếp (`/api/alerts` & `/api/realtime`)

### 6.1. `GET /api/realtime/sse`
Kênh Server-Sent Events duy trì kết nối thời gian thực:
- Sự kiện `alert`: Phát thông báo triều cường đỉnh khẩn cấp.
- Sự kiện `report-update`: Báo cáo ngập mới được duyệt, yêu cầu client cập nhật lại layer bản đồ.
- Sự kiện `weather-change`: Lượng mưa thay đổi đột ngột.
