---
title: "SaigonDrain AI | Product Requirements Document"
subtitle: "MVP Hackathon SGU 2026–2027 · Bản 1.1 · 07/11/2026"
author: "Nhóm SaigonDrain AI"
lang: vi
---

# SAIGONDRAIN AI

**PRODUCT REQUIREMENTS DOCUMENT (PRD) · v1.1**  
**Định hướng:** Gợi ý tuyến đường giảm phơi nhiễm với nguy cơ ngập tại TP.HCM  
**Sự kiện:** Hackathon SGU 2026–2027, vòng 24 giờ  
**Tình trạng:** Bản đặc tả mục tiêu và yêu cầu; *không phải xác nhận tính năng đã hoàn thành*.

> **Tuyên bố sản phẩm:** SaigonDrain AI hỗ trợ người dân so sánh tuyến di chuyển theo thời gian/quãng đường và *mức phơi nhiễm nguy cơ ngập tương đối* từ dữ liệu địa hình, lịch sử và phản ánh có trạng thái xác minh. Không khẳng định “đường an toàn”, “đang ngập” hoặc dự báo độ sâu theo giờ khi thiếu quan trắc được xác thực.

## 1. Executive Summary

**Vấn đề.** Người đi xe máy hoặc ô tô ở TP.HCM cần chọn đường nhanh nhưng có thể gặp các đoạn dễ ngập vào mùa mưa/triều. Bản đồ điều hướng phổ thông thường tập trung vào thời gian, quãng đường và giao thông; một bản đồ điểm ngập đơn thuần lại chưa trực tiếp giúp so sánh các phương án hành trình.

**Giải pháp.** Ứng dụng web mobile-first hiển thị bản đồ nguy cơ ngập tương đối theo đoạn đường, nhận điểm đi–đến và phương tiện, tạo các tuyến hợp lệ, so sánh *thời gian dự kiến* cùng *risk exposure* trên từng tuyến, giải thích các đoạn rủi ro, hỗ trợ người dùng gửi phản ánh. Admin duyệt phản ánh; những thông tin chưa xác minh được hiển thị đúng trạng thái. Hệ thống deploy lên Google Cloud Run với URL HTTPS công khai.

**Giá trị cốt lõi:** “Giúp chọn tuyến *ít nguy cơ ngập hơn* dựa trên bằng chứng hiện có” thay vì “cam kết tránh được mọi đường đang ngập”.

**Mục tiêu Hackathon:** Có web/PWA và APK Android chạy được trên máy thật; có luồng end-to-end hoạt động thật, chỉ rõ ML tạo điểm từ dữ liệu gì và vì sao, benchmark so với GIS-MCDA, triển khai cloud, CI/test và bằng chứng demo.

## 2. Nguồn yêu cầu, phạm vi và các giả định

**Nguồn A — kiến trúc mẫu do nhóm cung cấp.** Monorepo `pnpm-workspace` gồm `fe/user`, `fe/admin`, `be`; React + TypeScript, Vite, Capacitor Android/PWA, MapLibre, NestJS/REST/SSE, PostgreSQL/TypeORM, Google Maps/Routes/Places, OSRM, Open-Meteo, các module báo cáo và lộ trình né ngập. Đây là *kiến trúc tham khảo*, không phải bằng chứng hệ thống đã tích hợp xong.

**Nguồn B — tiêu chí chính thức BTC.** 8 nhóm, 100 điểm: sáng tạo 10; thực tiễn 10; dữ liệu & AI 20; cấu trúc/chất lượng triển khai 20; cộng đồng 10; AI tiết kiệm chi phí 10; AWS/GCP 10; teamwork, thuyết trình và demo 10.

**Nguồn C — định hướng BTC bổ sung.** (1) Planning/quản lý công việc, khuyến khích GitHub Spec Kit; (2) kiến trúc, triển khai, DB/storage, logging, monitoring, xử lý lỗi; (3) demo live thực tế, ổn định; (4) khác biệt và lợi thế cạnh tranh; (5) phát triển sau thi: sản phẩm, nghiên cứu hoặc thương mại hóa.

**Nguồn D — tài sản ML hiện có.** Repo `duygri/hcmc-road-flood-ml` có GIS-MCDA, Track B Logistic Regression Presence–Background, spatial partitions, kiểm thử và tài liệu mô hình. Nhóm xác nhận 318 đoạn đường positive đã review; PRD chấp nhận đó là đầu vào theo xác nhận nhóm nhưng việc sử dụng trong code cần tệp review hợp lệ và bằng chứng provenance. Không xem 318 đoạn là 318 sự kiện độc lập.

**Quy tắc giải quyết xung đột:** Khi kiến trúc mẫu có dự báo +30/+60/+90 phút, tính độ sâu ngập theo giờ hoặc ngưỡng 20/35 cm nhưng dữ liệu ML hiện chưa hỗ trợ, chuyển thành **P2/định hướng nghiên cứu**; không trình diễn như kết quả đo thực tế. SSE là luồng *server → client*; client gửi báo cáo qua REST. Các nhà cung cấp bản đồ/API phải được kiểm tra hỗ trợ, quota, điều khoản sử dụng và attribution trước khi bật.

## 3. Mục tiêu, không mục tiêu và thước đo thành công

### 3.1. Mục tiêu sản phẩm

