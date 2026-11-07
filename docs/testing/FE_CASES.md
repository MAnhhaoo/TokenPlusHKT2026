# Bộ ca kiểm thử frontend

## Phạm vi và điều kiện chung

Kiểm thử mã thực tế trong `FE/admin` và `FE/user` trên Chromium headless bằng Playwright 1.64.1. Không sửa mã nghiệp vụ. Mỗi ca có browser context mới; Vite tự chạy và dừng ở `127.0.0.1:5274` (admin), `127.0.0.1:5273` (user). Cần Node/npm và Chromium của Playwright; hai cổng phải trống. Không chạy đồng thời baseline admin và suite admin.

Tất cả `/api/*` được chặn tại browser và trả fixture, không gọi backend thật. EventSource được thay bằng EventTarget trong bộ kiểm thử; dữ liệu bọc `{ data: ... }` đúng giao thức frontend. Đây là kiểm thử consumer SSE, không kiểm tra kết nối/chia khung/reconnect của HTTP SSE thật. Tất cả mạng ngoài origin bị abort; riêng FE-U07 trả dữ liệu ArcGIS tổng hợp tại URL geocoder để kiểm tra autocomplete mà không gọi dịch vụ. Vite nhận khóa giả `offline-fixture-no-api-key`, không cần khóa thật.

Dữ liệu chung: báo cáo `RP-TEST`, `RP-REJECT` đang pending, độ sâu 26 cm; người dùng `U-TEST` đang active; thời tiết tổng hợp; hai mốc dự báo 4.8 mm và 12 mm. Không dùng tài khoản hoặc tọa độ cá nhân thật. Dữ liệu chi tiết nằm trong các factory của file automation.

## Admin

Tham chiếu `A` = [`FE/admin/tests/system.test.mjs`](../../FE/admin/tests/system.test.mjs); tên test bắt đầu bằng ID tương ứng.

| ID / ưu tiên | Tiền điều kiện và dữ liệu | Bước thực hiện | Kết quả mong đợi | Automation |
| --- | --- | --- | --- | --- |
| FE-A01 / P0 | Hai báo cáo pending; PATCH trả báo cáo verified/rejected | Mở báo cáo đầu, xác nhận; mở báo cáo còn lại, chọn lý do và từ chối | Queue 2 → 1 → 0; gửi đúng PATCH và lý do; dùng trạng thái trả từ server | A: FE-A01 |
| FE-A02 / P0 | Danh sách alert rỗng; POST/PATCH/end thành công | Gửi form rỗng; điền khu vực, tiêu đề, thông điệp; tạo; sửa tiêu đề; kết thúc; mở tab đã kết thúc | Form rỗng không gọi POST; alert mới, sửa và kết thúc hiển thị đúng | A: FE-A02 |
| FE-A03 / P1 | Một người dùng active; endpoint CSV trả bytes cố định | Tìm tên không tồn tại rồi xóa lọc; khóa người dùng; tải CSV | Empty view đúng; PATCH status blocked; file tải xuống có đúng tên đuôi CSV và nội dung bytes fixture | A: FE-A03 |
| FE-A04 / P1 | SSE giả hoạt động | Phát hai lần cùng report.created; phát user.updated registered | Báo cáo không nhân đôi; người dùng realtime xuất hiện trong trang người dùng | A: FE-A04 |
| FE-A05 / P1 | Dữ liệu chung | Lọc từ khóa và mức độ không khớp; duyệt 6 trang ở 1440/390/320 px; mở modal, Tab 20 lần, Escape | Kết quả lọc đúng, không tràn ngang trang; focus ở modal; Escape đóng | A: FE-A05 |
| FE-A06 / P0 | PATCH approve trả 503 | Xác nhận báo cáo | Báo cáo vẫn pending; có lỗi cho người vận hành, không thông báo thành công | A: FE-A06 |
| FE-A07 / P0 | PATCH reject trả 503 | Chọn lý do và xác nhận từ chối | Báo cáo vẫn pending; có lỗi cho người vận hành | A: FE-A07 |
| FE-A08 / P0 | PATCH user status trả 503 | Mở hồ sơ và khóa tài khoản | Dữ liệu hiển thị vẫn active; không giả lập khóa thành công | A: FE-A08 |
| FE-A09 / P1 | GET reports/users trả mảng rỗng hợp lệ | Xem overview, báo cáo và người dùng | Hiển thị empty state tương ứng | A: FE-A09 |
| FE-A10 / P1 | Toàn bộ API ban đầu trả 503; dịch vụ ngoài bị chặn | Mở app và đợi phản hồi | Có thông báo lỗi để phân biệt lỗi tải với không có dữ liệu | A: FE-A10 |
| FE-A11 / P1 | Toàn bộ API ban đầu bị giữ bằng promise gate | Mở app trước khi giải phóng gate | Có trạng thái tải accessible (aria-busy hoặc progressbar), phân biệt với queue rỗng | A: FE-A11 |
| FE-A12-create / P0 | Alert rỗng; POST trả 503 | Điền form hợp lệ và phát cảnh báo | Không tạo alert chưa được server lưu | A: FE-A12-create |
| FE-A12-update / P0 | Một alert active; PATCH trả 503 | Đổi tiêu đề và lưu | Giữ tiêu đề gốc từ server | A: FE-A12-update |
| FE-A12-end / P0 | Một alert active; PATCH end trả 503 | Kết thúc và xác nhận | Alert vẫn trong danh sách active | A: FE-A12-end |

