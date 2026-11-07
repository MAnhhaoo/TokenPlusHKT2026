# Kết quả Backend — 07/11/2026

Môi trường: Windows PowerShell, Node/npm, worktree `TokenPlus-system-tests`. Cài bằng `npm install --workspaces=false --ignore-scripts`. Không sửa mã nghiệp vụ. Kết quả được đo trước khi commit bộ kiểm thử để mở PR.

| Lệnh từ BE | Trạng thái | Bằng chứng |
|---|---|---|
| npm run test:baseline | ĐẠT | 3 suite, 4 test cũ đạt |
| npm run test:unit | KHÔNG ĐẠT do lỗi thực tế | Lần tổng hợp qua root runner: 13 suite, 41 test; 38 đạt, 3 lỗi. |
| npm run test:http | KHÔNG ĐẠT do lỗi phân quyền | 1 suite, 7 test; 6 đạt, 1 lỗi |
| npm run typecheck | ĐẠT | Exit 0; bao gồm TypeScript kiểm thử mới |
| npm run test:e2e -- --runInBand | BỊ CHẶN tại bootstrap | Bộ cũ có 21 test báo lỗi chung TEST_NETWORK_BLOCKED khi khởi tạo PostgreSQL; chưa chạy assertion nghiệp vụ nào. DB_TYPE=sqljs trong bài cũ vẫn dẫn đến PostgreSQL trong cấu hình ứng dụng. Không kết nối DB/provider thật. |
| npm run test:db | CHƯA CHẠY | Có 4 ca PostgreSQL cách ly. Docker engine không khả dụng; Docker Desktop lỗi khởi tạo inference listener. Không dùng DB sẵn có/production để thay thế. |

## Lỗi đã quan sát, giữ nguyên test đỏ

1. `Security contracts › rejects malformed stored password hashes [regression]`: `verifyPassword("any password", "zz:zz")` trả true. Hex sai giải mã thành key rỗng; scrypt độ dài 0 so sánh bằng nhau. Chỉ chứng minh lỗi với credential lưu trữ hỏng, không khẳng định bỏ qua được hash sinh đúng.
2. `Security contracts › rejects citizen bearer on operator actions [regression]`: OperatorAuthGuard chấp nhận token citizen hợp lệ khi bật strict; không ném ForbiddenException như kỳ vọng.
3. `HTTP controllers with mocked providers › rejects citizen bearer over HTTP [regression]`: citizen PATCH `/api/reports/R/approve` nhận 200 thay vì 403. Tái hiện lỗi số 2 qua HTTP Nest thật.

4. `Map layer and provider contracts › BE-MAP03 excludes dynamically flooded points when flood layer is disabled [regression]`: query `layers=rain`, `rainMm=60` vẫn trả điểm `type=flood`; nhánh suy luận ngập không kiểm tra lớp flood đang tắt. Test dùng điểm risk, ngưỡng mưa 20mm, giờ VN 12h cố định.

Bằng chứng root runner: `.cache/system-tests/2026-11-07T11-59-09-649Z/` (unit 38/41, HTTP 6/7, DB BLOCKED). Token citizen là một lỗi được tái hiện ở hai tầng, không phải hai lỗi độc lập.

## Nghi vấn chờ chạy DB

`Isolated PostgreSQL report transactions › rolls back report creation when marker persistence fails [regression]`: CHƯA CHẠY. Đọc mã thấy create lưu report và marker riêng rẽ; test kỳ vọng không còn report dở dang nếu constraint DB từ chối marker. Đây là nghi vấn atomicity, chưa phải lỗi DB được thực nghiệm xác nhận. Rollback duyệt có ca PostgreSQL độc lập.

## An toàn và cách diễn giải

Các lệnh unit/HTTP/bộ cũ nạp `test/offline.setup.ts`: Client/Pool PostgreSQL ném lỗi trước kết nối; socket ngoài loopback bị chặn. Supertest chạy server loopback tạm với provider giả lập. Bộ DB tách riêng, cố định port 55439 và database `saigondrain_isolated_test`, không đọc cấu hình production. Không bỏ qua test để làm xanh bộ kiểm thử. Các lỗi import/biên dịch harness trong lần đầu đã sửa trước các lần chạy cuối; các assertion đỏ nêu trên là hành vi thực tế.

Cài dependency báo 16 audit finding (8 thấp, 6 trung bình, 2 cao). Không chạy audit fix hoặc nâng dependency production.

Rà soát cuối tăng độ chặt fixture định tuyến: hai tuyến có cùng điểm đi/đến, một tuyến cắt qua điểm ngập ở giữa; assert chính tọa độ tuyến khô ráo chậm hơn được chọn và tuyến còn lại bị trừ điểm. Chạy riêng journey.providers.spec.ts sau bổ sung: 3/3 đạt.