- **G1 — Hành trình thực dụng:** Người dùng nhập điểm đi/đến, chọn xe máy/ô tô và xem ít nhất hai tuyến *nếu routing provider trả về tuyến hợp lệ*; mỗi tuyến có độ dài, ETA (nếu provider cung cấp), điểm phơi nhiễm nguy cơ, mức bao phủ dữ liệu.
- **G2 — AI có bằng chứng:** Bản đồ và tuyến đường sử dụng điểm nguy cơ tương đối có `model_version`, `data_version`; so sánh LR Primary với MCDA Baseline bằng đánh giá held-out phù hợp Presence–Background.
- **G3 — Minh bạch và an toàn:** Phân biệt “độ nhạy cảm ngập lịch sử”, “báo cáo chưa xác minh”, “bản ghi đã xác minh” và “dữ liệu thời tiết”; không tuyên bố đường an toàn.
- **G4 — Demo live & cloud:** FE/PWA + APK Android + API truy cập qua HTTPS, có logs/health, tối thiểu một workflow CI kiểm tra build/lint/test, có phương án dự phòng khi API ngoài lỗi.
- **G5 — Cộng đồng:** Cho gửi phản ánh ngập và có hàng đợi duyệt; hiển thị nguồn và trạng thái xác minh.

### 3.2. Không nằm trong MVP (Out of scope)

- Dự báo đường ngập chính xác trong 30/60/90 phút, độ sâu ngập cm theo giờ; mô hình triều động chưa được kiểm định.
- Tự động cam kết tránh toàn bộ đường ngập; không cho phép tuyên bố “tuyến an toàn tuyệt đối”.
- Native iOS và phát hành Play Store. **Đóng gói APK Android (Capacitor) là hạng mục thực hiện trong 24 giờ Hackathon**, song song web/PWA; không chờ sau cuộc thi.
- Tự động thay đổi điều hướng theo từng giây, hướng dẫn rẽ hẻm nâng cao, kết nối cảm biến vật lý, chatbot AI quyết định an toàn.
- Kinh doanh dữ liệu/dùng thương mại bộ dữ liệu IRD/FABDEM khi chưa rà soát quyền sử dụng.

### 3.3. KPI demo (mục tiêu nghiệm thu, chưa phải số liệu đo)

| Chỉ số | Ngưỡng kiểm thử đề xuất | Cách chứng minh |
|---|---|---|
| Demo E2E | Hoàn tất ít nhất 1 hành trình thực trong khu vực có dữ liệu | Screen recording + live run + request ID |
| Bản đồ | Hiện đường, legend, click chi tiết, nhãn “không đủ dữ liệu” | Checklist UI |
| Tuyến đường | So sánh ≥2 phương án nếu provider cung cấp ≥2; không tạo tuyến giả | Test case + API response |
| Nguồn điểm AI | Mọi đoạn có điểm phải truy được `model_version`, `data_version` | API/GeoJSON mẫu |
| API health | HTTP 200 ở `/health` khi hệ thống sẵn sàng | Curl + Cloud Run logs |
| Hiệu suất mục tiêu | p95 API dữ liệu <2 s; routing E2E <5 s trên test set/đường truyền xác định | Log test có bối cảnh |
| CI | Lint, test, build pass trên commit trình diễn | GitHub Actions URL |
| An toàn | Không có banner “an toàn” khi chỉ có dữ liệu lịch sử | Test màn hình và copywriting |

## 4. Người dùng và tình huống sử dụng

| Persona | Nhu cầu | Giá trị nhận được |
|---|---|---|
| Người đi xe máy | Ưu tiên hạn chế nguy cơ gặp đường trũng, chấp nhận đi xa hơn vừa phải | So sánh 2 tuyến, cảnh báo độ tin cậy |
| Tài xế ô tô | So sánh thời gian và mức phơi nhiễm, không muốn vào đường bị hạn chế | Route theo mode/luật giao thông, giải thích lý do |
| Người dân đóng góp | Báo nước ngập quan sát được | Gửi vị trí, thời gian, hình ảnh tùy chọn; biết trạng thái duyệt |
| Quản trị viên/điều phối | Xem báo cáo, xác minh, cập nhật tin có nguồn | Hàng đợi duyệt, audit và CSV tổng hợp |
| Giám khảo | Kiểm tra tính thực tế, AI, cloud, quản lý rủi ro | Demo end-to-end, metrics, source/version, logs, cost |

**User Journey UJ-01 — Xem tuyến ít nguy cơ hơn:** Mở web → cho phép GPS *hoặc* nhập điểm đi → nhập điểm đến → chọn xe máy/ô tô → nhận 1–n tuyến hợp lệ → so sánh ETA/quãng đường/risk exposure/coverage → chọn tuyến → xem những đoạn có nguy cơ cao cùng nguồn/phiên bản → lưu ý “không phải trạng thái ngập hiện tại”.

**UJ-02 — Báo cáo cộng đồng:** Nhấn “Báo cáo” → chọn vị trí + thời gian, mức quan sát/hình ảnh tùy chọn → gửi → nhận trạng thái `pending` → admin duyệt `verified` hoặc `rejected` → ứng dụng hiển thị bản ghi đã duyệt có timestamp.

**UJ-03 — Demo BGK:** Demo lộ trình thực tế, điểm rủi ro từ ML, giải thích dựa trên feature, admin duyệt báo cáo, Cloud Run public, W&B/evaluation, GitHub Actions và budget dashboard.

## 5. Phạm vi MVP và ưu tiên

