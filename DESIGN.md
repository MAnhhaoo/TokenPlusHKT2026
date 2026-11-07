# SaigonDrain AI — Design System “Mực nước”

Ghi chú thiết kế cho hai surface của SaigonDrain AI. Mọi giá trị dưới đây là nguồn thật trong `fe/*/src/index.css`; khi đổi token, cập nhật cả hai app và tài liệu này.

- `fe/user` — bản đồ an toàn cho người đi đường (mobile-first, 5173).
- `fe/admin` — trung tâm điều hành cho chuyên viên (desktop-first, 5174).

## 1. Ý tưởng thị giác

“Mực nước” lấy chất liệu từ thước đo mực nước, đường đồng mức và kênh rạch Sài Gòn. Giao diện giống một dụng cụ dân sự bình tĩnh: nền giấy sương, teal sâu cho hành động, cát ấm cho vùng ngập nhẹ, coral cho nguy hiểm, vàng nắng cho cảnh báo. Không dùng gradient tối kiểu SaaS, không trang trí tranh ảnh nặng.

Nguyên tắc:

1. Trả lời trước, chi tiết sau — trạng thái an toàn/nguy hiểm và mức nước luôn ở lớp đầu.
2. Màu không phải tín hiệu duy nhất — mọi trạng thái có icon + nhãn chữ.
3. Mỗi màn một điểm nhấn gauge/contour; không lặp motif quá hai lần.
4. Chuyển động chỉ để giải thích thay đổi trạng thái, 160–240 ms.

## 2. Token màu

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--ink` | `#0a2e2c` | Chữ chính, nền tối |
| `--ink-soft` | `#4a6663` | Chữ phụ, nhãn |
| `--paper` | `#f7faf8` | Nền chính |
| `--white` | `#ffffff` | Card, bề mặt nổi |
| `--mist` | `#e7f1ec` | Nền phụ, panel, chip |
| `--mist-deep` | `#d5e6de` | Viền/đường phân cách đậm hơn |
| `--teal` | `#0b4f4a` | Brand, action chính |
| `--teal-deep` | `#073b37` | Sidebar/hero tối |
| `--teal-bright` | `#1c8c7f` | Focus ring, trạng thái an toàn, icon |
| `--teal-soft` | `#dff1ea` | Nền lựa chọn/nhấn nhẹ |
| `--sand` | `#f3e7d3` | Nền cảnh báo nhẹ, phân vùng bản đồ |
| `--coral` | `#d9432a` | Điểm ngập nặng, nút nguy hiểm (fill) |
| `--coral-text` | `#b8341e` | Chữ nguy hiểm trên nền sáng (≥4.5:1) |
| `--coral-soft` | `#fbe7e1` | Nền cảnh báo nguy hiểm |
| `--sun` | `#f4c95d` | Cảnh báo, highlight gauge (fill) |
| `--sun-text` | `#7a5200` | Chữ cảnh báo trên nền sáng |
| `--sun-soft` | `#fbf0cf` | Nền cảnh báo trung bình |
| `--rain` | `#2f6f8f` | Mưa, dữ liệu dự báo |
| `--rain-soft` | `#e3eff5` | Nền dữ liệu mưa |
| `--green` | `#1f7a58` | Trạng thái hoạt động/an toàn (admin) |
| `--green-soft` | `#e3f2ea` | Nền trạng thái hoạt động |
| `--line` | `#d9e6df` | Viền card, input |
| `--line-soft` | `#e9f1ec` | Đường chia mảnh |

Quy ước: teal = hành động/điều hướng; coral và sun chỉ dùng cho rủi ro; chữ nguy hiểm trên nền sáng dùng `--coral-text`, không dùng `--coral`.

## 3. Typography

Font duy nhất: **Be Vietnam Pro** (Google Fonts), fallback `Segoe UI, system-ui`.

| Surface | Body | Nhãn | Tiêu đề mục | Tiêu đề trang/hero |
| --- | --- | --- | --- | --- |
| User | 15–17 px | 12–14 px | 20–24 px | 32–40 px |
| Admin | 12.5–14 px | 10.5–12 px | 15–18 px | 24–28 px |

- Line-height 1.45–1.6; tiêu đề `letter-spacing: -0.015em`.
- Số liệu dùng `font-variant-numeric: tabular-nums` (admin).
- Không dùng `clamp()` cho scale chữ; scale cố định theo breakpoint.
- Chữ tối thiểu 12 px ở admin, 15 px ở user; không dùng chữ <11 px cho nội dung đọc.

## 4. Khoảng cách, bo góc, bóng

- Nhịp cơ sở 4 px; khoảng cách phổ biến 8/12/16/20/24/32.
- Bo góc: sm 10–12 px (chip, input), md 16 px (card nhỏ), lg 22 px (panel), xl 26–28 px (sheet/modal).
- Bóng: `--shadow-sm` cho viền nổi nhẹ, `--shadow-md` cho card nổi, `--shadow-lg` cho modal/drawer.
- Card dùng viền 1 px `--line` cộng bóng mềm thay vì đổ bóng dày.

## 5. Component cốt lõi

### Water gauge

