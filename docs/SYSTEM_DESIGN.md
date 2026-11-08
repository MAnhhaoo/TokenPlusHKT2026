# SYSTEM DESIGN DOCUMENT
## SaigonDrain AI — Kiến Trúc Hệ Thống Dự Báo Ngập & Điều Hướng Thông Minh TP.HCM

**Mã tài liệu:** SD-SYS-2026-V2  
**Phiên bản:** 2.0.0 (Unified Monorepo Architecture)  
**Tác giả:** Đội ngũ Kỹ sư Hệ thống SaigonDrain AI  
**Trạng thái:** Implemented & Verified  

---

## 1. Kiến trúc Tổng thể Hệ thống (System Architecture Overview)

Hệ thống được tổ chức theo mô hình **Unified Monorepo**, phân tách rành mạch thành 4 tầng thành phần:

```mermaid
graph TD
    subgraph ClientLayer ["1. TẦNG GIAO DIỆN (FRONTEND)"]
        UserApp["🌐 User Web App (React 19 + Vite + MapLibre GL)<br/>Bản đồ cảnh báo & điều hướng né ngập"]
        AdminApp["💻 Admin Dashboard (React 19 + Vite)<br/>Trung tâm điều hành & kiểm duyệt"]
    end

    subgraph GatewayLayer ["2. TẦNG CỔNG DỊCH VỤ (BACKEND API - NestJS)"]
        JourneyMod["🚗 Journey Module<br/>(Alley Extender & Multi-modal Routing)"]
        MapMod["🗺️ Map Module<br/>(Vector Tiles & Flood Points)"]
        WeatherMod["🌦️ Weather Module<br/>(Rainfall Forecast & Tide Curve)"]
        ReportsMod["📢 Reports Module<br/>(Citizen Crowdsourcing & Gemini Vision)"]
        RealtimeMod["⚡ Realtime Module<br/>(Server-Sent Events Broadcast)"]
    end

    subgraph ExternalServices ["3. DỊCH VỤ NGOÀI & DỮ LIỆU ĐỘNG"]
        OpenMeteo["Open-Meteo API<br/>(Dự báo lượng mưa mm/h & Cao độ)"]
        GeminiAPI["Google Gemini Vision API<br/>(Phân tích ảnh hiện trường hỗ trợ duyệt)"]
        OSRM["OSRM Routing Engine<br/>& Google Routes v2"]
        VectorTiles["OpenFreeMap / CARTO<br/>(Vector Basemap Tiles)"]
    end

    subgraph StorageLayer ["4. TẦNG LƯU TRỮ (PERSISTENCE)"]
        PostgresDB[(PostgreSQL 16<br/>TypeORM Entity Management)]
        IRDDataset["Dữ liệu 250 Điểm Ngập Lịch sử IRD<br/>(hcmc_flood_hotspots.json)"]
    end

    UserApp -->|REST / Geolocation| GatewayLayer
    AdminApp -->|REST / SSE Admin| GatewayLayer
    GatewayLayer -->|Sync Hourly Weather| OpenMeteo
    ReportsMod -->|Structured JSON Vision| GeminiAPI
    JourneyMod -->|Fetch Multi-modal Routes| OSRM
    UserApp -->|Render 3D Vector Tiles| VectorTiles
    GatewayLayer -->|Read / Write Entities| PostgresDB
    IRDDataset -->|Seed & Hydrological Lookup| PostgresDB
```

---

## 2. Thiết kế Chi tiết các Phân hệ (Subsystem Designs)

### 2.1. Phân hệ Frontend (`FE/`)

Cấu trúc thư mục được quy hoạch chuẩn:
```text
FE/
├── user/      # Ứng dụng Web người dùng cuối (React 19 + Vite + MapLibre GL)
└── admin/     # Bảng điều khiển quản trị viên đô thị (React + Vite + Recharts)
```

#### 2.1.1. Ứng dụng Người dùng (`FE/user`)
- **Framework & Công nghệ:** React 19, TypeScript, Vite, Tailwind CSS v4.
- **Bản đồ số & Điều hướng:** MapLibre GL tích hợp nguồn vector tiles miễn phí (OpenFreeMap Liberty / Bright / CARTO Voyager). Hỗ trợ định vị GPS thời gian thực (`navigator.geolocation`), xoay bản đồ theo hướng di chuyển (bearing tracking), và hiển thị vệt đường ngập (polyline có phân màu rủi ro).
- **Trải nghiệm chọn phương tiện thông minh:**
  - Tùy chọn 🛵 **Xe máy** (mặc định) và 🚗 **Xe hơi** với chip chuyển đổi trực quan.
  - Toàn bộ tùy chọn lộ trình ("Tuyến đề xuất", "Tuyến dự phòng") và nút "Bắt đầu điều hướng" chỉ xuất hiện sau khi người dùng chọn xong cả Điểm đi và Điểm đến.