| Mức | Chức năng | Quyết định |
|---|---|---|
| **P0 – bắt buộc** | Bản đồ mobile-first, tìm địa chỉ/điểm GPS, chọn phương tiện, tuyến đường + so sánh phơi nhiễm nguy cơ, điểm đường và nguồn dữ liệu, disclaimer, Cloud Run public, logs/health, **đóng gói APK Android bằng Capacitor và chạy trên thiết bị thật**, demo | Phải hoàn thành |
| **P0 – tối thiểu** | Gửi báo cáo và trang admin duyệt đơn giản *nếu phụ thuộc hạ tầng đã sẵn sàng*; nếu không, demo lưu báo cáo `pending` và đặt admin P1 | Không đánh đổi route core |
| **P1 – nếu còn thời gian** | Full admin dashboard, CSV export, Postgres lưu report/audit, SSE refresh thông tin đã duyệt, filter tầng dữ liệu, tối ưu UX | Tăng điểm cộng đồng/BE |
| **P1 – chứng cứ kỹ thuật** | W&B dashboard, model benchmark/MCDA, spatial bias audit, bài đo latency/cost, CI/CD deploy tự động | Có thể song song |
| **P2 – sau thi** | Dữ liệu mưa/triều kết hợp quan trắc, dự báo 30–90 phút *sau khi có nhãn*, độ sâu cm, định tuyến từng chặng nâng cao, trustScore, phát hành Play Store và nghiên cứu thương mại hóa | Không hứa trong demo |

**Nguyên tắc cắt phạm vi:** Nếu thời gian ngắn, ưu tiên bản đồ → route comparison → ML explanation → public cloud → evidence; không triển khai tính năng “realtime AI” theo tên gọi khi chưa có nguồn cập nhật thật.

## 6. Yêu cầu chức năng (Functional Requirements)

| ID | Ưu tiên | Yêu cầu | Acceptance Criteria |
|---|---|---|---|
| FR-01 | P0 | Bản đồ hiển thị đoạn đường theo điểm susceptibility, legend và vùng AOI | Có ít nhất một vùng dữ liệu thật; no-data hiển thị tách biệt; attribution đầy đủ |
| FR-02 | P0 | Nhập điểm đi/đến hoặc dùng GPS (có xin quyền) | Nhập tay luôn khả dụng khi từ chối GPS; báo lỗi địa điểm không tìm thấy |
| FR-03 | P0 | Chọn phương tiện xe máy/ô tô | Hệ thống truyền mode đúng provider; nếu chưa hỗ trợ thì thông báo, không dùng route ô tô giả danh xe máy |
| FR-04 | P0 | Lấy 1–n tuyến đường hợp lệ từ Google Routes hoặc OSRM | Giữ hình học/ETA/length từ provider; không tự dựng phương án giả; xử lý provider timeout |
| FR-05 | P0 | Tính road-risk exposure theo từng tuyến | Route segments được map tới road scores với quality flags; trả `risk_exposure`, `high_risk_length_m`, `data_coverage_pct` |
| FR-06 | P0 | So sánh nhanh nhất vs ưu tiên nguy cơ thấp | Hiển thị trade-off tăng phút/km và sự khác biệt về risk exposure; chỉ hiển thị tuyến khả dụng thật |
| FR-07 | P0 | Giải thích tuyến/đoạn đường | Click đoạn đường thấy relative tier, elevation, relative elevation, distance to water (nếu có), model/data version |
| FR-08 | P0 | Cảnh báo phạm vi sử dụng | Banner xác nhận đây là risk lịch sử, không phải tình trạng ngập hiện tại; không có “an toàn” tuyệt đối |
| FR-09 | P0/P1 | Gửi báo cáo ngập từ cộng đồng | Vị trí, thời gian quan sát, nội dung, giới hạn độ dài; mặc định `pending`, rate limit và không công bố thông tin cá nhân |
| FR-10 | P1 | Admin duyệt/xem lịch sử phản ánh | Admin xác thực; approve/reject có log người duyệt và thời điểm; riêng báo cáo verified có dấu trạng thái |
| FR-11 | P1 | Lớp thời tiết và cập nhật SSE | Ghi rõ provider và timestamp; SSE cập nhật server→client; REST xử lý client→server; thời tiết không xác nhận nước ngập |
| FR-12 | P1 | Xuất thống kê CSV của admin | CSV có time range, trạng thái, source; không lộ PII |
| FR-13 | P2 | Mốc dự báo +30/+60/+90, triều và độ sâu ngập | Chỉ triển khai khi có nguồn nhãn thời gian, kiểm định độc lập và phương án cảnh báo an toàn |
| FR-14 | P2 | Điều hướng hẻm nâng cao | Có kiểm tra hình học/luật giao thông và thiết bị thực tế trước phát hành |
| FR-15 | P0 | Đóng gói Android APK trong Hackathon bằng Capacitor | Có APK debug install được trên ít nhất 1 Android thật; mở app, GPS xin quyền, bản đồ/routing gọi HTTPS backend, hoạt động trở lại sau khi mở lại; ảnh/video demo và log build |

### 6.1. Quy tắc chọn tuyến có xét nguy cơ

**Input:** origin/destination, mode, tập routes hợp lệ, bản ghi đoạn đường GIS có `road_segment_id`, `relative_score`, `score_status`, model/data version và geometry. **Output:** route candidates với length, ETA (nếu có), estimated risk exposure, độ phủ, lý do gợi ý.

**Đề xuất thuật toán MVP:** (1) provider tìm tuyến theo luật giao thông; (2) spatial overlay/map-match route polyline vào mạng đường GIS; (3) tính **độ dài đoạn route có dữ liệu hợp lệ** và điểm trung bình gia quyền theo chiều dài: `exposure = Σ(length_i × score_i)/Σ(length_i)` trên các đoạn có score; (4) báo `coverage = Σ(length_i có score)/total_route_length`; (5) ưu tiên tuyến ít exposure hơn **chỉ khi** độ phủ đủ để so sánh, hiển thị ETA/độ vòng; (6) nếu coverage thiếu/route không map-match tin cậy thì báo `insufficient_data`.

