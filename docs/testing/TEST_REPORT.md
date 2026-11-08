# Báo cáo kiểm thử toàn hệ thống — 07/11/2026

> Các số liệu tại mốc 38d9d49 là snapshot khảo sát ban đầu. Bản sửa CI sau khi đồng bộ master được ghi riêng ở cuối, không dùng số liệu cũ để kết luận mã hiện tại.

## Mốc và phạm vi

- Nguồn: `origin/master` tại `38d9d490805d835f2ce12dcfc473bb711df69b13`.
- Nhánh local: `codex/system-test-cases`; worktree `C:/Users/admin/Desktop/TokenPlus-system-tests`.
- Phạm vi khảo sát ban đầu chỉ bổ sung test và tài liệu. Sau yêu cầu sửa CI, ba lỗi BE được sửa có regression chứng minh; xem mục cập nhật cuối.
- Workspace gốc giữ nguyên các thay đổi `pnpm-workspace.yaml` và `pnpm-lock.yaml`.
- Khảo sát source/config/test theo BE, admin và user; đối chiếu PRD/API_SPEC/SYSTEM_DESIGN/AI_SAFETY. Đã khảo sát entrypoint/module/component/API client/DTO/entity, test và cấu hình theo phân hệ.

## Môi trường và cách đo

Windows PowerShell, Node 24.18.0, npm 11.16.0. Các package Node cài độc lập trong worktree để không ghi đè lockfile đang sửa ở checkout gốc. Playwright dùng Chromium headless; API/SSE/GPS/provider là fixture. BE unit/HTTP nạp network guard; PostgreSQL integration dùng cấu hình riêng, không lấy `.env` production.

Runner tổng hợp: `npm run test:system`. Kết quả từng stage và stdout/stderr lưu dưới `.cache/system-tests/<run-id>/`; xem [README.md](README.md) để chạy chọn nhóm và chuẩn bị môi trường.

## Baseline trước khi bổ sung test

| Phân hệ | Kết quả baseline | Diễn giải |
|---|---|---|
| BE unit cũ | 4/4 đạt, 3 suite | Chưa có test role citizen, hash lỗi hoặc lớp bản đồ |
| BE E2E cũ | BLOCKED ở bootstrap; 21 test không tới assertion nghiệp vụ | `DB_TYPE=sqljs` vẫn chọn PostgreSQL; network guard chặn trước kết nối. Không tính 21 test này là lỗi nghiệp vụ riêng lẻ |
| Admin smoke cũ | FAIL assertion dữ liệu mock khởi tạo | Source mới đã tích hợp API, test cũ còn kỳ vọng 4 mock pending; ghi nhận test lỗi thời |
| User smoke và regression cũ | Đạt | Smoke cũ kiểm tra build/provenance; VM regression không thay thế browser |

## Kết quả tổng hợp

| Bộ | Kết quả đã xác minh | Bằng chứng |
|---|---|---|
| Typecheck + build BE/admin/user | 6/6 stage đạt | `.cache/system-tests/2026-11-07T12-04-57-285Z/summary.json` |
| BE unit | 38 đạt / 3 fail / 41 test, 13 suite | `.cache/system-tests/2026-11-07T12-04-57-285Z/be-unit.log` |
| BE HTTP Supertest | 6 đạt / 1 fail / 7 test | Cùng run: `be-http.log` |
| PostgreSQL | BLOCKED — 4 ca chưa chạy | Docker Desktop khởi tạo lỗi inference listener, không có daemon dùng được; Compose config validate đạt |
| Frontend browser | Admin 6 đạt / 8 fail / 14; user 8/8 đạt | `.cache/system-tests/2026-11-07T12-04-57-285Z/`; API/SSE/GPS fixture |

Không cộng baseline hoặc những lần rerun vào số test mới. Lỗi citizen token xuất hiện ở unit và HTTP nhưng là **một lỗi gốc**. Không báo “toàn bộ test xanh” khi còn regression đỏ hoặc stage BLOCKED.

## Lỗi đã tái hiện

