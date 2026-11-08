# Báo cáo E2E — SaigonDrain AI (TokenPlusHKT2026)

- **Ngày chạy:** 2026-11-08, 06:17–07:06 (GMT+7)
- **Nhánh/commit:** `master` @ `3e6c74e` — Merge pull request #26 from MAnhhaoo/long
- **Môi trường:** Windows 10.0.26200 (x64), Node v24.18.0, npm 11.16.0, Chrome/Chromium Playwright `chromium-1248`
- **Ứng dụng:** `FE/user` → http://localhost:5173 (PID 10524), `FE/admin` → http://localhost:5174 (PID 3752)
- **Backend:** NestJS `BE/` **offline** (cổng 3000 không listen) → mọi request `/api/**` qua Vite proxy trả **502 Bad Gateway**
- **Phương pháp:** Hybrid — chạy harness Playwright sẵn có (offline fixtures) + kiểm thử live bằng Playwright MCP trên browser thật
- **Phạm vi:** cả hai app; **chỉ báo cáo**, không sửa code sản phẩm/test, không commit/push
- **Artifacts trong PR:** `docs/e2e/20261108/REPORT.md` và 33 ảnh trong `docs/e2e/20261108/shots/`; log gốc chỉ nằm local trong `.cache/e2e/run-20261108-master/` (gitignored, không kèm PR)
- **Trạng thái working tree:** sạch (`git status --short` = 0 dòng), không có thay đổi source

### Tóm tắt điều hành

| Hạng mục | Kết quả |
|---|---|
| Harness FE/user | **6/8 PASS** (2 FAIL) |
| Harness FE/admin | **2/14 PASS** (12 FAIL) |
| Live FE/user (12 luồng) | 9 PASS, 2 FAIL, 1 PARTIAL |
| Live FE/admin (10 luồng) | 5 PASS, 1 FAIL, 3 PARTIAL, 1 BLOCKED |
| Typecheck | 2/2 PASS (`tsc --noEmit`, không lỗi) |
| Lỗi sản phẩm đáng chú ý | 3 nhóm P1/P2 về "báo thành công giả" khi API lỗi và trạng thái "live" sai sự thật |

**3 phát hiện nghiêm trọng nhất**

1. **P1 — User app báo gửi báo cáo thành công giả khi API lỗi 502.** UI hiện "Đã phát cảnh báo · RP-2975", "Cảnh báo đã lên bản đồ & hệ thống!", ETA nước rút, nhưng backend không nhận được gì và feed cộng đồng vẫn 0. (`FE/user/src/lib/api.ts:1555-1577`, `ReportModal.tsx:240-258`)
2. **P1/P2 — Admin optimistic update + toast thành công khi mutation thất bại.** Đã tái hiện với tạo cảnh báo (`POST /api/alerts` 502 → toast "Cảnh báo mới đã được phát…", card xuất hiện) và kết thúc cảnh báo (`PATCH /api/alerts/AL-0190/end` 502 → cảnh báo biến mất, stat về 0). (`FE/admin/src/App.tsx:249-294, 326-367, 430-447`; `FE/admin/src/lib/api.ts:238-299`)
3. **P2 — Admin hiển thị "đã kết nối backend / hệ thống hoạt động" dù toàn bộ API 502.** Footer "Đã kết nối Backend API & Open-Meteo", sidebar "Hệ thống hoạt động", trang Người dùng "Đồng bộ từ bảng community_users (0 tài khoản)". Nguyên nhân: `live` luôn `true` vì 250 điểm lịch sử được chèn vô điều kiện. (`FE/admin/src/lib/api.ts:161-174, 96-120`; `App.tsx:116, 530-536`)

---

## Phase 0 — Preflight

| Kiểm tra | Kết quả |
|---|---|
| Node/npm | Node v24.18.0 · npm 11.16.0 |
| Playwright browsers | `%LOCALAPPDATA%\ms-playwright\chromium-1248` (có) |
| `FE/user/node_modules` | Đã cài (`npm ci`, 71 packages, 0 vulnerabilities) |
| `FE/admin/node_modules` | Đã có, dùng được |
| Cổng | 5173/5174 đang chạy; 3000 (backend) **không** listen |
| Typecheck FE/user | PASS — `FE/user-typecheck.log` |
| Typecheck FE/admin | PASS — `admin-typecheck.log` |