**Quy tắc minh bạch:** `score_i` là điểm tương đối 0–100, không phải xác suất; tránh nhân thời gian với số “phần trăm ngập” giả. Việc dùng 0–100 phải dựa trên phân vị/quy tắc normalization được lưu phiên bản. Một tuyến được gợi ý ít nguy cơ hơn **không được gọi là an toàn**. “Tối ưu tuyến né ngập” ở MVP chỉ là **re-ranking các tuyến do provider trả về**, chưa chứng minh tìm được tuyến tối ưu toàn cục trên mọi đoạn đường.

**Fallback:** Nếu routing provider chỉ trả 1 tuyến → hiển thị 1 tuyến + minh bạch không có phương án thay thế. Nếu ML score thiếu → hiển thị route thông thường với nhãn “Chưa đủ dữ liệu đánh giá nguy cơ” và không tô xanh như an toàn. Nếu nguồn live không có → không hiện lớp “đang ngập”.

### 6.2. Quy tắc báo cáo cộng đồng

Trạng thái: `pending` → `verified` / `rejected` / `expired`. Báo cáo đang chờ duyệt chỉ là **phản ánh chưa xác minh**; phải có timestamp, hạn dùng thông tin, cơ chế chống spam và xóa/hạn chế dữ liệu cá nhân. Không tự biến một phản ánh chưa review thành nhãn ground truth để train hoặc để cấm tuyến. Các thay đổi trạng thái được ghi audit.

## 7. Kiến trúc sản phẩm và hợp đồng tích hợp

### 7.1. Kiến trúc logic

```text
          [Người dùng Web/PWA + Android APK]
                    |  HTTPS
             [fe/user: React + MapLibre]
                    |
           REST requests + SSE receive
                    v
           [be: NestJS 11 / REST API]
            |           |           |
    [Routing Provider] [PostgreSQL] [Cloud Storage]
    Google Routes /    report/admin  GeoJSON scores,
    OSRM              audit          model/version
            |                       ^
            |                       |
         [Weather]       [Python GIS/ML offline]
         Open-Meteo      LR Primary + MCDA + W&B
                    |
           [fe/admin: React]  (P1)
```

**Monorepo sản phẩm:** `fe/user` (React 19 + TypeScript 5.7 + Vite + MapLibre + Tailwind 4/CSS tokens + Capacitor Android P0 (đóng gói trong cuộc thi)), `fe/admin` (React/Vite/Tailwind/Lucide), `be` (NestJS 11, TypeORM, REST, SSE), `shared/contracts` (API schema/types), `infra` (Cloud Run/CI), `docs`. Có thể quản lý qua `pnpm-workspace`. **Repository Python ML riêng** `hcmc-road-flood-ml` vì training/GIS là pipeline offline với dependency khác; tích hợp bằng artifacts versioned thay vì nhúng PyTorch vào API định tuyến.

**Database:** PostgreSQL 16 + TypeORM theo kiến trúc mẫu, ưu tiên các bảng `FloodReport`, `ReportReview`, `RoadScoreVersion`, `WeatherSnapshot` và `AuditLog`; `CommunityUser` chỉ khi có đăng nhập. Các entities mở rộng của mẫu (`MapPoint`, `ForecastSlot`, `RouteOption`, `FloodHistory`) là thiết kế dài hạn, không phải mọi bảng đều bắt buộc được tạo trong 24h. Nếu cần truy vấn không gian hiệu quả, xem xét PostGIS sau khi kiểm tra hạ tầng.

**Bản đồ:** MapLibre GL JS để hiển thị lớp road susceptibility; basemap từ provider được phép theo điều khoản. Google Places hỗ trợ autocomplete nếu đã cấu hình key/quota; nếu không, có phương án tìm địa điểm dự phòng được cấp phép và phù hợp chính sách tải. Không mặc định trộn tile/traffic của Google vào MapLibre nếu điều khoản nhà cung cấp không cho phép.

**Routing:** Google Routes API hoặc OSRM cung cấp geometry/ETA/length. Backend thực hiện map-matching, scoring và phân tích trade-off. Phải kiểm tra mức hỗ trợ `TWO_WHEELER` theo API, địa lý và điều khoản trước khi phát hành chế độ xe máy.

**Realtime:** SSE `/api/realtime/stream` *server→client* cho báo cáo đã xác minh, trạng thái thời tiết khi có dữ liệu; mobile gửi cập nhật bằng REST POST. Khi không có stream, web tiếp tục hoạt động bằng dữ liệu snapshot.

### 7.2. API contract mức PRD

| API | Method | Mục đích | Kiểm tra chính |
|---|---|---|---|
| `/health` | GET | Health/liveness | HTTP 200, có version |
| `/api/roads` | GET | Đoạn đường và score theo bbox/tier | Bbox hợp lệ, giới hạn kích thước |
| `/api/roads/:id` | GET | Chi tiết đường & giải thích | `score_status`, version, provenance |
| `/api/routes/compare` | POST | Route candidates + risk exposure | Mode, coordinate validation, coverage |
| `/api/reports` | POST | Gửi phản ánh | Input validation, rate limit, privacy |
| `/api/reports` | GET | Admin review queue | Admin auth, paging, audit |
| `/api/reports/:id/review` | POST | Xác minh/từ chối | Role check, timestamp, reason |
| `/api/weather` | GET | Bản tin thời tiết tham chiếu | Source, updated_at, stale flag |
| `/api/realtime/stream` | GET (SSE) | Đẩy event mới | Reconnect, event ID, no PII |
| `/api/docs` | GET | Swagger/OpenAPI | Giới hạn admin endpoints phù hợp |

