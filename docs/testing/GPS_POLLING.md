# Kiểm tra GPS, polling và ẩn điểm khóa

Ngày kiểm tra: 08/11/2026. Khảo sát ban đầu trên `Kiet` tại `7bb238a`; nhánh PR `codex/fix-gps-polling-hidden-reports` đã tích hợp `origin/master` tại `0ac855d`.

## Hành vi

- GPS yêu cầu vị trí mới (`maximumAge: 0`), độ chính xác cao, timeout 15 giây. Không còn chuyển sang IP sau 2,2 giây khi GPS đang chờ.
- Chỉ nhận tọa độ hợp lệ và sai số do thiết bị báo không quá 200 m. Theo dõi dẫn đường bỏ qua mẫu GPS có sai số lớn.
- Thời tiết và báo cáo yêu cầu vị trí thiết bị; lỗi quyền/GPS không được thay bằng địa chỉ IP hoặc tọa độ TP.HCM mặc định. Hiển thị thông báo để chọn địa điểm thủ công.
- Thời tiết lấy lại GPS sau mỗi 30 giây nếu chưa chọn thành phố thủ công; dữ liệu thời tiết cập nhật sau mỗi 60 giây. Dữ liệu user/admin và điểm bản đồ polling sau mỗi 15 giây.
- Các chu kỳ tính từ lúc request trước hoàn tất, tránh chồng request cùng vòng polling; lỗi mạng vẫn được thử lại ở chu kỳ kế tiếp. Cleanup dừng timer và bỏ qua phản hồi khi component đã unmount.
- Phản hồi polling cũ không ghi đè thay đổi realtime/thao tác khóa mới; phản hồi thời tiết cũ không ghi đè địa điểm mới chọn.
- Báo cáo khóa không có marker hoặc popup trên bản đồ admin, kể cả bộ lọc Đã khóa. Bảng vẫn giữ báo cáo và nút Mở khóa. Mở khóa hiển thị lại marker.

## Lệnh và kết quả

Chạy từ root:

```powershell
npm --prefix FE/user run typecheck
npm --prefix FE/user run build
npm --prefix FE/user run test:gps
npm --prefix FE/user run test:regressions
npm --prefix FE/user run test:smoke
npm --prefix FE/admin run typecheck
npm --prefix FE/admin run build
npm --prefix FE/admin run test:regressions
```

- Typecheck/build hai frontend: PASS. Format toàn bộ user và smoke build: PASS. Build user có cảnh báo chunk lớn.
- Test GPS/polling user: 4/4 PASS (unit và Chromium).
- Test bản đồ admin: 2/2 PASS (component và Chromium). Bao gồm khóa/mở khóa, popup, remote lock qua polling không SSE, snapshot cũ về sau thao tác khóa, kiểm tra tràn ngang ở mobile 390 px.
- Tất cả request API và GPS trong test mới đều dùng fixture. Request ngoài origin bị chặn; không gọi API sản phẩm hoặc dùng tọa độ người dùng thật.
- Chưa kiểm chứng GPS ngoài thực địa trên điện thoại; sai số vẫn phụ thuộc cảm biến, quyền vị trí và hệ điều hành.

## Bộ test cũ

`npm --prefix FE/user run test:system`: 4 PASS, 4 FAIL (FE-U01, FE-U02, FE-U07, FE-U08). Đối chiếu bản HEAD độc lập trong `.cache/gps-baseline` cũng 4 PASS, 4 FAIL cùng ID. U01/U02/U08 chờ nhãn nút đăng nhập cũ; U07 selector khớp hai gợi ý. U01 baseline lần đầu timeout tải trang; chạy riêng lại xác nhận lỗi nhãn nút giống bản sửa. Các ca GPS U04/U05 và báo cáo U03 đều PASS trên cả hai bản.

`npm --prefix FE/user run test:regressions`: PASS sau khi tích hợp `origin/master` tại `0ac855d`. Các cập nhật test harness/debounce mới từ master được giữ lại; chỉ bổ sung mock polling vào harness. Kết quả FAIL debounce ghi nhận ban đầu tại `7bb238a` đã được thay thế bằng lần kiểm tra PASS này.
