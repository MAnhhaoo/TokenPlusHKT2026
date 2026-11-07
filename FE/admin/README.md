# SaigonDrain admin — mock demo

Ứng dụng độc lập React + TypeScript + Vite. Yêu cầu Node 22.12+.

```powershell
cd FE/admin
npm ci
npm run dev
npm run typecheck
npm run build
```

Development: http://localhost:5174. Preview production: `npm run preview` (4174).

Đủ sáu màn hình; toàn bộ dữ liệu là giả lập trong `src/data/mockData.ts`. Duyệt báo cáo, cảnh báo và trạng thái người dùng chỉ thay đổi trong bộ nhớ; reload đặt lại dữ liệu. CSV được tạo cục bộ. Không có API, realtime, font/ảnh mạng hoặc tile server. Bản đồ SVG chỉ minh họa, không dùng định vị hay chỉ đường.

Giao diện được chuyển thể từ kietda623/SaigonDrain, thư mục frontend/admin; giữ thương hiệu và hệ màu “Mực nước”.

Kiểm thử trình duyệt (mở dev server ở terminal khác):

```powershell
npx playwright install chromium
npm run test:smoke
```

Smoke test chặn request ngoài origin, kiểm tra các thao tác mock và layout 1440/390/320px. Có thể đặt `ADMIN_URL` để kiểm thử preview production.