**Payload hợp đồng điểm đường tối thiểu:** `road_segment_id`, `geometry`, `susceptibility_score_100` (relative), `risk_tier`, `score_status`, `model_version`, `data_version`, `generated_at`, `features_summary`, `limitations`. Không lưu tên trường `flood_probability` khi chưa có calibration và nhãn thật.

## 8. Dữ liệu & mô hình AI

**Nguồn nghiên cứu:** lịch sử ngập IRD; OSM/Geofabrik roads; FABDEM; IRD waterways; ESA WorldCover. Cần ghi nguồn, thời điểm chụp/thu thập, CRS, cách chuẩn hóa, license và checksum. IRD/FABDEM có hạn chế phi thương mại theo kiểm kê hiện tại; OSM có nghĩa vụ ghi công/ODbL; chưa mặc định cho phép thương mại hóa.

**Model chính (Primary):** Logistic Regression Presence–Background với positive đã review, background lấy mẫu từ các đường `unknown`. Nhóm xác nhận có 318 **đoạn đường positive đã review**; phải ghi nhận các bản review `accepted`, event links và provenance trong run artifact. Không đánh đồng số đoạn với số sự kiện độc lập. GIS-MCDA là baseline; Deep MLP A100 là **experimental**, không là model “tối ưu” nếu không có kiểm định độc lập.

**Các feature chủ đạo:** elevation_median, relative_elevation, slope, distance_to_water, builtup_ratio; các đặc trưng phụ như elevation_p10, vegetation, water_area được giữ nếu pipeline đã thống nhất và đủ kiểm thử. Không sử dụng dữ liệu flood label/ảnh báo chí làm feature trực tiếp gây leakage.

**Evaluation:** Spatial holdout cố định, không fallback sang random split; train/selection không dùng vùng holdout. Báo Capture@10/20% theo **chiều dài mạng đường** và Lift@K trên sự kiện/geometry đã review đủ điều kiện, độ ổn định qua seed/background, so với MCDA và elevation-only; nêu báo cáo pending nếu không đạt review/evaluation gate. ROC-AUC trên positive vs unknown không được diễn giải là phân loại ngập-vs-không ngập; Accuracy/F1 của P–B không phải xác suất dự báo ngập.

**Bias & AI Safety:** Audit theo `highway_type`, vùng địa lý và chất lượng dữ liệu; tránh nhầm thiên lệch độ phủ tin báo thành nguy cơ địa vật lý. Các điểm ML được chú thích nguồn/version và độ phủ. Nếu có tính năng GenAI diễn giải, chỉ được suy ra từ JSON có nguồn, giới hạn câu trả lời, lọc nội dung và ẩn PII; trong MVP nên dùng explanation templates thay vì LLM để giảm ảo giác và chi phí.

**W&B/ML artifacts:** `model.joblib`, `evaluation.json`, `model_card.md`, `data_card.md`, `susceptibility_scores.geojson`/Parquet, `manifest.json` (commit, seed, config, checksums, phiên bản), W&B run link (nếu đã chạy thực). Không gọi training “đã đạt” nếu chưa có log hoặc report.

## 9. Yêu cầu phi chức năng, bảo mật, vận hành

| Nhóm | Yêu cầu nghiệm thu |
|---|---|
| Availability | Có URL HTTPS public (Cloud Run), `/health`, xử lý timeout và lỗi provider; không phụ thuộc hoàn toàn notebook Colab khi demo |
| Performance | Giới hạn bbox/pagination, cache road scores, lazy load tiles; đo p50/p95 và payload size trên kịch bản kiểm thử |
| Reliability | Circuit breaker/timeout cho weather/routing; fallback routes hoặc thông báo trung thực; không tạo dữ liệu giả |
| Security | HTTPS, input validation/DTO, rate limiting report, CORS hạn chế, admin RBAC, secrets qua env/Secret Manager; không commit API keys |
| Privacy | GPS chỉ dùng khi người dùng đồng ý; không lưu lịch sử GPS cá nhân mặc định; hạn chế ảnh/metadata cá nhân, có hướng dẫn xóa report |
| Accessibility | Responsive Android/iPhone, legend đủ chữ/biểu tượng (không chỉ màu), tap targets, trạng thái loading/no-data/error |
| Observability | Cloud Logging, request IDs, error rate, latency, dependency health; Cloud Monitoring/budget alert; che PII trong logs |
| CI/CD | GitHub Actions lint/test/build; deploy staging hoặc production có ghi commit/tag; rollback về revision trước nếu lỗi |
| Cost | Batch inference thay online GPU; Cloud Run scale-to-zero khi phù hợp; ngân sách/alerts; đo cloud costs và AI costs tách biệt |
| Maintainability | API OpenAPI, config theo môi trường, versioned model data, test unit/integration cho scoring + routing edge cases |

**Định hướng deploy:** Sử dụng Google Cloud Run để phục vụ FE/API, Cloud Storage chứa snapshot model/GeoJSON, Artifact Registry + Cloud Build hoặc GitHub Actions để build/deploy, Cloud Logging/Monitoring để đo; PostgreSQL ở hạ tầng phù hợp ngân sách (Cloud SQL nếu credits cho phép). **GDP $5 Antigravity credits và GCP deployment credits không mặc định là cùng một ngân sách**; kiểm tra billing và credits thực tế.

## 10. Rủi ro, an toàn và quyết định sản phẩm

