# Ca kiểm thử Backend

Các bài unit dùng service thật và repository/provider giả lập. Các bài HTTP dùng Nest và Supertest thật, giả lập service để kiểm tra routing, guard, validation, mã trạng thái và định dạng phản hồi. Không sửa mã nghiệp vụ. Bộ cũ `test/app.e2e-spec.ts` gọi trực tiếp controller và cần PostgreSQL; không phải E2E qua HTTP hay trình duyệt.

Chạy từ BE: `npm run test:baseline`, `npm run test:unit`, `npm run test:http`, `npm run typecheck`. Các ca hồi quy vẫn báo đỏ khi hành vi thực tế vi phạm kỳ vọng.

| ID | Ưu tiên | Tiền điều kiện / dữ liệu | Bước thực hiện | Kết quả mong đợi | Tự động hóa |
|---|---|---|---|---|---|
| BE-SEC-01 | P0 | Mật khẩu đúng/sai; salt ngẫu nhiên; hash SHA256 cũ | Băm hai lần; kiểm tra đúng/sai/null/hash cũ | Salt khác nhau; chỉ mật khẩu khớp được chấp nhận | src/common/security.spec.ts: salts passwords; supports legacy |
| BE-SEC-02 | P0 | Hash lưu trữ hỏng `zz:zz` | Kiểm tra mật khẩu bất kỳ | false | security.spec.ts: rejects malformed stored password hashes [regression] |
| BE-SEC-03 | P0 | Đồng hồ và secret kiểm thử cố định | Phát token; sửa chữ ký; cho hết hạn; đổi secret | Chỉ chữ ký hợp lệ và chưa hết hạn được chấp nhận | security.spec.ts: checks signed token tampering expiry and secret rotation |
| BE-SEC-04 | P0 | Token operator/coordinator/citizen; bật strict | Gọi guard thao tác điều hành | Nhân viên được phép; citizen bị cấm | security.spec.ts: accepts a valid %s bearer; rejects citizen bearer on operator actions [regression] |
| BE-SEC-05 | P0 | Cờ strict/demo; API key kiểm thử | Thử thiếu chứng thực, bearer sai, key đúng và demo | Lần lượt 403, 401, được phép, được phép | security.spec.ts: requires credentials in strict mode |
| BE-REP-01 | P1 | Repository trống; geocoder giả lập | Tạo báo cáo drain/high | Báo cáo pending; marker pending liên kết; severity critical; có sự kiện | reports.contract.spec.ts: creates pending report |
| BE-REP-02 | P0 | Báo cáo pending; marker; trust 99 | Duyệt; duyệt lại; từ chối lại | Verified đúng một lần; marker flood; trust tối đa 100; lần sau 409 | reports.contract.spec.ts: approves once |
| BE-REP-03 | P1 | Báo cáo pending; độ sâu 40; người gửi | Từ chối kèm lý do | Rejected; marker risk/độ sâu 0; tăng bộ đếm từ chối | reports.contract.spec.ts: rejects pending report |
| BE-REP-04 | P1 | Báo cáo không tồn tại / transaction lỗi | Duyệt | Lỗi not found / truyền lỗi; không phát sự kiện thành công | reports.contract.spec.ts: returns not found; does not publish |
| BE-USR-01 | P0 | Đăng ký có khoảng trắng/email hoa | Đăng ký | Chuẩn hóa; token citizen; phản hồi không hash; sự kiện không email/điện thoại/hash | users.service.spec.ts: normalizes registration |
| BE-USR-02 | P1 | Số điện thoại đã có khoảng trắng | Đăng ký số tương đương | Conflict 409 | users.service.spec.ts: rejects normalized duplicate phone |
| BE-USR-03 | P0 | Tài khoản đã có mật khẩu | Đăng nhập sai; khóa tài khoản rồi đăng nhập đúng | Unauthorized / forbidden | users.service.spec.ts: rejects wrong password and blocked account |
| BE-USR-04 | P1 | Tên có dấu phẩy và dấu nháy | Xuất CSV | Có BOM; escape nháy; không xuất thông tin bí mật | users.service.spec.ts: escapes CSV |
| BE-ALT-01 | P1 | Repository cảnh báo trống | Tạo; đổi giờ hết hạn; kết thúc | Active -> cập nhật -> ended; có sự kiện tương ứng | alerts.service.spec.ts: creates updates and ends |
| BE-ALT-02 | P1 | Cảnh báo không tồn tại | Cập nhật | Not found | alerts.service.spec.ts: does not update missing alert |
| BE-JRN-01 | P1 | OSRM giả lập timeout / tuyến trống; có tuyến lưu | Tính tuyến | Nhãn database-fallback và tuyến đã lưu | journey.providers.spec.ts: falls back to stored routes |
| BE-JRN-02 | P0 | Hai tuyến; tuyến nhanh đi gần điểm ngập critical | Tính tuyến | Ưu tiên tuyến khô ráo | journey.providers.spec.ts: prefers a dry route |
| BE-WTH-01 | P1 | Độ cao sai; timeout/có cache; offline/không cache | Lấy độ cao và thời tiết | Độ cao dự phòng; snapshot cache; hoặc mô phỏng có nhãn fallback | weather.providers.spec.ts: cả 3 ca |
| BE-HTTP-01 | P1 | Nest validation thật; provider giả lập | POST báo cáo sai enum | 400; envelope lỗi; không gọi provider | test/controllers.http-spec.ts: validation returns 400 |
| BE-HTTP-02 | P1 | Depth dạng chuỗi số; trường lạ | POST báo cáo hợp lệ | 201; chuyển số; bỏ trường lạ; JSON thành công dạng nguyên bản | controllers.http-spec.ts: transforms numbers |
| BE-HTTP-03 | P0 | Strict; thiếu/sai/operator/citizen bearer | PATCH approve | Lần lượt 403 / 401 / 200 / 403 | controllers.http-spec.ts: rejects missing; accepts operator; rejects citizen bearer over HTTP [regression] |
| BE-HTTP-04 | P1 | Provider ném NotFound; đường dẫn lạ | GET hai đường dẫn | 404; envelope có status/path/message | controllers.http-spec.ts: returns 404 envelopes |
| BE-HTTP-05 | P1 | CSV giả lập; operator key hợp lệ | GET export-csv | 200; attachment; content-type CSV; BOM | controllers.http-spec.ts: exports CSV attachment |
| BE-DB-01 | P0 | PostgreSQL dùng riêng, dùng xong hủy | Tạo và duyệt hai lần; đọc DB | Lưu report/marker; lần duyệt hai trả 409 | test/reports.db-spec.ts: persists report and marker |
| BE-DB-02 | P0 | Báo cáo pending; constraint cấm marker flood | Duyệt rồi đọc report | Ghi thất bại; report rollback về pending | reports.db-spec.ts: rolls back report review |
| BE-DB-03 | P0 | Constraint cấm marker pending | Tạo rồi đếm report | Ghi thất bại; không còn report dở dang | reports.db-spec.ts: rolls back report creation [regression] |

