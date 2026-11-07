import { Controller, Get, Header, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SeedService } from "../services/seed.service";
import { OperatorAuthGuard } from "../../../common/guards/operator-auth.guard";

/**
 * Mã hóa các ký tự HTML đặc biệt để chống tấn công Stored XSS khi hiển thị dữ liệu.
 */
function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

@ApiTags("8. Seed & Database Explorer (Quản trị & Xem Cơ sở dữ liệu)")
@UseGuards(OperatorAuthGuard)
@Controller("seed")
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  /**
   * Khôi phục toàn bộ cơ sở dữ liệu về trạng thái dữ liệu mẫu chuẩn.
   */
  @Post("reset")
  @ApiOperation({
    summary:
      "Khôi phục toàn bộ cơ sở dữ liệu về trạng thái dữ liệu mẫu chuẩn cho demo Hackathon",
  })
  resetData() {
    return this.seedService.resetAndSeed();
  }

  /**
   * Trả về toàn bộ các bảng dữ liệu đã lọc thông tin nhạy cảm dưới dạng JSON.
   */
  @Get("tables")
  @ApiOperation({
    summary:
      "Xem toàn bộ dữ liệu thực tế trong 8 bảng của Database dưới dạng JSON",
  })
  inspectTables() {
    return this.seedService.inspectAllTables();
  }

  /**
   * Render giao diện HTML xem dữ liệu 8 bảng với đầy đủ cơ chế escape chống XSS.
   */
  @Get("db-viewer")
  @Header("Content-Type", "text/html; charset=utf-8")
  @ApiOperation({
    summary:
      "Giao diện Web xem trực tiếp 8 bảng trong Database trên trình duyệt (http://localhost:3000/api/seed/db-viewer)",
  })
  async renderDbViewer(): Promise<string> {
    const data = await this.seedService.inspectAllTables();
    const tableBlocks = Object.entries(data.tables)
      .map(([tableName, rows]) => {
        const safeTableName = escapeHtml(tableName);
        const list = rows as unknown as Record<string, unknown>[];
        if (list.length === 0) {
          return `<section class="card"><h2>Bảng: <code>${safeTableName}</code> <span class="badge">0 bản ghi</span></h2><p>Bảng hiện đang trống.</p></section>`;
        }
        const cols = Object.keys(list[0]);
        const ths = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
        const trs = list
          .map(
            (row) =>
              `<tr>${cols
                .map((c) => {
                  const val = row[c];
                  const str =
                    val === null || val === undefined
                      ? "<em>null</em>"
                      : typeof val === "object"
                        ? `<code>${escapeHtml(JSON.stringify(val))}</code>`
                        : escapeHtml(val);
                  return `<td>${str}</td>`;
                })
                .join("")}</tr>`,
          )
          .join("");
        return `<section class="card">
          <h2>Bảng: <code>${safeTableName}</code> <span class="badge">${list.length} bản ghi</span></h2>
          <div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>
        </section>`;
      })
      .join("");

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8"/>
  <title>SaigonDrain AI — Database Explorer</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f4f7f6; color: #122422; margin: 0; padding: 24px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: #0b4f4a; color: #fff; padding: 18px 24px; border-radius: 12px; }
    header h1 { margin: 0; font-size: 20px; }
    header a { background: #fff; color: #0b4f4a; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .card { background: #fff; border-radius: 12px; padding: 18px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .card h2 { margin-top: 0; font-size: 16px; display: flex; align-items: center; gap: 10px; }
    .badge { background: #e6f2f0; color: #0b4f4a; padding: 3px 10px; border-radius: 99px; font-size: 12px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #dde6e5; padding: 8px 10px; text-align: left; vertical-align: top; max-width: 340px; word-break: break-word; }
    th { background: #f0f5f4; color: #0b4f4a; font-weight: 600; }
    tr:nth-child(even) { background: #fafcfc; }
    code { font-family: Consolas, monospace; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>SaigonDrain AI — Trình xem Cơ sở dữ liệu (8 Bảng)</h1>
      <small>Cập nhật lúc: ${escapeHtml(data.inspectedAt)}</small>
    </div>
    <a href="/api/seed/db-viewer">Làm mới dữ liệu</a>
  </header>
  ${tableBlocks}
</body>
</html>`;
  }
}