## User

Tham chiếu `U` = [`FE/user/tests/system.test.mjs`](../../FE/user/tests/system.test.mjs).

| ID / ưu tiên | Tiền điều kiện và dữ liệu | Bước thực hiện | Kết quả mong đợi | Automation |
| --- | --- | --- | --- | --- |
| FE-U01 / P0 | Chưa đăng nhập; register/login thành công với user/token tổng hợp | Gửi đăng ký rỗng; điền đầy đủ; đăng ký; đăng nhập; đăng xuất | Chặn form thiếu; gửi email đúng; chuyển sang login và giữ email; hiển thị hồ sơ, lưu token; logout xóa user | U: FE-U01 |
| FE-U02 / P0 | Login trả 401 với thông báo fixture | Điền tài khoản/mật khẩu, đăng nhập | Hiển thị thông báo backend; giữ input; nút có thể thử lại | U: FE-U02 |
| FE-U03 / P0 | POST reports lần đầu abort, lần sau trả RP-CREATED | Nhập vị trí/mô tả, gửi lỗi rồi thử lại | Báo lỗi, giữ nội dung; lần hai có ID báo cáo, focus success, payload đúng mô tả | U: FE-U03 |
| FE-U04 / P1 | Web geolocation callback thành công 10.79,106.71; reverse fixture | Bấm GPS điểm đi | Nhãn vị trí thiết bị; reverse nhận vĩ độ thiết bị | U: FE-U04 |
| FE-U05 / P1 | Web GPS từ chối; cả hai IP fallback bị chặn | Bấm GPS điểm đi | Nhãn vị trí gần đúng; dùng fallback TP.HCM 10.7769; không gọi dịch vụ IP thật | U: FE-U05 |
| FE-U06 / P1 | Hai forecast slots, một active alert | Chọn +30 phút; xem notifications; phát alert.ended và weather.updated | aria-pressed đúng; nội dung cảnh báo đúng; badge về 0; lượng mưa realtime đổi thành 8.4 mm | U: FE-U06 |
| FE-U07 / P0 | Geocoder tổng hợp, route backend có 3 điểm; sau đó route API 503 | Giữ autocomplete cũ; gõ mới rồi trả cũ; Enter chọn hai endpoint; phát report.approved thay đổi điểm ngập | Kết quả cũ không ghi đè; route từ backend xuất hiện; khi tính lại thất bại giữ route hợp lệ trước | U: FE-U07 |
| FE-U08 / P1 | Chưa đăng nhập | Đổi viewport 1440/390/320 px; mở modal tài khoản, Tab 12 lần và Escape | Không tràn ngang shell; giữ focus trong dialog; Escape đóng dialog | U: FE-U08 |

## Giới hạn

Không khẳng định kiểm thử ảnh nền/tiles, độ chính xác địa lý, Google SDK, routing provider thật, cảnh báo push hệ điều hành, Android/iOS thật, permission UI của hệ điều hành, reconnect SSE, upload ảnh hoặc visual snapshot. GPS là callback giả và một ca browser context có quyền geolocation, không phải thử cảm biến. Responsive chỉ kiểm tra tràn ngang và thao tác focus, không phải visual review đầy đủ. FE-U07 kiểm tra stale autocomplete; route retention cũng được kiểm tra trong VM regressions hiện có, không bao phủ mọi thứ tự tranh chấp của route requests.