Thước ngang 0/10/20/30/50/60 cm với kim chỉ mức hiện tại và vùng màu theo ngưỡng. Dùng ở risk card (user), hero/KPI (admin), forecast.

- Fill dùng `transform: scaleX()` (không animate `width`).
- Luôn kèm nhãn số + đơn vị; màu chỉ là lớp phụ.

### Trạng thái

Pill gồm icon + nhãn: `An toàn`, `Theo dõi`, `Nguy hiểm`. Mức nước (cm) đặt cạnh nhãn khi có dữ liệu. Không dùng chấm màu đơn lẻ làm trạng thái duy nhất.

### Nút

- User: nút chính ≥48 px, action phụ ≥44 px, bo 14–16 px.
- Admin: nút ≥34 px (desktop), ≥40 px ở mobile, bo 10–12 px.
- Một action chính mỗi màn; action phụ dùng `variant="secondary"` hoặc ghost.
- Focus ring 2 px `--teal-bright`, offset 2 px, không bao giờ `outline: none` trần.

### Bản đồ

- User: MapLibre + OSM. Tuyến chính nét 7 px màu teal, tuyến dự phòng nét đứt 3 px; màu chuyển theo tuyến đang chọn (teal ↔ amber). Marker điểm đầu/cuối có nhãn; ETA hiển thị thời gian + quãng đường của tuyến đang chọn.
- Admin: SVG tự vẽ trên nền `--paper` với đường đồng mức mờ, khối quận, sông/kênh, marker theo mức độ. Không phụ thuộc tile mạng. Marker có `aria-label` + tooltip chứa mức độ; popover hiển thị mức nước, lượng mưa, lịch sử và độ tin cậy.

### Bottom sheet (user)

Ba trạng thái: peek → mở rộng → đang dẫn đường. Handle có `aria-expanded`. Khi đang dẫn đường, nút “Kết thúc hành trình” luôn nằm trên bottom nav, không bị che.

### Bảng (admin)

Header dính trên, hàng hover/focus rõ, số liệu căn phải, cột trạng thái dùng pill. Mobile: bảng chuyển thành card với `data-label` cho từng ô. Bảng có `caption` (sr-only).

### Modal

`role="dialog"`, `aria-modal`, `aria-labelledby`; Esc đóng, focus trap, trả focus về nút mở; body khóa scroll; footer action luôn hiển thị.

### Toast

`role="status" aria-live="polite"`, tự ẩn sau ~3,2 s, có nút đóng.

## 6. Motion

- 160–220 ms cho state change (hover, chọn tab, mở sheet, đổi tuyến).
- Gauge/forecast dùng transform, không animate layout.
- Tôn trọng `prefers-reduced-motion: reduce`: tắt scroll mượt và transition không cần thiết.

## 7. Accessibility

- WCAG AA: chữ ≥4.5:1, thành phần lớn/viền ≥3:1.
- Focus ring 2 px `--teal-bright`, offset 2 px; drawer/modal trap focus và trả focus.
- Touch target: user ≥44 px (nút chính ≥48 px), admin ≥40 px ở mobile.
- `aria-current="page"` cho nav/tab; `aria-pressed` cho toggle; `aria-expanded` cho sheet/drawer.
- Mọi icon-button có `aria-label`; input tìm kiếm có label thật (`aria-label` hoặc `<label>`), không chỉ placeholder.
- Không khóa scroll sai; modal đóng bằng Esc; `prefers-reduced-motion` được tôn trọng.
- Bảng có caption; filter có nhãn; trạng thái không phụ thuộc màu.

## 8. Responsive

| Breakpoint | Hành vi |
| --- | --- |
| ≥1280 px | Admin sidebar cố định 252 px; user hai cột (panel 384 px + bản đồ) |
| 1024–1279 px | Admin giữ sidebar, nội dung co; user panel hẹp hơn |
| 760–1023 px | Admin sidebar thành drawer (Esc/focus); user chuyển sang sheet |
| <760 px | Admin bảng → card, filter xếp dọc; user bản đồ full-bleed + bottom sheet + bottom nav 3 mục |

## 9. Cấu trúc màn hình

- **User**: header (brand + trạng thái + trợ giúp/tài khoản) → tìm tuyến → bản đồ + risk card + legend + FAB báo cáo → bottom sheet (dự báo, tuyến, chỉ dẫn) → bottom nav `Bản đồ / Theo dõi / Tuyến đường` → modal báo cáo.
- **Admin**: sidebar 6 mục + topbar theo trang → `Tổng quan`, `Bản đồ`, `Báo cáo`, `Cảnh báo`, `Người dùng`, `Phân tích`; modal review/từ chối/cảnh báo/chi tiết người dùng; toast.

## 10. File nguồn

- Token + component CSS: `fe/user/src/index.css`, `fe/admin/src/index.css`.
- Gauge: `fe/user/src/components/ui/WaterGauge.tsx`.
- Shell user: `fe/user/src/App.tsx`, `components/layout/*`, `components/journey/*`, `components/map/*`.
- Shell admin: `fe/admin/src/App.tsx`, `components/layout/*`, `components/pages/*`.
- Bản đồ admin: `fe/admin/src/components/map/OperationsMap.tsx`.
- Số liệu suy ra: `fe/admin/src/lib/analytics.ts`.
