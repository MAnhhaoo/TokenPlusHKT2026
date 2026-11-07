# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Monorepo pnpm hiện hữu: `fe/user` và `fe/admin`, React 19 + TypeScript + Vite 8 + Tailwind CSS v4. Chưa có backend; `be/` là chỗ dành sẵn, toàn bộ dữ liệu là mock trong `fe/*/src/data`.

## Users

- **Người đi đường tại TP.HCM** (học sinh, sinh viên, nhân viên văn phòng, phụ huynh): cần biết đi có an toàn không, tuyến nào ít ngập, và báo ngập nhanh khi gặp sự cố. Thường dùng điện thoại, ngoài đường, mưa lớn, ánh sáng yếu, tay ướt, cần thao tác nhanh và chữ lớn. [Suy luận từ bối cảnh sử dụng]
- **Điều phối viên đô thị** (trung tâm điều hành, đơn vị thoát nước): cần theo dõi mưa – ngập theo khu vực, xác minh báo cáo cộng đồng, phát cảnh báo và điều phối ứng cứu. Làm việc trên desktop, nhiều dữ liệu, thao tác lặp lại, cần trạng thái rõ và tốc độ. [Suy luận từ dashboard hiện có]

## Product Purpose

SaigonDrain AI giúp người dân di chuyển an toàn trong mưa ngập và giúp đơn vị đô thị phản ứng nhanh hơn với ngập cục bộ, bằng cách kết hợp dữ liệu mưa, nguy cơ ngập, tuyến đường an toàn và báo cáo cộng đồng trong một trải nghiệm duy nhất. Thành công là người dùng chọn được tuyến an toàn trong vài giây và điều phối viên xử lý được một báo cáo mới trong dưới một phút.

## Positioning

Không chỉ là bản đồ chỉ đường hay bảng giám sát: cùng một nguồn dữ liệu ngập nuôi cả quyết định của người đi đường lẫn quyết định điều phối, với báo cáo cộng đồng được xác minh trước khi trở thành cảnh báo. [Suy luận từ brief và luồng hiện có]

## Operating Context

- Người dùng mở app khi trời đang mưa, thường trên mobile, cần câu trả lời “có nên đi không / đi đường nào” trước khi rời đi.
- Điều phối viên theo dõi màn hình lớn trong giờ cao điểm mưa, đối chiếu nhiều lớp dữ liệu, phát cảnh báo theo khu vực và kênh.
- Báo cáo cộng đồng có ảnh, mức nước ước tính, vị trí; một phần được AI đối chiếu và cần con người xác nhận/từ chối.
- Demo/hackathon: dữ liệu mô phỏng, không có tài khoản thật, không có backend.

## Capabilities and Constraints

- User app: bản đồ nền OSM + tuyến OSRM, dự báo theo mốc thời gian, hai phương án tuyến (an toàn / dự phòng), chỉ đường từng bước, trạng thái dẫn đường, gửi báo cáo ngập/cống.
- Admin app: bản đồ SVG mô phỏng với 4 lớp (ngập, nguy cơ, mưa, lịch sử), KPI, xu hướng 24h/7d/30d, hàng đợi báo cáo, xác nhận/từ chối, cảnh báo khu vực (tạo/sửa/kết thúc), quản lý người dùng cộng đồng.
- Ràng buộc kỹ thuật: frontend-only, mock data, không router/state library/backend/auth; giữ MapLibre worker và cấu hình port 5173/5174; mỗi app một `index.css` toàn cục.
- Thuật ngữ hiển thị bằng tiếng Việt; đơn vị mực nước cm, lượng mưa mm, thời gian phút.

## Brand Commitments

- Tên: **SaigonDrain AI** (brief gốc dùng “DrainGuard AI”; đã thống nhất đổi brand).
- Giọng điệu: bình tĩnh, rõ ràng, đáng tin, hướng dẫn thay vì hù dọa.
- Ngôn ngữ thị giác đã chốt: **“Mực nước”** — thước đo mực nước, đường đồng mức, kênh rạch Sài Gòn; nền sương nhẹ, teal sâu, cát ấm, coral cho nguy hiểm, vàng nắng cho cảnh báo.
- Font: Be Vietnam Pro.

## Evidence on Hand

- Brief sản phẩm: `docs/saigondrain-product-brief.pdf` (4 trụ cột: giám sát mưa/radar, nguy cơ tuyến đường, dẫn đường an toàn, báo cáo cộng đồng).
- Mock data thật của demo trong `fe/*/src/data`.
- Không có ảnh thật, testimonial, số liệu khách hàng hay benchmark; không được bịa thêm.

## Product Principles

1. **Trả lời trước, chi tiết sau.** Người dùng thấy ngay “an toàn / cần theo dõi / nguy hiểm” và việc cần làm.
2. **Không giấu sự không chắc chắn.** Dự báo, độ tin cậy và thời điểm cập nhật luôn hiển thị.
3. **Một hành động rõ mỗi màn.** Tuyến an toàn, gửi báo cáo, xác nhận báo cáo — không cạnh tranh bằng nút phụ.
4. **Cộng đồng có trách nhiệm.** Báo cáo chỉ thành cảnh báo sau xác minh; trạng thái và lý do luôn rõ.
5. **Bình tĩnh trong khẩn cấp.** Màu và chuyển động phục vụ quyết định, không gây hoảng.

## Accessibility & Inclusion

- WCAG AA: chữ ≥4.5:1, thành phần lớn ≥3:1.
- User phổ thông: chữ 16px+, touch target ≥44px, ít bước, nhãn tiếng Việt đơn giản, không phụ thuộc màu sắc.
- Admin: mật độ cao hơn nhưng vẫn ≥40px target, điều hướng bàn phím đầy đủ, focus rõ, trạng thái có nhãn.
- Tôn trọng `prefers-reduced-motion`; modal đóng bằng Esc và trả focus.