| ID | Mức | Cách tái hiện / kỳ vọng | Hành vi quan sát | Test |
|---|---|---|---|---|
| BUG-BE-01 | P0 | Bật strict auth, dùng signed token role citizen gọi operator action; kỳ vọng 403 | Guard cho qua; PATCH approve trả 200 | `security.spec.ts` citizen regression và `controllers.http-spec.ts` citizen HTTP regression |
| BUG-BE-02 | P1 | Verify password bất kỳ với stored hash hỏng `zz:zz`; kỳ vọng false | Hàm trả true do giải mã hex thành key rỗng | `security.spec.ts` malformed stored password regression; không khẳng định ảnh hưởng hash hợp lệ |
| BUG-BE-03 | P1 | Điểm risk có ngưỡng 20mm, query chỉ lớp rain, mưa 60mm, giờ VN 12h; kỳ vọng không có flood | BE vẫn trả flood vì nhánh suy luận bỏ qua lớp đang tắt | `map.contract.spec.ts` BE-MAP03 |
| BUG-FE-01 | P0 | PATCH duyệt/từ chối/status hoặc POST/PATCH cảnh báo trả 503; kỳ vọng giữ state server và báo lỗi | Admin cập nhật state local và báo thành công dù server chưa lưu | FE-A06/A07/A08/A12-create/update/end (6 assertion fail) |
| BUG-FE-02 | P1 | Initial API trả 503 hoặc pending lâu; kỳ vọng phân biệt tải/lỗi với dữ liệu rỗng | Thiếu error alert và busy indicator, queue rỗng giống đã tải thành công | FE-A10/A11 |

Các lỗi frontend và bằng chứng chi tiết được ghi trong [FE_RESULTS.md](FE_RESULTS.md). Không sửa production và không thêm skip/xfail để che lỗi.

## Những điều chưa được xác nhận

- **PostgreSQL atomicity:** test kiểm tra rollback duyệt và tạo report khi ghi marker lỗi đã viết; không khẳng định DB thực sự rollback/pass khi daemon chưa chạy.
- Không có browser nối BE thật trong một phiên xuyên suốt; HTTP, DB và browser fixture kiểm tra từng ranh giới độc lập.
- Không đo thời gian định tuyến 1.5s, tải hệ thống, 60 FPS hay chất lượng tiles/GPS ngoài thực địa.
- Tài liệu API mô tả success envelope nhưng `TransformInterceptor` hiện chuyển tiếp raw data; test HTTP ghi nhận raw success payload và error envelope hiện tại. Cần chốt hợp đồng riêng trước khi đổi hành vi.

## Bàn giao

Ma trận tổng: [TEST_CASES.md](TEST_CASES.md). Chi tiết BE/FE có các bảng ID, dữ liệu, bước chạy, expected và tên test. Lệnh tổng hợp trả exit 1 khi có regression fail, exit 2 khi chỉ thiếu môi trường; BLOCKED/NOT RUN luôn được trình bày riêng.

Kiểm tra bàn giao: diff không thay đổi source nghiệp vụ; `git diff --cached --check` đạt. SHA-256 của hai file pnpm đang sửa ở workspace gốc trùng trước/sau. Browser harness dừng server theo process tree và chờ exit; không còn listener kiểm thử ở 5273/5274.

## Cập nhật sửa CI PR #16

Đồng bộ `master` tại `a77a268` vào nhánh PR trước khi sửa để kiểm tra đúng mã merge của Actions.

- CI BE ban đầu dừng tại `npm ci`: lockfile tạo bằng npm 11 thiếu nested optional peer `webpack@5.112.2` mà npm 10.9.9 trên runner yêu cầu. Tái tạo lock bằng đúng npm 10; `npm ci --dry-run --ignore-scripts --workspaces=false` đạt, không nới frozen/clean install.
- CI user dừng tại oxfmt: format đúng các file được báo (ReportModal, index.css, browser harness/tests); các test BE/source mới từ master cũng được format theo Prettier hiện có. Không vô hiệu lint/format.
- Sửa ba lỗi BE đã được test chứng minh: citizen token bị chặn trên operator action; hash salt/key sai định dạng bị từ chối; điểm ngập động chỉ hiện khi lớp flood được bật. Không đổi assertion để che lỗi.
- Cập nhật mock Gemini dependency trong constructor của report unit/DB fixtures theo master, giữ nguyên event assertions; không gọi Gemini thật.

Xác minh local sau sửa:

| Bộ | Kết quả |
|---|---|
| BE build / typecheck / lint | Đạt |
| BE unit | 41/41 đạt, 13 suite |
| BE HTTP | 7/7 đạt |
| User build / typecheck / oxfmt check | Đạt |
| User build smoke + VM regressions | Đạt |
| User browser system | 8/8 đạt |
| Diff check / review độc lập | Đạt, không phát hiện vấn đề quan trọng |

Đây là bản sửa các job CI BE/FE-user hiện hành. Các regression admin và ca PostgreSQL/Android chưa được xử lý trong bản sửa CI này; không khẳng định `npm run test:system` toàn repo đã xanh. Bảng kết quả lịch sử ở trên được giữ để đối chiếu.