| Rủi ro | Hệ quả | Giảm thiểu |
|---|---|---|
| Dữ liệu lịch sử ≠ ngập hiện tại | Đề xuất có thể đi vào đoạn vừa ngập | Màn hình disclaimer, timestamp, report verified; không tự tuyên bố an toàn |
| No-data bị hiểu là low-risk | Người dùng chọn tuyến không có dữ liệu | Tính coverage riêng và hiển thị unknown; không xếp hạng như đường an toàn |
| 318 positive nhỏ/thiên lệch truyền thông | LR/MLP học reporting bias, MLP overfit | Spatial held-out, highway bias, benchmark MCDA, không nói accuracy ảo |
| Routing APIs thiếu tuyến thay thế | Không thể so sánh đủ 2 đường | Chỉ hiển thị tuyến trả về thật, nói rõ giới hạn provider |
| Haversine gần điểm ngập ≠ đoạn đường ngập | Lỗi liên kết hình học | Dùng road geometry matching, quality threshold và review |
| Ngưỡng “xe máy 20 cm/ô tô 35 cm” chưa xác nhận | Gây cảm giác an toàn hoặc cấm đường không phù hợp | Chỉ nghiên cứu khi có dữ liệu độ sâu đã đo và chuẩn hướng dẫn chuyên môn; không dùng làm quy tắc MVP |
| Triều/độ sâu theo tên đường trong mẫu là giả định | Dự báo sai nghiêm trọng | Đưa vào P2, yêu cầu dữ liệu thủy văn + hiệu chỉnh + thử nghiệm |
| GPS hoặc báo cáo lộ PII | Nguy cơ riêng tư | Tối thiểu hóa dữ liệu, hạn chế retention, ẩn/loại EXIF, admin auth |
| API ngoài/credits hết | Demo gián đoạn/phát sinh phí | Cache snapshot, giới hạn quota, budget alerts, dùng basemap/routing fallback hợp lệ |
| Giấy phép dữ liệu | Không thể triển khai thương mại tùy ý | Data license inventory; xem lại giấy phép trước công bố/kinh doanh |

**Quy tắc hiển thị đề xuất:** Đổi banner “Có thể di chuyển an toàn” thành **“Đang hiển thị nguy cơ ngập tương đối; chưa xác nhận tình trạng ngập hiện tại.”** Nếu có báo cáo được duyệt, gắn thời gian/source và vùng ảnh hưởng cụ thể; cảnh báo không suy ra độ sâu chưa có dữ liệu.

## 11. Demo live, phân công và quản lý công việc

### 11.1. Kịch bản demo BGK (4–5 phút)

| Thời lượng | Thao tác live | Bằng chứng cần chuẩn bị |
|---|---|---|
| 0:00–0:35 | Nêu bài toán người dân di chuyển qua đường dễ ngập, đối tượng xe máy | Tình huống thực, giới hạn lịch sử |
| 0:35–1:20 | Mở URL HTTPS, cho phép GPS hoặc nhập điểm đi–đến | Cloud Run URL, `/health` |
| 1:20–2:20 | Chọn xe máy; so sánh route nhanh và route exposure thấp; click đường nguy cơ | Route provider thực, coverage, điểm road, model version |
| 2:20–2:55 | Gửi phản ánh ngập; xem trạng thái pending, admin duyệt nếu đã triển khai | API request, audit log |
| 2:55–3:45 | Mở ML evaluation: LR vs MCDA, Capture@K/Lift@K, bias, W&B | Report thực, giới hạn PU và event holdout |
| 3:45–4:30 | GitHub project board/CI, cloud logs, chi phí, roadmap | Link run CI, Cloud logs, budget và nhiệm vụ |

**Fallback demo hợp lệ:** Nếu một API bên ngoài lỗi, dùng trước dữ liệu/snapshot có provenance và nêu rõ đây là dữ liệu cache. Không phát video giả làm live hoặc gọi simulated report là quan trắc thực.

### 11.2. Phân vai nhóm 4 người

| Vai trò | Ownership | Đầu ra/nghiệm thu |
|---|---|---|
| Thành viên 1 — GIS/Data | Input datasets, road segments, score coverage, GeoJSON | data card, mapping QC, GeoJSON và manifest |
| Thành viên 2 — ML/Evaluation | LR Primary, MCDA, spatial evaluation, bias, W&B | model/eval artifacts, model card, chart đúng nghĩa |
| Thành viên 3 — FE/Product | `fe/user`, map/routing UI, mobile responsive, Capacitor Android | Demo UX và APK chạy trên thiết bị thật, các trạng thái no-data/error |
| Thành viên 4 — BE/DevOps/QA | NestJS API, storage/reports, Cloud Run, CI, observability, hỗ trợ Android build, pitch | HTTPS public, API contract, tests, APK verification, demo checklist |

**Quản lý:** README hướng dẫn; `docs/PRD.md` (tài liệu này), `docs/SYSTEM_DESIGN.md`, `docs/API_SPEC.md`, `docs/DATA_CARD.md`, `docs/MODEL_CARD.md`, `docs/AI_SAFETY.md`, `docs/DEMO_SCRIPT.md`, `docs/COMPETITOR_ANALYSIS.md`, `docs/ROADMAP.md`; GitHub Issues/Project với owner, priority, acceptance criterion, trạng thái, PR liên kết và milestone. GitHub Spec Kit là **khuyến khích**, không phải điều kiện bắt buộc theo kỳ vọng BTC đã cung cấp.

### 11.3. Mốc triển khai trong 24 giờ

| Giai đoạn | Mục tiêu | Gate |
|---|---|---|
| 0–3h | Chốt user flow, API schema, dataset snapshot và acceptance P0 | Ai phụ trách gì, issue/board, baseline chạy |
| 3–9h | Map/route core, API route scoring, ML exports | FE gọi được API thật, data version đúng |
| 9–15h | Reports/admin tối thiểu, deploy Cloud Run, CI/tests; **khởi tạo Capacitor/Android + sync web assets** | URL HTTPS, health/logs, Android project build được |
| 15–21h | Tích hợp, **build APK và test trên Android thật**, kiểm thử điển hình/biên, profiling, cost, bias/evaluation | APK cài/mở lại được; web và app cùng gọi API HTTPS |
| 21–24h | Freeze, tập pitch **demo Android APK + web**, backup APK/artifacts, demo checklist | Không thay đổi lớn gây regression |