Ghi chú: mọi request `/api/**` bị Vite proxy trả 502 (xem `user-dev.log`, `admin-dev.log`). Đây là môi trường chủ đích "mock offline"; OSRM và Open-Meteo vẫn truy cập được từ browser (OSRM `/bike` trả HTTP 200), Nominatim bị `ERR_CONNECTION_REFUSED` nhưng app có fallback.

---

## Phase 1 — Harness tự động (offline fixtures)

Lệnh: `npm --prefix FE/user run test:system`, `npm --prefix FE/admin run test:system` (Vite riêng cổng 5273/5274, chặn origin ngoài, fulfill `/api/**` bằng fixture, stub `EventSource`).

### FE/user — 6/8 PASS (`user-harness.log`, 19.6 s)

| Test | Kết quả | Phân loại | Ghi chú |
|---|---|---|---|
| FE-U01 đăng ký → đăng nhập → đăng xuất | PASS | — | |
| FE-U02 login lỗi giữ form + thông báo backend | PASS | — | |
| FE-U03 report network failure giữ form, retry, focus success | **FAIL** | **(b) test rot + (a) sản phẩm** | Test chờ `role=alert`; app hiện **cố ý** trả success giả khi mạng lỗi (`api.ts:1555-1577`) nên không có alert. Test lỗi thời so với thiết kế hiện tại, nhưng chính thiết kế này là rủi ro P1. |
| FE-U04 GPS granted | PASS | — | |
| FE-U05 GPS denied → fallback | PASS | — | |
| FE-U06 forecast + SSE notification | PASS | — | |
| FE-U07 route keyboard + backend route + stale autocomplete | **FAIL** | **(b) test rot (+a nhẹ)** | Strict mode: 2 nút `/^Synthetic Fresh origin/` ("· Bình Thạnh" và ", Hồ Chí Minh"). Dedupe hiện chỉ gộp khi label trùng hoặc label+toạ độ gần (`api.ts:774-788`) nên gợi ý gần trùng lọt ra. |
| FE-U08 responsive shell + keyboard modal focus | PASS | — | |

### FE/admin — 2/14 PASS (`admin-harness.log`, 49.9 s)

| Test | Kết quả | Phân loại | Bằng chứng / nguyên nhân |
|---|---|---|---|
| FE-A01 approve/reject PATCH | **FAIL** | **(b)** | Test tìm nút `Xác nhận báo cáo`; UI hiện dùng `Mở khóa báo cáo (Hiển thị lại)` / `Khóa báo cáo (Ẩn khỏi bản đồ)` (`ReportReviewModal.tsx:261-265`). |
| FE-A02 alert lifecycle | **FAIL** | **(b)** | Test điều hướng `Cảnh báo khu vực`; mục nav này đã bị bỏ khỏi `Sidebar.tsx:76-92`. |
| FE-A03 user search/status/CSV | PASS | — | |
| FE-A04 SSE dedupe/user updates | PASS | — | |
| FE-A05 report filters/responsive/modal keyboard | **FAIL** | **(b)** | Cùng lý do nav `Cảnh báo khu vực`. |
| FE-A06 failed approve giữ pending + announce | **FAIL** | **(b) + (a)** | Selector cũ + hành vi thật: `approveReport` vẫn gán `status: "verified"` và toast thành công khi API trả null (`App.tsx:249-273`). |
| FE-A07 failed reject giữ pending + announce | **FAIL** | **(b) + (a)** | Selector `Từ chối` cũ + hành vi optimistic tương tự (`App.tsx:275-294`). |
| FE-A08 failed user status giữ server state | **FAIL** | **(a) sản phẩm** | Assertion chạy được và fail: 503 nhưng user bị khóa local (`App.tsx:430-447`). |
| FE-A09 empty API → empty report/user views | **FAIL** | **(b)** | Test chờ text `Đã xử lý toàn bộ`; UI hiện `Không có báo cáo phù hợp…`. |
| FE-A10 initial API outage cần alert | **FAIL** | **(a) sản phẩm** | Không có UI lỗi/retry; `loadInitial` nuốt lỗi (`App.tsx:84-118`). |
| FE-A11 loading phải có busy indicator | **FAIL** | **(a) sản phẩm** | Không có `aria-busy`/trạng thái loading phân biệt với rỗng. |
| FE-A12 create/update/end alert lỗi giữ server state | **FAIL ×3** | **(b) + (a)** | Nav cũ + optimistic mutation (`App.tsx:326-367`). |