#### 2.1.2. Bảng Điều khiển Quản trị (`frontend/admin`)
- **Framework & Công nghệ:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts.
- **Chức năng:**
  - **Overview Page:** Thống kê tổng số điểm ngập đang hoạt động, lượng mưa hiện tại, mức cảnh báo triều cường đỉnh trong ngày, biểu đồ phân bố điểm ngập theo 24 quận/huyện.
  - **Reports Moderation Queue:** Tiếp nhận phản ánh ngập từ người dân, xem ảnh đính kèm, tọa độ, duyệt (Accept) hoặc từ chối (Reject) với cập nhật tức thời qua Server-Sent Events (SSE).
  - **Operations Map:** Bản đồ tác chiến trực quan hóa vùng rủi ro cao dựa trên dự báo thời tiết và dữ liệu ngập lịch sử.

---

### 2.2. Phân hệ Backend (`backend/`)

Xây dựng trên nền tảng **NestJS**, tuân thủ nghiêm ngặt nguyên lý Dependency Injection và cấu trúc module hóa:

```mermaid
classDiagram
    class AppModule {
    }
    class JourneyModule {
        +JourneyController
        +JourneyService
    }
    class MapModule {
        +MapController
        +MapService
    }
    class WeatherModule {
        +WeatherController
        +WeatherService
    }
    class ReportsModule {
        +ReportsController
        +ReportsService
    }
    class RealtimeModule {
        +RealtimeController
        +RealtimeService
    }
    class SeedModule {
        +SeedController
        +SeedService
    }

    AppModule --> JourneyModule
    AppModule --> MapModule
    AppModule --> WeatherModule
    AppModule --> ReportsModule
    AppModule --> RealtimeModule
    AppModule --> SeedModule
```

#### 2.2.1. Thuật toán Định tuyến & Tránh ngập Đa phương tiện (`JourneyService`)
1. **Thuật toán Alley Extender (Kết nối từ Hẻm):**
   - Người dùng thường bắt đầu chuyến đi từ nhà riêng trong các con hẻm nhỏ không có tên đường chính thức trên bản đồ giao thông động.
   - Khi nhận tọa độ `(fromLng, fromLat)`, hệ thống tính khoảng cách Haversine tới nút giao trục đường gần nhất:
     $$d_{\text{start}} = \text{haversine}((\text{lat}_{\text{user}}, \text{lng}_{\text{user}}), (\text{lat}_{\text{road}}, \text{lng}_{\text{road}}))$$
   - Nếu $d_{\text{start}} > 8\text{ mét}$, thuật toán tự động bổ sung tọa độ điểm xuất phát vào chuỗi hình học (polyline) và sinh bước điều hướng mở đầu:
     `"Từ vị trí trong hẻm, đi thẳng ra [Tên đường] ([d] mét)"`.
2. **Quy tắc Trọng số theo Phương tiện (Vehicle-Specific Weighting):**
   - **🛵 Xe máy:**
     - Cho phép đi qua hẻm kết nối.
     - Phạt rủi ro (Risk Penalty) theo mức độ nghiêm trọng của điểm ngập trong bán kính 300m: `critical` = 50 điểm, `high` = 30 điểm, `medium` = 15 điểm.
     - Ngưỡng cảnh báo độ sâu: $\ge 15\text{ cm}$. Ngưỡng cấm: $\ge 20\text{ cm}$.
   - **🚗 Xe hơi:**
     - Tự động phạt nặng lộ trình đi qua đường hẹp hoặc hẻm cụt.
     - Phạt rủi ro ngập tăng gấp đôi so với xe máy vì nguy cơ hỏng động cơ (thủy kích) và khó quay đầu xe: `critical` = 120 điểm, `high` = 70 điểm.
     - Khi phát hiện tuyến đường chính bị ngập sâu, thuật toán tự động kích hoạt điểm trung gian (detour waypoint) để ép OSRM tìm tuyến đường vòng qua các đại lộ lớn.
     - Ngưỡng cảnh báo độ sâu: $\ge 25\text{ cm}$. Ngưỡng cấm: $\ge 35\text{ cm}$.