### 11.4. Android APK là sản phẩm phải thực hiện trong 24 giờ Hackathon

**Phạm vi:** dùng `fe/user` React/Vite đang có làm cùng codebase với web/PWA; Capacitor 8 chỉ đóng gói web vào Android WebView và kết nối native plugins khi cần. **Không xây một ứng dụng Android thứ hai từ đầu** và không chuyển ML training lên điện thoại. Web/API vẫn chạy HTTPS Cloud Run; ML scores đã tính trước ở server/storage.

**Tiêu chí nghiệm thu FR-15:** (a) build `fe/user` tạo thư mục `dist/` hợp lệ; (b) Android project được khởi tạo và đồng bộ web assets; (c) Android Studio build APK debug; (d) APK cài trên ít nhất một máy Android thật; (e) app mở không blank screen, bản đồ hiện, xin quyền GPS đúng cách, có nhập thủ công khi từ chối quyền, so sánh route gọi HTTPS API, cảnh báo nguy cơ đúng nghĩa; (f) cài lại/khởi động lại được; (g) lưu APK, video/ảnh kiểm thử và build log làm bằng chứng. **Không yêu cầu Play Store hoặc signed release APK** cho MVP.

**Thiết bị và môi trường:** Máy Windows + Node.js >=22, pnpm, Android Studio >=2025.2.1, Android SDK và điện thoại Android thật (USB debugging) hoặc emulator đủ tài nguyên. Có thể kiểm tra cài công cụ trước cuộc thi; phần build/package/test APK chính thực hiện trong cuộc thi.

**Luồng thực hiện** (chạy từ thư mục frontend `fe/user`, lệnh `pnpm exec cap ...` chỉ khi đã cài CLI):

```bash
pnpm install
pnpm --filter ./fe/user build
cd fe/user
pnpm add @capacitor/core @capacitor/android
pnpm add -D @capacitor/cli
pnpm exec cap init
pnpm exec cap add android
pnpm exec cap sync android
pnpm exec cap open android
```

Tại bước `cap init`, đặt `appId` duy nhất, kiểm tra `webDir` trỏ đến `dist`. Sau mỗi lần thay web code: **build → `cap sync android` → run/build lại**. Trong Android Studio: chọn thiết bị, chạy thử; Build APK(s) cho bản debug hoặc thực hiện bằng Gradle và lưu tệp APK đúng đường dẫn output thực tế. **Không đặt Cloud API secrets hoặc W&B keys trong APK**; Google API keys phải giới hạn đúng ứng dụng/điều kiện và dịch vụ.

**Các tình huống phải test:** từ chối GPS; mất mạng; backend timeout; bản đồ trống; Android back gesture; safe-area/status bar; deep link nếu có; app resume; mất quyền vị trí; API keys không lộ; không dùng HTTP cleartext nếu backend HTTPS. Nếu Android build lỗi sát giờ, ưu tiên giữ web demo live và báo trạng thái APK trung thực.

**Phân công:** Thành viên 3 làm Capacitor/Android UX, Thành viên 4 hỗ trợ Android Studio/SDK, build + smoke test + lưu APK, Thành viên 1/2 bảo đảm GeoJSON và model data endpoint ổn định.

## 12. Điểm mới, so sánh giải pháp và phát triển sau cuộc thi

### 12.1. Định vị khác biệt (giả thuyết cần kiểm chứng)

| Phương án | Điểm mạnh phổ biến | Khoảng trống mà SaigonDrain AI muốn giải quyết |
|---|---|---|
| Bản đồ dẫn đường thông thường | ETA, khoảng cách, luật giao thông, UX | Chưa tích hợp trực tiếp điểm susceptibility GIS riêng của nhóm vào phép so sánh tuyến |
| Bản đồ điểm ngập/cảnh báo công cộng | Biết vị trí và ghi nhận sự kiện | Người dùng còn phải tự chọn cách đi quanh vùng ngập |
| SaigonDrain AI (MVP) | Map + routing alternatives + road risk explainability + provenance | Thể hiện trade-off giữa route nhanh và route ít phơi nhiễm hơn; vẫn công bố giới hạn dữ liệu |

**Không tự nhận “đầu tiên tại Việt Nam”, “tối ưu nhất” hoặc “chính xác hơn Google Maps” nếu không có kiểm chứng thị trường và thí nghiệm thực.** Điểm đổi mới mạnh nhất ở giai đoạn MVP là cách *chuyển risk score theo đoạn đường thành so sánh hành trình có giải thích và độ phủ*.

### 12.2. Roadmap

- **Sau 1 tháng:** hoàn thiện Postgres/PostGIS, verified crowdsourcing, monitoring, đánh giá người dùng trên tuyến thực tế, phân quyền admin và quy trình review.
- **1–3 tháng:** thu thập nhãn theo thời điểm, hợp tác nguồn mưa/triều/cảm biến, nghiên cứu định tuyến có thông tin ngập được xác minh, tối ưu và phát hành Android chính thức nếu kết quả thử nghiệm APK trong Hackathon đạt.
- **3–6 tháng:** kiểm định prospective với đối tác, đào tạo mô hình theo thời gian *chỉ sau khi có nhãn phù hợp*, nghiên cứu luận văn/portfolio và kiểm tra điều kiện giấy phép trước thương mại hóa.

## 13. Ma trận đối chiếu tiêu chí BGK (100 điểm)