**Kết luận harness:** phần lớn FAIL của admin là **test debt** (nav/nhãn UI đã đổi, trang Cảnh báo bị bỏ), nhưng FE-A08/A10/A11 và một phần A06/A07/A12 phản ánh **lỗi sản phẩm thật** (xử lý lỗi API và trạng thái loading). Không sửa test theo phạm vi.

---

## Phase 2a — Live E2E FE/user (Playwright MCP)

| ID | Luồng | Kết quả | Bằng chứng / ghi chú |
|---|---|---|---|
| U-L1 | Tải trang, map + topbar/nav | PASS | `shots/00-user-map-desktop.png`; MapLibre canvas render, không lỗi unhandled |
| U-L2 | Tìm điểm đi/đến, gợi ý, bàn phím, swap, clear | PASS | `shots/05-user-route-suggestions.png` |
| U-L3 | Tính tuyến + giải thích + step + status | PASS | `shots/06-user-route-computed.png`; backend 502 → OSRM/fallback vẫn ra tuyến |
| U-L4 | Dẫn đường HUD, Trước/Tiếp, Kết thúc | PASS | `shots/07-user-navigation-hud.png` |
| U-L5 | Báo cáo sự cố | **FAIL (P1)** | `shots/02,03,04`; `POST /api/reports` 502 nhưng hiện success `RP-2975`, "Cảnh báo đã lên bản đồ & hệ thống!", ETA; community vẫn 0 |
| U-L6 | Thời tiết (topbar desktop / BottomNav mobile) | PASS | `shots/08,09`; có mục dự báo theo giờ/7 ngày, đổi thành phố |
| U-L7 | Cảnh báo & cẩm nang (chuông) | PASS | `shots/10`; 2 tab, Esc đóng, focus trả về nút mở; thiếu `aria-controls`/`tabpanel` (P3) |
| U-L8 | Auth validate + đăng nhập lỗi + Esc | PASS | `shots/11`; form giữ editable, Esc đóng; lỗi validate không được announce (P3) |
| U-L9 | Lộ trình đã lưu: lưu → reload → chọn/xóa | PASS | `localStorage.saigondrain_saved_routes` giữ dữ liệu |
| U-L10 | Responsive 1440/1024/768/390/320 | **FAIL (P2)** | Không tràn ngang, nhưng **tab "Thời tiết" bị cắt** ở 390/768 (đo bên dưới) |
| U-L11 | A11y: focus trap, aria-current/pressed, tap target | **PARTIAL** | Focus trap PASS; nhiều nút mobile < 44 px (P3) |
| U-L12 | Mạng lỗi (tile/OSRM/geocoder) | PASS | App vẫn dùng được; Nominatim refused nhưng Photon/fallback hoạt động |

### Đo cụ thể lỗi bottom nav (P2)