3. **Sinh Tuyến đường Đôi (Dual-Route Generation):**
   - Gọi OSRM API với tham số `alternatives=true`.
   - Nếu OSRM chỉ trả về 1 tuyến đường hoặc 2 tuyến có chiều dài/thời gian trùng lặp, hệ thống tự động chèn điểm uốn (midpoint detour vector) lệch $0.0055^\circ$ kinh độ / vĩ độ để tạo ra 2 lựa chọn có số km và thời gian thực tế rõ rệt: **Tuyến đề xuất** (ưu tiên an toàn/khô ráo) và **Tuyến dự phòng** (đường vòng thay thế).

#### 2.2.2. Động lực học Mực nước Động (`WeatherService` & `SeedService`)
- Dữ liệu lịch sử từ 425 điểm ngập IRD chứa thông số độ sâu trung bình (`h.depth`, từ $15\text{ cm}$ đến $60\text{ cm}$).
- Mực nước hiển thị không cố định mà biến thiên theo hàm chu kỳ triều cường thời gian thực:
  $$H_{\text{water}}(t, \text{point}) = h_{\text{depth}} \times \left(0.5 + 0.5 \times \sin\left(\frac{2\pi (t - t_{\text{peak}})}{12}\right)\right) + \Delta H_{\text{rain}}$$
  Trong đó:
  - $h_{\text{depth}}$: Chiều sâu ngập đặc trưng của từng tuyến đường.
  - $t_{\text{peak}}$: Thời điểm đỉnh triều trong ngày (buổi sáng $\approx 06:00$, buổi chiều $\approx 18:00$).
  - $\Delta H_{\text{rain}}$: Hệ số nước dâng do lượng mưa Open-Meteo hiện tại.

---

### 2.3. Phân hệ Phân tích Ảnh Hiện trường & Dữ liệu Ngập Lịch sử (`GeminiVisionService` & `dataset/`)

- **Dữ liệu Không gian & Lịch sử Ngập (`dataset/HCMC_floods` & `hcmc_flood_hotspots.json`):**
  - Tổng hợp các điểm đen ngập úng lịch sử tại TP.HCM kèm tọa độ địa lý, quận/huyện, cao độ địa hình (`elevationM`), ngưỡng mưa gây ngập (`rainThresholdMm`) và tần suất lịch sử (`historyCount`).
- **Trợ lý Phân tích Ảnh Đa phương thức (`GeminiVisionService`):**
  - Sử dụng mô hình **Google Gemini Vision (`gemini-2.5-flash`)** kết hợp `responseSchema` (JSON có cấu trúc) để phân tích ảnh hiện trường do người dân gửi lên.
  - Chỉ ước lượng `estimatedDepthCm` khi trong ảnh có vật chuẩn tham chiếu rõ ràng; trả `null` và gắn trạng thái `evidenceStatus: "insufficient_evidence"` khi ảnh mờ hoặc không đủ căn cứ.
  - Kết quả từ AI chỉ dùng làm đề xuất hỗ trợ kiểm duyệt; báo cáo mới luôn ở trạng thái `pending` cho đến khi Quản trị viên xác minh (`verified`).

---

## 3. Thiết kế Cơ sở Dữ liệu (Database Schema)

Hệ thống hỗ trợ song song PostgreSQL 16 (cho môi trường Production với Docker Compose) và SQLite (cho môi trường kiểm thử Local nhanh chóng):

```mermaid
erDiagram
    MAP_POINT ||--o{ FLOOD_REPORT : receives
    MAP_POINT {
        string id PK
        string label
        float lat
        float lng
        string type
        string severity
        float depthCm
        string description
        string district
        int historyCount
    }
    FLOOD_REPORT {
        string id PK
        string reporterName
        float lat
        float lng
        float reportedDepthCm
        string status
        string photoUrl
        timestamp createdAt
    }
    WEATHER_SNAPSHOT {
        string id PK
        float temperature
        float precipitationMm
        string rainRiskLevel
        float tideHeightM
        timestamp recordedAt
    }
    FORECAST_SLOT {
        string id PK
        string timeLabel
        float rainfallMm
        string riskLevel
        int sortOrder
    }
    ROUTE_OPTION {
        string id PK
        string name
        string badge
        string time
        string distance
        int riskPenalty
        int safetyScore
        json navigationSteps
    }
```

---

## 4. Kiến trúc Triển khai & Vận hành (Deployment & Operations)

### 4.1. Chạy Cục bộ Độc lập (Local Development)
- Tận dụng các script tiện ích chuẩn bị sẵn:
  - `start-all.bat`: Khởi động toàn bộ giao diện người dùng và quản trị (`pnpm run dev`).
  - `start-backend.bat`: Khởi động máy chủ NestJS tại cổng 3000 (`npm run start:dev`).
  - `start-user.bat`: Khởi động ứng dụng người dùng tại cổng 5173.
  - `start-admin.bat`: Khởi động cổng quản trị tại cổng 5174.
