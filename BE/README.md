# SaigonDrain AI — Backend (`SaigonDrain_be`)

Hệ thống Backend RESTful API cho **SaigonDrain AI** xây dựng bằng **NestJS Framework** theo kiến trúc **Feature Module kết hợp MVC** (`Controller` – `Service` – `Model/Entity` – `DTO/View`), kết nối **PostgreSQL** qua **TypeORM** và tích hợp bộ **API Thời tiết & Bản đồ miễn phí 100%**.

---

## 1. Công nghệ & Tích hợp API

- **Framework**: NestJS v11 + TypeScript 5.7
- **Database & ORM**: PostgreSQL 16 (`docker-compose.yml`) + TypeORM (kèm cơ chế tự động fallback sang SQLite/`sql.js` nếu chưa bật Docker PostgreSQL)
- **Tài liệu API**: Swagger UI tại `http://localhost:3000/api/docs`
- **External APIs (100% Free, Không cần API Key)**:
  1. **Open-Meteo Weather API**: Thời tiết, lượng mưa thực tế & dự báo theo giờ tại TP.HCM.
  2. **Open-Meteo Elevation API**: Độ cao địa hình (mét so với mực nước biển) để đánh giá vùng trũng ngập.
  3. **OSRM Routing API**: Tìm lộ trình thực tế và chấm điểm an toàn né các điểm đang ngập.
  4. **Photon (Komoot) API**: Tìm kiếm địa điểm / Autocomplete tại TP.HCM.
  5. **Nominatim OSM API**: Reverse Geocoding đổi tọa độ GPS báo cáo ngập sang tên đường, Quận/Huyện.
  6. **OpenFreeMap & CARTO Vector Styles**: Cấu hình bản đồ Vector 3D đẹp như Google Maps / Uber Maps.

---

## 2. Hướng dẫn Cài đặt & Chạy

### Bước 1: Khởi động PostgreSQL (Tùy chọn — qua Docker)
```powershell
cd C:\HACKATHON\SaigonDrain_be
docker compose up -d
```
*(Nếu máy chưa bật Docker, Backend sẽ tự động phát hiện và lưu dữ liệu vào file `saigondrain.sqlite` cục bộ để bạn chạy thử ngay lập tức mà không bị lỗi kết nối).*

### Bước 2: Cài đặt thư viện
```powershell
npm install
```

### Bước 3: Chạy server Development
```powershell
npm run start:dev
```

- **Base API URL**: `http://localhost:3000/api`
- **Swagger UI (Thử nghiệm API trực tiếp)**: `http://localhost:3000/api/docs`

---

## 3. Các lệnh Kiểm tra & Build

```powershell
npm run typecheck   # Kiểm tra kiểu TypeScript
npm run build       # Build bản production vào thư mục dist/
npm run test        # Chạy Unit Tests (Jest)
```