- 390×844: `.bottom-nav` cao 62 px (y 782–844), nhưng nút thứ 5 "Thời tiết" ở `y=835, h=52` → **43 px nằm ngoài viewport**.
- 768×900: nav y 838–900, nút "Thời tiết" `y=891, h=52` → bị cắt tương tự.
- Nguyên nhân: `BottomNav.tsx` render **5 tab** (`Bản đồ, Cộng đồng, Theo dõi, Tuyến đường, Thời tiết`) trong khi CSS dùng `grid-template-columns: repeat(3, 1fr)` (`FE/user/src/index.css:2029`, áp dụng cả desktop) và override `repeat(4, 1fr)` cho ≤640 px (`index.css:5299-5301`), cộng thêm `height` cố định 62 px (`index.css:2021-2033`). Comment tại `index.css:5298` vẫn ghi "4-tab layout" — dấu hiệu UI thêm tab thứ 5 nhưng chưa cập nhật layout.
- Ảnh: `shots/12-user-mobile-390-map.png`, `shots/14-user-768-map.png`.

### Lỗi FAB bị panel che (P2)

- Khi sheet mobile **expanded** (`.app-shell.panel-expanded`), `.mobile-panel` chiếm `y=307–782`, `z-index:40` (`index.css:1253-1259`), FAB ở `y=658`, `z-index:20` (`index.css:1198-1238`, mobile `5532-5541`) → `elementFromPoint` trả về phần tử của panel, **FAB bị che, không bấm được** nhưng vẫn nằm trong tab order.
- Ảnh: `shots/32-user-mobile-fab-covered-expanded.png`, `shots/17-user-mobile-fab-covered.png`.

### Báo cáo vị trí rỗng (P2)

- Submit khi không nhập địa điểm vẫn thành công với vị trí mặc định `"Nguyễn Hữu Cảnh, Bình Thạnh"` và toạ độ Bình Thạnh. (`ReportModal.tsx:41-42, 207`; không có validate bắt buộc tại `handleSubmit` 182-205)
- Hệ quả: dữ liệu bản đồ sai vị trí, người dùng không được cảnh báo.

### Google Maps key hardcode (P2 — bảo mật)

- `FE/user/src/lib/googleMaps.ts:4-7` chứa API key `AIzaSy…` trong source. Console liên tục báo `Google Maps JavaScript API error: ApiTargetBlockedMapError` và cảnh báo deprecation. Chỉ báo cáo, không sửa.

---

## Phase 2b — Live E2E FE/admin (Playwright MCP)

| ID | Luồng | Kết quả | Bằng chứng / ghi chú |
|---|---|---|---|
| A-L1 | Tổng quan: 4 metric card, hero, gauge, trend, queue | PASS | `role=meter` (`aria-valuenow=0/60`, label "Mực nước 0 trên 60 cm"), `role=img` "Biểu đồ báo cáo và lượng mưa", `.metric-card`=4, `.queue-count`=0; `shots/20,31` |
| A-L2 | Điều hướng các trang + aria-current + cross-link | PASS | 5 trang trong sidebar (`Tổng quan, Bản đồ vận hành, Báo cáo cộng đồng, Người dùng, Phân tích dữ liệu`); trang Cảnh báo riêng đã bị bỏ, cảnh báo nằm trong Tổng quan |
| A-L3 | Báo cáo + lọc | PASS | Search có aria-label; 3 select (mức độ/quận/thời gian) bọc trong `<label>`; segmented 4 trạng thái có `aria-pressed`; empty state đúng; `shots/22,28` |
| A-L4 | Kiểm duyệt báo cáo (khóa/mở khóa) | **BLOCKED** | Backend offline + 0 báo cáo nên không mở được modal duyệt. Harness fixtures có phủ nhưng selector đã rot (FE-A01/A06/A07). Đối chiếu code: khi API lỗi vẫn gán verified/rejected + toast thành công (`App.tsx:249-294`). |
| A-L5 | Bản đồ vận hành | PASS | 250 marker lịch sử; bật/tắt layer cập nhật stat; lọc `critical` → 41 marker/41 điểm; popover marker ("Quốc Hương… 18 lần, 140 cm, GPS…"); zoom/reset không lỗi; `shots/21,29` |
| A-L6 | Cảnh báo: tạo/sửa/kết thúc | **PARTIAL** | Validate rỗng hiện 3 message nhưng **không** `role=alert`/`aria-invalid`; tạo khi 502 vẫn toast thành công + card (`shots/25,26,33`); kết thúc cảnh báo có ConfirmDialog (`role=dialog`, `aria-modal`, Esc/focus return đúng) nhưng 502 vẫn xóa cảnh báo + stat 0; tab active/ended không còn tồn tại |
| A-L7 | Người dùng | **PARTIAL** | Search + empty state + filter + nút "Xuất dữ liệu" hoạt động; CSV fallback tải header-only khi `/api/users/export-csv` 502; mở hồ sơ/khóa/mở khóa **BLOCKED** (0 user) |
| A-L8 | Phân tích | PASS | 4 KPI, TrendChart `role=img`, 6 biểu đồ phân bố, mục "Đóng góp cộng đồng nổi bật"; dữ liệu 0 do offline; `shots/24,30` |
| A-L9 | Responsive 1440/1024/768/390/320 | **PARTIAL/FAIL** | 1024/768/390: drawer mở/đóng, Esc, focus trả về nút mở, không tràn ngang; **320: tràn 4 px** do select lọc mức độ trong `.map-heading-actions` (right=324 > 320); `shots/27,28,29,30,31` |
| A-L10 | A11y: focus trap, Esc, aria, heading | PASS (có caveat) | AlertModal trap 14+ Tab không thoát, wrap về nút "Đóng"; Esc trả focus về "Tạo cảnh báo"; `aria-pressed`/`aria-current` đúng; heading dùng `role=heading` (không có `<h1>` native); tap target admin < 44 px (P3) |