| BE-DB-04 | P0 | PostgreSQL cách ly; reporter có 2 lần từ chối; report pending | Từ chối rồi từ chối lại; đọc report/marker/user từ DB | Report rejected và giữ lý do; marker risk/độ sâu 0; counter tăng đúng một lần lên 3; lần lặp 409 | reports.db-spec.ts: persists rejection and increments reporter counter exactly once |

## PostgreSQL cách ly

Cần Docker engine hoạt động. Chạy từ BE:

```powershell
docker compose -p saigondrain-system-tests -f test/docker-compose.test.yml up -d --wait
npm run test:db
docker compose -p saigondrain-system-tests -f test/docker-compose.test.yml down -v
```

Compose chỉ bind `127.0.0.1:55439`, dùng credential/database kiểm thử cố định `saigondrain_isolated_test`, lưu tmpfs và không dùng volume ứng dụng. DataSource của bài DB dùng thông số cách ly cố định, không đọc DATABASE_URL và chỉ drop schema của database dùng riêng. Không đổi cấu hình này sang database có sẵn. Geocoder được giả lập. Nếu Docker không chạy, ghi 4 ca DB là CHƯA CHẠY; không thay PostgreSQL bằng DB khác hoặc coi mock transaction là bằng chứng rollback.

## Giới hạn

