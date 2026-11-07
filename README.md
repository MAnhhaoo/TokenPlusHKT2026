# SaigonDrain AI — HCMC Road Flood Prediction & Navigation System
## Hệ Thống Dự Báo Ngập Đô Thị & Điều Hướng Tuyến Đường An Toàn TP.HCM

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0-ea2845.svg)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.12-3776ab.svg)](https://www.python.org/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android%20Native-119eff.svg)](https://capacitorjs.com/)

---

## 1. Cấu trúc Dự án (Repository Architecture)

Hệ thống được tổ chức theo chuẩn cấu trúc Monorepo thống nhất:

```text
TokenPlus/
├── docs/
│   ├── PRD.md                  # Tài liệu Yêu cầu Sản phẩm (Product Requirements Document)
│   ├── SYSTEM_DESIGN.md        # Kiến trúc Hệ thống & Luồng Dữ liệu (System Design)
│   ├── API_SPEC.md             # Đặc tả giao thức API REST & Server-Sent Events (SSE)
│   ├── AI_SAFETY.md            # Tiêu chuẩn An toàn AI, Ngưỡng Thủy kích & Pháp lý
│   └── Tai_Lieu_Thuat_Toan_Thuy_Van_SaigonDrain_AI.docx # Báo cáo Kỹ thuật Thuật toán Thủy văn & AI
├── dataset/
│   └── HCMC_floods/            # Bộ dữ liệu không gian & lịch sử ngập TP.HCM (IRD 250 điểm)
├── FE/
│   ├── user/                   # Ứng dụng di động Người dùng (React 19, MapLibre GL, Android Native)
│   └── admin/                  # Trung tâm điều hành & Kiểm duyệt Đô thị (React 19, Lucide)
├── BE/
│   ├── src/                    # Máy chủ NestJS 11, TypeORM, OSRM/Google Maps, Open-Meteo, Gemini Vision
│   ├── docker-compose.yml      # Cấu hình container PostgreSQL 16
│   └── package.json            # Cấu hình dependencies backend
├── infra/                      # Cấu hình triển khai Cloud & CI/CD
└── README.md                   # Hướng dẫn tổng quan và vận hành hệ thống
```

---

## 2. Bảng Công nghệ Toàn diện (Full Tech Stack)

| Tầng Hệ thống | Công nghệ / Thư viện | Vai trò & Trách nhiệm trong Dự án |
|---|---|---|
| **Frontend User** | **React 19, Vite 8, Tailwind CSS v4, MapLibre GL** | Giao diện di động, bản đồ số vector 3D, điều hướng GPS trực tiếp, cảnh báo mực nước |
| **Mobile Native** | **Capacitor 8 (Android Native)** | Đóng gói mã nguồn web thành ứng dụng Android native, hỗ trợ cảm biến vị trí GPS |
| **Frontend Admin**| **React 19, TypeScript, Tailwind CSS v4, Lucide** | Bảng điều khiển quản trị, biểu đồ phân tích xu hướng ngập, kiểm duyệt phản ánh người dân |
| **Backend API**   | **NestJS 11, RxJS, TypeORM** | Cổng API tập trung, thuật toán định tuyến tránh ngập, đồng bộ dữ liệu thời tiết & triều cường |
| **Cơ sở Dữ liệu** | **PostgreSQL 16** | Quản lý bảng dữ liệu điểm ngập, báo cáo hiện trường, người dùng, lịch sử hành trình |
| **Dịch vụ Ngoài** | **Open-Meteo, OSRM, Google Routes v2** | Cung cấp dự báo lượng mưa thời gian thực (mm/h), cao độ mặt đất và hình học tuyến đường |
| **Bản đồ Vector** | **OpenFreeMap Liberty / CARTO Voyager** | Vector Tiles mượt mà 60 FPS, không phụ thuộc API key tốn phí |
| **AI & Thủy văn**  | **Google Gemini Vision API, Open-Meteo, 250 IRD Points** | Phân tích ảnh hiện trường đa phương thức, tính toán thủy văn & địa hình trũng thực tế (Zero Synthetic Data) |

---

## 3. Các Tính năng Nổi bật Đã Triển khai (Key Implemented Features)

1. **Điều hướng Đa phương tiện Thông minh (🛵 Xe máy & 🚗 Xe hơi):**
   - Xe máy: Cho phép đi qua mạng lưới hẻm kết nối; ngưỡng cảnh báo ngập $15\text{ cm}$, hạn chế khi ngập $\ge 20\text{ cm}$.
   - Xe hơi: Tự động né tránh hẻm nhỏ hẹp ($< 3\text{ m}$); phạt nặng lộ trình khi ngập $\ge 25\text{ cm}$, hạn chế $\ge 35\text{ cm}$ để chống thủy kích (hydrolock).
2. **Thuật toán Alley Extender:**
   - Tự động bắt tọa độ (snap) từ trong hẻm sâu ra trục đường chính, bổ sung bước điều hướng đầu tiên: *"Từ vị trí trong hẻm, đi thẳng ra trục đường chính (X mét)"*.
3. **So sánh Hai Tuyến đường Thực tế:**
   - Cung cấp **Tuyến đề xuất** (nhanh nhất/ít phơi nhiễm nguy cơ ngập) và **Tuyến dự phòng** (đường vòng né ngập) với số km và thời gian thực tế khác biệt.
4. **Mô phỏng Triều cường Động theo Giờ:**
   - Mực nước hiển thị tại từng điểm đen biến thiên linh hoạt theo độ sâu lịch sử (`h.depth`) và hàm chu kỳ bán nhật triều sông Sài Gòn (đỉnh triều 05:00 - 07:00 sáng và 17:00 - 19:00 chiều).
5. **Thuật toán Thủy văn & Địa hình thực tế (Deterministic Hydrological Algorithm):**
   - Tự động tính toán lượng mưa hiệu dụng thời gian thực từ Open-Meteo đối chiếu với 250 điểm IRD, cao độ $K_{\text{topo}}$, tần suất $K_{\text{hist}}$ và chu kỳ triều cường sông Sài Gòn.
6. **Google Gemini Multimodal Vision API:**
   - Phân tích ảnh chụp hiện trường do người dân gửi về, tự động đo lường độ sâu ngập, phát hiện cống tắc và tự động duyệt đưa lên bản đồ cộng đồng.
7. **Ứng dụng Di động Android Hoàn chỉnh:**
   - Sẵn sàng mở trong Android Studio hoặc build qua Gradle để xuất bản APK.

---

## 4. Hướng dẫn Cài đặt & Chạy Thử nghiệm Cục bộ (Local Run Guide)

### 4.1. Khởi động Toàn bộ Hệ thống bằng Script (Khuyến nghị trên Windows)

Chỉ cần nhấp đúp chuột vào các file script chuẩn bị sẵn tại thư mục gốc:

- **`start-all.bat`**: Khởi động cả User App và Admin Dashboard song song.
- **`start-backend.bat`**: Khởi động máy chủ NestJS API tại `http://localhost:3000` (Swagger: `http://localhost:3000/api/docs`).
- **`start-user.bat`**: Khởi động Ứng dụng Người dùng tại `http://localhost:5173`.
- **`start-admin.bat`**: Khởi động Trang Quản trị tại `http://localhost:5174`.
- **`sync-android.bat`**: Tự động build và đồng bộ mã nguồn sang dự án Android Studio.

---

### 4.2. Khởi động bằng Dòng lệnh (Terminal / Command Line)

#### Bước 1: Cài đặt Dependencies
```bash
# Cài đặt toàn bộ dependencies của Monorepo
pnpm install
```

#### Bước 2: Khởi động Backend (NestJS API)
```bash
pnpm run dev:be
```
*API sẽ lắng nghe tại cổng `3000`.*

#### Bước 3: Khởi động Frontend
Mở một cửa sổ Terminal mới:
```bash
# Chạy cả 2 ứng dụng song song:
pnpm dev

# Hoặc chạy riêng từng ứng dụng:
pnpm dev:user    # http://localhost:5173
pnpm dev:admin   # http://localhost:5174
```

---

### 4.3. Đóng gói Ứng dụng Di động Android

```bash
cd FE/user
pnpm run build
pnpm exec cap sync android
pnpm exec cap open android
```
Sau khi Android Studio mở dự án:
Chọn menu: **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)** để xuất file cài đặt `.apk`.

---

## 5. Tài liệu Kỹ thuật Chi tiết (Detailed Documentation)

- **[docs/Tai_Lieu_Thuat_Toan_Thuy_Van_SaigonDrain_AI.docx](docs/Tai_Lieu_Thuat_Toan_Thuy_Van_SaigonDrain_AI.docx)**: Báo cáo kỹ thuật chi tiết về Thuật toán Thủy văn, Định tuyến OSRM né ngập và Google Gemini Multimodal Vision.
- **[docs/PRD.md](docs/PRD.md)**: Đặc tả chi tiết yêu cầu sản phẩm, đối tượng người dùng và các kịch bản sử dụng.
- **[docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md)**: Thiết kế kiến trúc tổng thể, sơ đồ khối, lưu đồ thuật toán và schema cơ sở dữ liệu.
- **[docs/API_SPEC.md](docs/API_SPEC.md)**: Danh mục endpoint RESTful, các mã lỗi, cấu trúc payload gửi/nhận và kênh SSE.
- **[docs/AI_SAFETY.md](docs/AI_SAFETY.md)**: Hướng dẫn an toàn AI, ma trận phòng tránh thủy kích cho xe hơi và chính sách kiểm duyệt tin giả.