### Chi tiết lỗi optimistic update (P1/P2)

1. **Tạo cảnh báo:** `POST /api/alerts` → 502 tại `26093ms` (console log `console-2026-11-08T00-01-36-146Z.log`). UI: toast `role=status` "Cảnh báo mới đã được phát tới các kênh đã chọn.", card "E2E Alert Failure Evidence" xuất hiện. Ảnh `shots/33-admin-alert-toast-on-502.png`.
2. **Kết thúc cảnh báo:** `PATCH /api/alerts/AL-0190/end` → 502. UI: cảnh báo biến mất, "0 cảnh báo đang phát", toast "Đã kết thúc cảnh báo AL-0190." (toast tự ẩn sau 3.2 s — `App.tsx:205-209`).
3. **Code:** `createAlertApi/endAlertApi/updateAlertApi` trả `null` khi `!res.ok` (`api.ts:238-282`), nhưng `saveAlert`/`endAlert` fallback tạo object local + toast thành công (`App.tsx:326-367`). Tương tự `approveReport/rejectReport/handleToggleLock/updateUserStatus` (`App.tsx:249-324, 430-447`).

### Chi tiết trạng thái "live" sai (P2)

- `fetchAdminInitialData` luôn nhận `mapPoints` từ `buildRealtimeAdminMapPoints`, hàm này **luôn** thêm 250 điểm lịch sử (`api.ts:96-120`), nên `live = Boolean(reports || alerts || finalMapPoints || users || weatherSnap)` luôn `true` (`api.ts:174`).
- `App.tsx:116` gọi `setIsLiveBackend(true)` bất kể 6 request `/api/*` đều 502.
- Footer hiển thị "Đã kết nối Backend API & Open-Meteo" (`App.tsx:530-536`); sidebar luôn "Hệ thống hoạt động" (`Sidebar.tsx:173-178`); Users page luôn "Đồng bộ từ bảng community_users (0 tài khoản)".

### Các lỗi P3 xác nhận trên admin