HTTP kiểm chứng controller/guard/pipe/interceptor/filter; không chứng minh persistence của service giả lập. Cần chạy PostgreSQL để xác nhận rollback. Kiểm tra sự kiện unit không chứng minh truyền SSE qua mạng. Provider được giả lập bằng dữ liệu/lỗi xác định; không kiểm chứng tình trạng hoạt động của dịch vụ ngoài. Setup offline chặn PostgreSQL và socket ngoài loopback trước khi chạy các bộ unit/HTTP/cũ.


## Ca bổ sung khi tổng hợp toàn hệ thống

| ID | Ưu tiên | Tiền điều kiện / dữ liệu | Bước thực hiện | Kết quả mong đợi | Tự động |
|---|---|---|---|---|---|
| BE-AN01 | P1 | Các repository rỗng | Lấy overview analytics | Count/percent bằng 0, tỷ lệ xác minh null, không NaN | analytics/analytics.contract.spec.ts — BE-AN01 |
| BE-AN02 | P1 | Ba report pending/verified/rejected; trust 59/60/85 | Tổng hợp overview | Tỷ lệ xác minh 50%, nhóm trust đúng ranh giới, sort không mutate nguồn, không trả hash/email | analytics.contract.spec.ts — BE-AN02 |
| BE-AN03 | P1 | Một chuỗi 24h, không có 7d | Query toàn bộ/24h/7d | Giữ labels/reports/rain; range vắng trả undefined theo implementation hiện tại | analytics.contract.spec.ts — BE-AN03 |
| BE-RT01 | P1 | Đồng hồ giả, một subscriber | Subscribe, broadcast report, tiến 25s, unsubscribe | Welcome/business/heartbeat đúng payload; không còn timer/sự kiện sau unsubscribe | realtime/realtime.contract.spec.ts — BE-RT01 |
| BE-RT02 | P1 | Hai service instance | Broadcast ở instance A | Counter/event không dùng chung instance B | realtime.contract.spec.ts — BE-RT02 |
| BE-SD01 | P0 | Table/key/value/object/timestamp chứa HTML script | Render viewer | Escape toàn bộ dữ liệu, không sinh script/img/svg thực thi | seed/seed.viewer.spec.ts — BE-SD01 |
| BE-SD02 | P1 | Table rỗng | Render viewer | Thông báo trống, không truy cập cột từ hàng không tồn tại | seed.viewer.spec.ts — BE-SD02 |
| BE-MAP01 | P1 | Điểm lịch sử risk, giờ VN 12h, weather timeout | Lọc flood rồi history khi khô | Không hiện flood; history trả risk depth 0; không mutate point gốc | map/map.contract.spec.ts — BE-MAP01 |
| BE-MAP02 | P1 | Sensor medium, pending high | Đổi lớp rain/flood và severity | Chỉ trả marker thuộc lớp/mức độ được chọn | map.contract.spec.ts — BE-MAP02 |
| BE-MAP03 | P1 | Điểm có ngưỡng mưa 20mm; rain 60mm; chỉ bật rain | Query points | Không trả flood khi lớp flood tắt; giữ regression fail khi code vẫn trả flood | map.contract.spec.ts — BE-MAP03 |
| BE-MAP04 | P1 | Nhãn “Đường thử nghiệm”; provider timeout | Tìm chuỗi rỗng rồi “duong thu nghiem” | Chuỗi rỗng không gọi provider; tìm không dấu fallback đúng điểm local | map.contract.spec.ts — BE-MAP04 |
| BE-MAP05 | P1 | ID missing / ID đã có | Find missing; insert trùng | 404/409; không lookup elevation hoặc insert sau conflict | map.contract.spec.ts — BE-MAP05 |
