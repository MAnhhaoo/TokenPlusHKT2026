# Ma trận kiểm thử SaigonDrain

Mốc mã nguồn: `38d9d490805d835f2ce12dcfc473bb711df69b13` (`origin/master`, ngày 07/11/2026). Kiểm thử dựa trên mã thực tế, đối chiếu PRD/API_SPEC/AI_SAFETY; chỗ tài liệu khác implementation được ghi là khoảng cách yêu cầu, không tự đổi API.

## Quy ước

- **P0:** auth, ghi dữ liệu, không báo thành công giả, tính toàn vẹn báo cáo và điều hướng.
- **P1:** validation, fallback, filters, ranh giới số liệu, accessibility và responsive.
- **PASS / FAIL / BLOCKED / NOT RUN** là trạng thái thực thi, khác với mức ưu tiên. Ca thủ công không được tính vào số test tự động đã pass.
- Dữ liệu giả: tài khoản `.test`, tọa độ fixture TP.HCM, ảnh tổng hợp. Reset state/DB/clock giữa các test theo fixture của từng phân hệ.

## Danh mục ca chi tiết

Mỗi bảng liên kết bên dưới chứa ID, ưu tiên, tiền điều kiện/dữ liệu, bước thực hiện, kết quả mong đợi và vị trí test tự động.

| Phân hệ | Bộ ca | Mức kiểm thử | Cô lập |
|---|---|---|---|
| BE — token, guard, báo cáo, cảnh báo, định tuyến/provider | [BE_CASES.md](BE_CASES.md) | Jest unit + Supertest HTTP + PostgreSQL integration | Mock HTTP provider; DB test riêng |
| Admin và user web | [FE_CASES.md](FE_CASES.md) | Playwright browser, API/SSE/địa điểm/GPS fixture | Không cần BE hoặc provider thật |

## Luồng liên phân hệ cần kiểm soát

| ID | Ưu tiên | Tiền điều kiện / dữ liệu | Bước kiểm tra | Kết quả mong đợi | Ánh xạ tự động |
|---|---|---|---|---|---|
| SYS-01 | P0 | Báo cáo pending, marker và người gửi liên kết | Duyệt một lần rồi thử duyệt lần hai | Lần đầu cập nhật report/marker/trust; lần hai conflict, không cộng lặp | BE workflow + HTTP/DB; admin browser kiểm tra riêng phản hồi |
| SYS-02 | P0 | Báo cáo pending, repository phát sinh lỗi ghi | Duyệt/từ chối với lỗi giữa transaction | Không lưu nửa chừng; không phát sự kiện thành công | BE PostgreSQL rollback |
| SYS-03 | P0 | Backend mutation trả 500/network error | Admin duyệt/sửa dữ liệu | UI không chuyển sang thành công giả, giữ khả năng thử lại | FE admin mutation failure regression |
| SYS-04 | P0 | Auth bắt buộc; citizen/operator token | Gọi HTTP operator bằng từng loại token | Chỉ operator/coordinator được phép; citizen bị từ chối | BE auth guard + HTTP regression |
| SYS-05 | P1 | API fixture chậm, request cũ trả sau request mới | Tìm điểm/đổi tuyến liên tiếp | Kết quả cuối tương ứng lựa chọn mới nhất | FE user stale-response cases |

Đây là ánh xạ hành vi giữa các lớp, **không phải** khẳng định đã chạy một trình duyệt nối trực tiếp BE thật. Kết quả cụ thể xem TEST_REPORT.

## Phạm vi chưa tự động hóa

- Android native, GPS khi app background, picker ảnh native và TalkBack: checklist AND, chưa có thiết bị.
- Chất lượng mô hình trên dataset thực, huấn luyện lớn, benchmark GPU và độ chính xác địa lý bản đồ ngoài thực địa.
- Load/soak/performance và khả dụng của provider thật. Không đánh giá bằng mock latency.
- `contracts/` và `infra/` hiện chỉ là placeholder, chưa có implementation để tạo test nghiệp vụ.

## Chênh lệch tài liệu đã nhận diện

- `AGENTS.md`/`PRODUCT.md` vẫn ghi frontend-only; source hiện có BE và tích hợp API.
- `SYSTEM_DESIGN.md` có mô tả Vue/Pinia/Recharts, source user/admin là React; DB config hiện trả PostgreSQL kể cả khi legacy E2E đặt `DB_TYPE=sqljs`.
- Các cam kết rate limiting/giới hạn rủi ro/hiệu năng trong tài liệu cần đối chiếu bằng test cụ thể; không mặc định đã triển khai chỉ vì tài liệu ghi “Implemented”.