- **Chuông "Thông báo" chết:** `Topbar.tsx:135-138` không có `onClick`; click không mở gì (khác với app user có modal thông báo).
- **Không có trạng thái lỗi/loading:** `loadInitial` chỉ `return` khi `!data.live` (`App.tsx:84-118`), không render alert/retry, không `aria-busy` → tương ứng FE-A10/A11.
- **320 px tràn 4 px:** `.map-heading-actions { width:100%; justify-content: space-between }` (`index.css:4173-4176`) với 3 control (Nền/Mở rộng/Lọc mức độ, `OperationsMap.tsx:187-211`) vượt 320 px.
- **Tap target nhỏ:** menu 40×40, layer 33 px, zoom 32×32, "Tạo cảnh báo" 44×40 (mobile), nav item 42 px — dưới ngưỡng 44 px.
- **Field lỗi không accessible:** `Field.tsx:3-17` render `<span class="field-error">` không `role`, `aria-invalid`, `aria-describedby`.
- **Dead code:** `AlertsPage` được import (`App.tsx:9`) nhưng không render; bên trong còn nút "Soạn nhanh Cảnh báo khẩn từ gợi ý AI" và id giả `DRAFT-AI` (`AlertsPage.tsx:55,69`) → không còn đường tới, giả thuyết cũ không còn hiệu lực.

---

## Phase 3 — Tổng hợp lỗi sản phẩm (đã đối chiếu code + tái hiện)

| # | Mức | Khu vực | Mô tả | Tái hiện | File nghi vấn |
|---|---|---|---|---|---|
| 1 | **P1** | User — báo cáo | API 502 nhưng UI báo thành công giả, cấp RP id/ETA; feed cộng đồng không cập nhật | Mở form báo cáo → để trống địa điểm → gửi khi backend offline | `FE/user/src/lib/api.ts:1542-1577`; `ReportModal.tsx:207, 240-258`; `App.tsx:667-691` |
| 2 | **P1/P2** | Admin — mutation | Tạo/sửa/kết thúc cảnh báo, duyệt/từ chối/khóa báo cáo, đổi trạng thái user đều optimistic + toast thành công khi API lỗi | Tạo cảnh báo khi 502; kết thúc cảnh báo khi 502 | `FE/admin/src/App.tsx:249-294, 326-367, 430-447`; `lib/api.ts:221-299` |
| 3 | **P2** | Admin — trạng thái | Báo "đã kết nối backend/hệ thống hoạt động" dù 6 API 502; 250 điểm synthetic làm `live` luôn true | Mở admin khi backend offline | `FE/admin/src/lib/api.ts:96-120, 161-174`; `App.tsx:116, 530-536`; `Sidebar.tsx:173-178` |
| 4 | **P2** | User — responsive | Bottom nav 5 tab nhưng grid 3/4 cột, cao cố định → tab "Thời tiết" bị cắt ở 390/768 | Thu nhỏ viewport ≤768 | `FE/user/src/components/layout/BottomNav.tsx:13-57`; `index.css:2021-2033, 5299-5301` |
| 5 | **P2** | User — mobile | FAB bị `.mobile-panel` (z 40) che khi sheet mở rộng (FAB z 20) | 390×844, mở rộng bảng hành trình | `index.css:1198-1238, 1253-1259, 5532-5541` |
| 6 | **P2** | User — báo cáo | Không bắt buộc vị trí; mặc định "Nguyễn Hữu Cảnh, Bình Thạnh" + toạ độ Bình Thạnh | Gửi báo cáo không nhập địa điểm | `ReportModal.tsx:41-42, 182-207` |
| 7 | **P2** | User — bảo mật | Google Maps API key hardcode trong source; key bị `ApiTargetBlockedMapError` | Mở app, xem console | `FE/user/src/lib/googleMaps.ts:4-7` |
| 8 | **P3** | Admin — a11y | Chuông thông báo không có hành động | Click chuông ở desktop | `Topbar.tsx:135-138` |
| 9 | **P3** | Admin — lỗi tải | Không có alert/retry/aria-busy khi API khởi tạo lỗi | Mở admin khi backend offline | `App.tsx:84-118` |
| 10 | **P3** | Admin — responsive | 320 px tràn ngang 4 px do cụm lọc bản đồ | 320×700, trang Tổng quan | `index.css:4167-4176`; `OperationsMap.tsx:187-211` |
| 11 | **P3** | Cả hai — a11y | Nhiều tap target < 44 px (user 28–38 px; admin 32–40 px) | Đo bounding box ở 390 px | `FE/user/src/index.css` (mobile), `FE/admin/src/index.css` (controls) |
| 12 | **P3** | User — a11y | Validate auth/form không `role=alert`; admin Field lỗi không `aria-invalid/describedby` | Submit form rỗng | `FE/user/.../AuthModal.tsx:257`; `FE/admin/.../ui/Field.tsx:3-17` |
| 13 | **P3** | User — a11y | Trang Thời tiết có 2 `<h1>` (tiêu đề app + "Hôm nay trời thế nào?") | Mở tab Thời tiết | `WeatherPage.tsx:531` + shell |
| 14 | **P3** | User — a11y | Tab thiếu `role=tabpanel`/`aria-controls` | Kiểm tra DOM notifications/auth/journey | `NotificationsModal.tsx:61-75`; `AuthModal.tsx:228-250`; `JourneyPanel.tsx:140-159` |
| 15 | **P3** | User — search | `onBlur` tự commit gợi ý đầu sau 180 ms, có thể ghi đè text người dùng; gợi ý gần trùng không dedupe | Gõ text rồi Tab ra ngoài | `RouteSearch.tsx:263-274, 325-334`; `lib/api.ts:774-788` |

