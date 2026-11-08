# Chạy kiểm thử local

Chỉ thay đổi test, fixture, dependency kiểm thử, lệnh chạy và tài liệu. Các regression ghi nhận lỗi bằng assertion thật; bản sửa CI có sửa ba lỗi BE tương ứng và được ghi riêng trong TEST_REPORT. Bộ kiểm thử được bàn giao qua nhánh `codex/system-test-cases`; các kết quả bên dưới được đo trên mốc nguồn đã ghi trong báo cáo.

## Chuẩn bị

- Node >=22.12, npm/pnpm; cài dependency riêng trong `BE`, `FE/admin`, `FE/user` theo lockfile của từng package. Không ghi đè lockfile đang sửa ở workspace gốc.
- Chromium cho Playwright: `cd FE/admin` rồi `npx playwright install chromium`. Các bộ browser test tự quản lý server riêng; xem tài liệu FE để biết port.
- PostgreSQL integration dùng Docker Desktop đang chạy; chỉ dùng compose và database test trong `BE/test`, không lấy `DATABASE_URL` thật từ `.env`.
- Cài dependency có thể cần internet. Trong lúc chạy test, provider được mock/chặn; không gọi API thời tiết, bản đồ, geocoding hoặc dịch vụ production.

## Lệnh tổng hợp

Từ root worktree:

```powershell
npm run test:system -- --list
npm run test:system
npm run test:system -- --only=be:unit,be:http
npm run test:system -- --only=admin,user
```

Runner chạy tuần tự, tiếp tục sau một stage lỗi để thu đủ bằng chứng. Với DB, runner tạo project Compose riêng cho mỗi lượt, đợi PostgreSQL healthy và dọn project đó trong `finally`; không dùng stack ứng dụng. Port test cố định 55439 phải trống. Log và `summary.json` ở `.cache/system-tests/<run-id>/`; không commit output sinh ra. Exit code: **0** tất cả pass, **1** có test/build fail, **2** thiếu môi trường và không có stage fail. Không tính BLOCKED là pass.

`--only` nhận ID chính xác trong `--list` hoặc nhóm `be`, `admin`, `user`. Runner không tự cài package, bật Docker hoặc gọi dịch vụ production.

## Đọc kết quả

- [TEST_CASES.md](TEST_CASES.md): phạm vi và ma trận ca kiểm thử.
- [TEST_REPORT.md](TEST_REPORT.md): baseline, kết quả và lỗi đã tái hiện.
- [BE_RESULTS.md](BE_RESULTS.md), [FE_RESULTS.md](FE_RESULTS.md): bằng chứng theo phân hệ.

Với test lỗi đã biết, chạy riêng tên test từ báo cáo để tái hiện. Không dùng `skip`, đổi assertion theo hành vi sai hoặc mock chính logic đang kiểm tra để báo xanh.

## Giới hạn

Mock browser xác minh hành vi client với giao thức fixture; không chứng minh Google/OSRM/Open-Meteo đang hoạt động. Mock-controller HTTP kiểm tra Nest routing/pipe/guard/interceptor nhưng không thay thế kiểm thử lưu trữ PostgreSQL. Không đo tải, độ trễ cam kết 1.5s, 60 FPS hoặc bảo mật toàn diện bằng bộ regression này.
