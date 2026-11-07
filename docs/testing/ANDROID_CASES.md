# Checklist Android — kiểm thử thủ công

Các ca bên dưới **chưa chạy trên thiết bị/emulator**. Test web không thay thế kiểm thử Capacitor/native. Không dùng test mẫu `2+2` làm bằng chứng nghiệp vụ.

## Chuẩn bị

- Thiết bị/emulator Android API 24 trở lên và một thiết bị API 36; ghi model, OS, WebView, SHA, phiên bản APK và màn hình vào kết quả.
- JDK 21, Android SDK 36, Gradle wrapper, dependency đã cài; build web rồi `npx cap sync android` trong bản checkout kiểm thử. Không chạy sync trong workspace có thay đổi chưa lưu.
- Backend/tiles/GPS được cấp bằng fixture hoặc máy chủ test cục bộ; không gọi provider thật. Dùng tài khoản, ảnh và tọa độ giả. Với fixture cần chỉnh URL, chỉ cấu hình bản build test, không đổi production.
- Trước mỗi ca reset dữ liệu test, quyền vị trí và trạng thái app theo tiền điều kiện. Đánh dấu PASS/FAIL/BLOCKED kèm ảnh/logcat đã lọc dữ liệu nhạy cảm.

| ID | Ưu tiên | Tiền điều kiện / dữ liệu | Bước thực hiện | Kết quả mong đợi | Tự động / kết quả hiện tại |
|---|---|---|---|---|---|
| AND-01 | P0 | APK debug mới; Android 24 và 36 | Cài, mở từ launcher, đợi khởi tạo | Splash kết thúc; hiện trang chính; không crash, không màn hình trắng | Manual / NOT RUN |
| AND-02 | P0 | Chưa cấp quyền GPS | Chọn định vị; cấp vị trí chính xác; phát GPS giả trong TP.HCM | Hiện đúng điểm; trạng thái kết thúc loading; không hỏi quyền lặp | Manual / NOT RUN |
| AND-03 | P0 | Quyền GPS chưa cấp | Từ chối yêu cầu vị trí | Có thông báo dễ hiểu; vẫn nhập điểm đi/đến thủ công được | Manual / NOT RUN |
| AND-04 | P1 | Đã từ chối vĩnh viễn quyền vị trí | Chọn GPS rồi cấp lại trong Settings, quay về app | Không vòng lặp hộp quyền; có hướng dẫn; định vị lại được sau khi cấp | Manual / NOT RUN |
| AND-05 | P1 | Quyền vị trí gần đúng; GPS bật | Chọn định vị với tọa độ fixture gần đúng | Không crash; không khẳng định độ chính xác cao hơn dữ liệu được cấp | Manual / NOT RUN |
| AND-06 | P0 | GPS tắt hoặc fixture timeout | Chọn định vị, chờ timeout | Có lỗi/khôi phục; nút không loading vô hạn; nhập tay vẫn dùng được | Manual / NOT RUN |
| AND-07 | P0 | Hai địa điểm fixture; API trả hai tuyến khác nhau | Chọn đi/đến, xe máy/xe hơi, đổi tuyến, bắt đầu điều hướng | Phương tiện và tuyến chọn khớp chỉ dẫn; bản đồ không che nút chính | Manual / NOT RUN |
| AND-08 | P1 | Đang dẫn đường; phát GPS giả thay đổi | Chuyển app xuống nền, đưa lên foreground | Không tạo watcher GPS trùng; giữ/khôi phục trạng thái có thông báo rõ | Manual / NOT RUN |
| AND-09 | P1 | Modal đăng nhập/báo cáo đang mở | Bấm Back hệ thống; mở lại; bấm Back từ trang chính | Đóng lớp hiện tại trước; không mắc kẹt hay mất dữ liệu bất ngờ | Manual / NOT RUN |
| AND-10 | P1 | Form có dữ liệu; xoay màn hình/đổi kích thước | Xoay dọc/ngang; bật bàn phím; cuộn đến nút gửi | Không tràn; input/nút xác nhận có thể chạm; dữ liệu không mất | Manual / NOT RUN |
| AND-11 | P0 | Tài khoản test; ảnh giả nhỏ; GPS giả | Mở báo cáo, chọn ảnh, nhập thông tin, gửi một lần | Gửi đúng payload fixture; có phản hồi thành công; không gửi trùng | Manual / NOT RUN |
| AND-12 | P1 | File picker mở | Hủy chọn ảnh; thử file sai định dạng/kích thước quá giới hạn UI | Hủy an toàn; lỗi được thông báo theo giới hạn công bố; không crash | Manual / NOT RUN |
| AND-13 | P0 | Đang nhập báo cáo; API fixture ngắt mạng | Gửi, bật lại kết nối test, thử lại | Không báo thành công giả; giữ dữ liệu cần thử lại; không nhân đôi báo cáo | Manual / NOT RUN |
| AND-14 | P1 | API/tiles fixture chưa sẵn sàng | Cold start khi offline, sau đó bật fixture | Hiện fallback/lỗi hợp lý; không trắng trang; có thể phục hồi | Manual / NOT RUN |
| AND-15 | P1 | Font hệ thống lớn, TalkBack bật | Duyệt menu, input, modal và cảnh báo bằng TalkBack | Nhãn có nghĩa, thứ tự focus hợp lý, cảnh báo không chỉ dựa màu | Manual / NOT RUN |
| AND-16 | P1 | Đang đăng nhập tài khoản test | Force-stop rồi mở; đăng xuất; mở lại | Phiên đăng nhập/đăng xuất theo thiết kế; không rò thông tin giữa tài khoản | Manual / NOT RUN |

## Điểm cần phân biệt với lỗi sản phẩm

- `ExampleInstrumentedTest.java` đang kiểm tra package `com.getcapacitor.app`, khác `applicationId` là `com.saigondrain.app`: test mẫu cũ cần cập nhật hạ tầng trước khi dùng; chưa kết luận app khởi động lỗi.
- `capacitor.settings.gradle` chứa đường dẫn `.pnpm` cụ thể: phải sync lại trong checkout test sau khi cài dependency. Không coi build native đã pass chỉ vì build Vite pass.
- Môi trường khảo sát không có Android SDK/adb; chưa chạy Gradle hoặc kiểm thử trên thiết bị.