### Đã kiểm chứng và loại trừ (không phải bug)

- OSRM profile `bike`: gọi trực tiếp trả HTTP 200 → giả thuyết "profile không hỗ trợ" **không đúng**; tuyến vẫn tính được.
- Nút "Soạn nhanh Cảnh báo AI" (`DRAFT-AI`): trang AlertsPage không còn được render → không còn là lỗi người dùng gặp.
- "Cảnh báo khu vực" biến mất khỏi nav: thay đổi sản phẩm có chủ đích (cảnh báo nằm trong Tổng quan) — là test debt, không phải bug.

---

## Test debt (tách riêng khỏi bug sản phẩm)

1. `FE/admin/tests/system.test.mjs` còn dùng UI cũ: nav `Cảnh báo khu vực`, nút `Xác nhận báo cáo`/`Từ chối`, text `Đã xử lý toàn bộ`.
2. `FE/user/tests/system.test.mjs` FE-U03 kỳ vọng `role=alert` khi mạng lỗi — trái với thiết kế fallback hiện tại.
3. FE-U07 dùng regex nhãn quá lỏng gây strict-mode violation.
4. `.github/workflows/ci.yml`: matrix chỉ `BE` + `FE/user` (không có `FE/admin`), chỉ chạy `test`/`test:smoke` (không chạy `test:system`), không cài Playwright browser → harness rot không bị CI phát hiện.

---

## Ghi chú môi trường / flaky

- Toàn bộ 502 là do backend 3000 offline (Vite proxy ECONNREFUSED), không phải lỗi code FE.
- Nominatim `ERR_CONNECTION_REFUSED` trong phiên này; app vẫn hoạt động nhờ Photon/ArcGIS/fallback → không tính là bug.
- Console có nhiều lỗi 502 và `ApiTargetBlockedMapError` lặp lại; khi đánh giá "console error" cần lọc theo loại.
- DOM chứa cả layout desktop và mobile → selector phải dùng `:visible`/`nth` (đã gặp strict-mode violation khi test).
- Giờ hiển thị theo GMT+7; báo cáo không assert giờ tuyệt đối.
- Không assert lên `<canvas>` MapLibre; mọi kiểm tra bản đồ qua DOM/status text.

---

## Deliverables & bằng chứng

- Log (chỉ local, không kèm PR): `user-harness.log`, `admin-harness.log`, `user-dev.log`, `admin-dev.log`, `user-typecheck.log`, `admin-typecheck.log` trong `.cache/e2e/run-20261108-master/`
- Ảnh trong PR: `docs/e2e/20261108/shots/00`–`shots/18` (user), `shots/20`–`shots/33` (admin + bổ sung user mobile FAB)
- Ảnh quan trọng: `03-user-report-empty-location-submit.png` (success giả), `04-user-community-after-report.png` (feed 0), `12/14` (nav bị cắt), `32` (FAB bị che), `33` (toast thành công khi 502), `27` (tràn 320 px)
- Không có thay đổi source, không commit/push.