| Tiêu chí BTC | Điểm | Bằng chứng SaigonDrain AI cần đưa ra |
|---|---:|---|
| I. Sáng tạo & đổi mới | 10 | Route risk-exposure + explanation, phân biệt với dẫn đường thuần ETA |
| II. Thực tiễn | 10 | User journey xe máy/ô tô, mobile-first, demo từ điểm đi đến đích |
| III. Dữ liệu & mô hình AI | 20 | Data provenance/license, LR vs MCDA, spatial held-out Capture/Lift, bias và AI safety; đủ 4 mục mỗi mục 5 điểm |
| IV. Cấu trúc/triển khai/chất lượng | 20 | Monorepo modules, UI, REST/DB, CI/CD, bảo mật, test và demo; lần lượt 3+3+5+3+3+3 điểm |
| V. Đóng góp cộng đồng | 10 | Citizen reporting, review flow, lợi ích tiếp cận lâu dài |
| VI. Sử dụng AI hiệu quả chi phí | 10 | Offline/batch scoring, không cần GPU inference, đo API/cloud cost, ghi giới hạn credits |
| VII. AWS/Google Cloud | 10 | Cloud Run HTTPS public, cấu hình secrets, health/logs/monitoring |
| VIII. Làm việc nhóm/pitch/demo/phản biện | 10 | GitHub issues, phân vai 4 người, kịch bản live, phản biện rủi ro và chi phí |
| **Tổng** | **100** | **Checklist chứng cứ có thể mở trực tiếp khi chấm** |

**Ghi chú:** Đây là cách nhóm ánh xạ sản phẩm vào rubric chính thức, **không phải dự đoán điểm đạt được**.

## 14. Definition of Done (DoD) và tiêu chí nghiệm thu cuối

- [ ] FE chạy ở điện thoại, có bản đồ road susceptibility và legend rõ; không dùng màu xanh để khẳng định an toàn.
- [ ] **Trong Hackathon:** Android APK được build từ `fe/user` bằng Capacitor; cài và chạy trên thiết bị Android thật, GPS/cấp quyền/bản đồ/API HTTPS hoạt động, APK debug được lưu làm artifact. Không bắt buộc phát hành Play Store.
- [ ] Điểm đi/đến, chọn phương tiện và lấy tuyến thật hoạt động; có test trường hợp provider chỉ trả 1 tuyến.
- [ ] API so sánh lộ trình trả length, ETA nếu có, risk exposure, data coverage và giải thích; không có số đo bị bịa.
- [ ] Score của mỗi đoạn hiển thị theo `model_version`, `data_version`, `generated_at`, `score_status`; no-data có trạng thái riêng.
- [ ] Hiển thị rõ tính chất dữ liệu lịch sử, không có lời hứa ngập hiện tại hoặc dự báo độ sâu chưa chứng minh.
- [ ] Có report + trạng thái xác minh ở mức P0/P1 đã cam kết; không hiển thị report pending như sự thật đã xác nhận.
- [ ] Có ML evaluation thực tế đủ gate hoặc công bố pending, benchmark LR/MCDA; Deep MLP chỉ experimental.
- [ ] Có W&B run/reports thực tế nếu khẳng định sử dụng W&B; không dùng mock làm bằng chứng.
- [ ] GitHub Actions CI có link; production/staging URL HTTPS public, `/health`, logs; có quy trình rollback.
- [ ] Ghi lại budget/Cloud Run usage/credits, tối thiểu 1 chứng cứ tiết kiệm chi phí AI.
- [ ] Có pitch 4–5 phút, phân vai nhóm, novelty comparison, roadmap sau hackathon, license caveat.

## 15. Câu hỏi quyết định cần chốt trong nhóm (không cản trở PRD)

1. Routing MVP dùng Google Routes hay OSRM là provider chính? Có được hỗ trợ `TWO_WHEELER` ở khu vực demo không? Nếu không, phải giới hạn đúng mode sản phẩm.
2. Phiên bản GeoJSON/score nào của repo ML sẽ được freeze để deploy? File review xác nhận 318 positives đang nằm trong bundle nào?
3. Nhóm đã provision PostgreSQL/Cloud SQL hay chỉ dùng storage snapshot cho demo? Tính năng gửi report cần persistence nào?
4. Có thực sự có dữ liệu báo ngập cập nhật với timestamp/nguồn kiểm chứng không? Nếu chưa, bỏ nhãn Realtime AI và “an toàn”.
5. Credits GCP thực tế áp dụng cho dịch vụ nào, đến ngày nào, hạn mức bao nhiêu? GDP $5 Antigravity là hạn mức riêng cần xác nhận.
6. Android SDK, Android Studio và điện thoại test đã sẵn sàng chưa? Mục tiêu là APK debug trong cuộc thi; Play Store là giai đoạn sau.

---

**Bổ sung kiểm tra repo ML:** Biên bản audit theo commit `df94b85` được lưu tách riêng trong `SaigonDrain_GitHub_ML_Audit_2026-11-07.md`; checklist ở đó là kế hoạch sửa trong cuộc thi, không khẳng định sửa xong.

**Nguồn tham chiếu:** (1) `kiến-trúc-dự-án.docx` do nhóm cung cấp; (2) *TIÊU CHÍ CHẤM ĐIỂM VÒNG 24H & CHUNG KẾT – Hackathon SGU 2026–2027*, Google Docs: https://docs.google.com/document/d/14iHXg75Ksl_LZz5hp70IwQWK9eiAVU5f6Obr73dt8Ok/edit ; (3) các kỳ vọng bổ sung BTC mà nhóm đã cung cấp trong hội thoại; (4) repository ML: https://github.com/duygri/hcmc-road-flood-ml .
