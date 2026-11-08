import { before, after, test } from "node:test";
import { start, fixture, visible, absent, assert, delay } from "./system-harness.mjs";
let app;
before(async () => {
  app = await start(5273);
});
after(async () => {
  await app?.close();
});
const user = {
  id: "U-TEST",
  name: "Synthetic Citizen",
  initials: "SC",
  phone: "0900000000",
  email: "citizen@example.test",
  district: "Bình Thạnh",
  joinedAt: "01/11/2026",
  lastActive: "now",
  reports: 0,
  verifiedReports: 0,
  rejectedReports: 0,
  trustScore: 90,
  status: "active",
  identityVerified: true,
  warnings: 0,
};
const weather = {
  provider: "Fixture",
  locationName: "TP.HCM",
  temperatureC: 28,
  humidityPercent: 80,
  windSpeedKmh: 5,
  currentRainMm: 4.8,
  weatherCondition: "Fixture weather",
  floodRiskLevel: "Thấp",
};
const slots = [
  { id: "now", label: "Hiện tại", rain: "4.8 mm", risk: "Thấp", zone: 0 },
  { id: "30", label: "+30 phút", rain: "12 mm", risk: "Cao", zone: 2 },
];
const alert = {
  id: "AL-TEST",
  area: "Synthetic district",
  level: "Cảnh báo",
  hazardType: "Ngập đường",
  title: "Synthetic warning",
  message: "Fixture safety guidance",
  startedAt: "18:00",
  expiresAt: "21:00",
  status: "active",
};
function api(overrides = {}) {
  return async ({ req, url }) => {
    const key = `${req.method()} ${url.pathname}`;
    if (overrides[key]) return overrides[key]({ req, url });
    const data = {
      "/api/weather/current": weather,
      "/api/journey/forecasts": slots,
      "/api/alerts": [alert],
      "/api/map/points": [],
      "/api/map/geocode/reverse": { location: "Synthetic GPS street", district: "Bình Thạnh" },
    };
    if (url.pathname === "/api/map/geocode/search")
      return {
        body: [
          {
            label: `Synthetic ${url.searchParams.get("q")}`,
            district: "Bình Thạnh",
            coords: [106.71, 10.79],
          },
        ],
      };
    if (req.method() === "GET" && url.pathname in data) return { body: data[url.pathname] };
    return { status: 501, body: { message: `Unmocked ${key}` } };
  };
}
async function run(handler, body, options) {
  const f = await fixture(app, handler, options);
  try {
    await f.open();
    await visible(f.page.getByRole("button", { name: "Cập nhật thời tiết thực tế từ Open-Meteo" }));
    await body(f);
    f.assertHealthy();
  } finally {
    await f.close();
  }
}
test("FE-U01 registration validates, calls API, then login persists profile and logout clears it", async () =>
  run(
    api({
      "POST /api/users/register": () => ({ body: { user, message: "Fixture registered" } }),
      "POST /api/users/login": () => ({
        body: { user, token: "synthetic-token", message: "Fixture logged in" },
      }),
    }),
    async ({ page, requests }) => {
      await page.getByRole("button", { name: "Đăng nhập hoặc Đăng ký tài khoản" }).click();
      await page.getByRole("tab", { name: "Đăng ký mới" }).click();
      await page.getByRole("button", { name: "Đăng ký tài khoản", exact: true }).click();
      await visible(page.getByText("Vui lòng điền đầy đủ thông tin đăng ký."));
      assert.equal(requests.filter((r) => r.method === "POST").length, 0);
      await page.getByLabel("Họ và tên").fill(user.name);
      await page.getByLabel("Số điện thoại", { exact: true }).fill(user.phone);
      await page.getByLabel("Địa chỉ Email").fill(user.email);
      await page.getByLabel("Mật khẩu (tối thiểu 6 ký tự)").fill("synthetic-password");
      await page.getByRole("button", { name: "Đăng ký tài khoản", exact: true }).click();
      await visible(
        page.getByText("Đăng ký tài khoản thành công! Vui lòng nhập mật khẩu để đăng nhập."),
      );
      assert.equal(await page.getByLabel("Email hoặc Số điện thoại").inputValue(), user.email);
      await page.getByLabel("Mật khẩu", { exact: true }).fill("synthetic-password");
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await visible(page.getByRole("heading", { name: "Hồ sơ thành viên" }));
      assert.equal(
        await page.evaluate(() => localStorage.getItem("saigondrain_auth_token")),
        "synthetic-token",
      );
      assert.equal(requests.find((r) => r.path.endsWith("/register")).body.email, user.email);
      await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
      assert.equal(await page.evaluate(() => localStorage.getItem("saigondrain_auth_user")), null);
    },
  ));
test("FE-U02 failed login stays editable and announces backend message", async () =>
  run(
    api({
      "POST /api/users/login": () => ({
        status: 401,
        body: { message: "Synthetic invalid credentials" },
      }),
    }),
    async ({ page }) => {
      await page.getByRole("button", { name: "Đăng nhập hoặc Đăng ký tài khoản" }).click();
      await page.getByLabel("Email hoặc Số điện thoại").fill(user.email);
      await page.getByLabel("Mật khẩu", { exact: true }).fill("bad-password");
      await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
      await visible(page.getByText("Synthetic invalid credentials"));
      assert.equal(await page.getByLabel("Email hoặc Số điện thoại").inputValue(), user.email);
      assert.equal(
        await page.getByRole("button", { name: "Đăng nhập", exact: true }).isEnabled(),
        true,
      );
    },
  ));
test("FE-U03 report network failure retains form, retry submits payload and focuses success", async () => {
  let failed = true;
  await run(
    api({ "POST /api/reports": () => (failed ? { abort: true } : { body: { id: "RP-CREATED" } }) }),
    async ({ page, requests }) => {
      await page.locator(".report-fab").click();
      await page.getByLabel("Nhập tên đường hoặc vị trí ngập").fill("Synthetic report street");
      await page.getByLabel("Mô tả chi tiết hiện trường (tùy chọn)").fill("Synthetic description");
      await page.getByRole("button", { name: "Gửi báo cáo cộng đồng", exact: true }).click();
      await visible(page.getByRole("alert"));
      assert.equal(
        await page.getByLabel("Nhập tên đường hoặc vị trí ngập").inputValue(),
        "Synthetic report street",
      );
      failed = false;
      await page.getByRole("button", { name: "Gửi báo cáo cộng đồng", exact: true }).click();
      await visible(page.getByRole("status").filter({ hasText: "RP-CREATED" }));
      assert.ok(
        await page.locator(".report-success").evaluate((e) => e === document.activeElement),
      );
      const posts = requests.filter((r) => r.method === "POST" && r.path === "/api/reports");
      assert.equal(posts.length, 2);
      assert.equal(posts[1].body.description, "Synthetic description");
    },
  );
});
for (const granted of [true, false])
  test(
    `FE-U0${granted ? 4 : 5} GPS ${granted ? "allowed" : "denied"} origin uses ${granted ? "device" : "approximate fallback"} coordinates`,
    async () =>
      run(api(), async ({ page, requests, blocked }) => {
        await page.context().addInitScript((granted) => {
          navigator.geolocation.getCurrentPosition = (ok, fail) =>
            granted
              ? ok({ coords: { latitude: 10.79, longitude: 106.71, accuracy: 5 } })
              : fail({ code: 1, message: "Fixture denied" });
        }, granted);
        await page.reload();
        await page
          .getByRole("button", { name: "Lấy vị trí GPS hiện tại làm điểm xuất phát" })
          .click();
        await delay(500);
        const input = await page.locator('input[aria-label="Nhập điểm đi"]:visible').inputValue();
        assert.match(input, granted ? /Vị trí của bạn/ : /Vị trí gần đúng/);
        const reverse = requests.find((r) => r.path.endsWith("/reverse"));
        assert.ok(reverse);
        assert.match(reverse.query, granted ? /lat=10.79/ : /lat=10.7769/);
        if (!granted) assert.ok(blocked.some((u) => u.includes("ipwho.is")));
      }),
    granted
      ? { permissions: ["geolocation"], geolocation: { latitude: 10.79, longitude: 106.71 } }
      : {},
  );
test("FE-U06 forecasts display and SSE alert refresh reach notifications", async () => {
  let alerts = [alert];
  await run(api({ "GET /api/alerts": () => ({ body: alerts }) }), async (f) => {
    await visible(
      f.page.getByRole("listitem", {
        name: "+30 phút: 12 mm mưa, nguy cơ cao",
        exact: true,
      }),
    );
    await f.page.getByRole("button", { name: /Cảnh báo khu vực, có 1/ }).click();
    await visible(f.page.getByText("Synthetic warning", { exact: true }));
    await f.page.keyboard.press("Escape");
    await absent(f.page.getByRole("dialog"));
    alerts = [];
    await f.emit("alert.ended", alert);
    await visible(f.page.getByRole("button", { name: /Cảnh báo khu vực, có 0/ }));
    await f.emit("weather.updated", {
      snapshot: { ...weather, temperatureC: 25 },
      slots: [{ ...slots[0], rain: "8.4 mm" }],
    });
    await visible(f.page.getByRole("listitem", { name: /Hiện tại: 8.4 mm/ }));
  });
});
test("FE-U07 route endpoints use keyboard suggestions, backend route and discard stale autocomplete", async () => {
  let first,
    routeFailed = false;
  const route = {
    id: "safe",
    name: "Synthetic safe route",
    time: "9 phút",
    distance: "2 km",
    badge: "Fixture",
    detail: "Synthetic route detail",
    coordinates: [
      [106.71, 10.79],
      [106.715, 10.795],
      [106.72, 10.8],
    ],
  };
  await run(
    api({
      "GET /api/map/geocode/search": async ({ url }) => {
        const q = url.searchParams.get("q");
        if (q === "Old query")
          await new Promise((resolve) => {
            first = resolve;
          });
        return { body: [{ label: `Synthetic ${q}`, coords: [106.71, 10.79] }] };
      },
      "GET /api/map/points": () => ({
        body: routeFailed
          ? [
              {
                id: "flood-refresh",
                lat: 10.795,
                lng: 106.715,
                label: "Synthetic flood",
                district: "Bình Thạnh",
                type: "flood",
                severity: "high",
                depth: 30,
                rainfall: 10,
              },
            ]
          : [],
      }),
      "GET /api/journey/compute-route": () =>
        routeFailed
          ? { status: 503 }
          : {
              body: {
                provider: "fixture",
                safeRoute: route,
                balancedRoute: { ...route, id: "balanced", name: "Synthetic balanced" },
              },
            },
    }),
    async ({ page, requests, emit }) => {
      // Real geocoders stay blocked; this exact URL is fulfilled with synthetic ArcGIS-format data.
      await page
        .context()
        .route("https://geocode.arcgis.com/**/findAddressCandidates?*", async (r) => {
          const q = new URL(r.request().url()).searchParams.get("SingleLine");
          if (q === "Old query")
            await new Promise((resolve) => {
              first = resolve;
            });
          await r.fulfill({
            json: {
              candidates: [
                {
                  address: `Synthetic ${q}`,
                  location: { x: 106.71, y: 10.79 },
                  attributes: {
                    PlaceName: `Synthetic ${q}`,
                    District: "Bình Thạnh",
                    Addr_type: "POI",
                  },
                },
              ],
            },
          });
        });
      const origin = page.locator('input[aria-label="Nhập điểm đi"]:visible');
      await origin.fill("Old query");
      for (let i = 0; i < 30 && !first; i++) await delay(50);
      assert.ok(first, "old request started");
      await origin.fill("Fresh origin");
      await visible(page.getByRole("button", { name: /^Synthetic Fresh origin/ }).first());
      first();
      await delay(100);
      assert.equal(await page.getByRole("button", { name: /^Synthetic Old query/ }).count(), 0);
      await origin.press("Enter");
      const destination = page.locator('input[aria-label="Nhập điểm đến"]:visible');
      await destination.fill("Fresh destination");
      await visible(page.getByRole("button", { name: /^Synthetic Fresh destination/ }).first());
      await destination.press("Enter");
      await visible(page.getByText("Synthetic safe route", { exact: true }).first());
      assert.ok(requests.some((r) => r.path === "/api/journey/compute-route"));
      routeFailed = true;
      const failedResponse = page.waitForResponse(
        (r) => r.url().includes("/api/journey/compute-route") && r.status() === 503,
      );
      await emit("report.approved", {});
      await failedResponse;
      await delay(500);
      await visible(page.getByText("Synthetic safe route", { exact: true }).first());
    },
  );
});
test("FE-U08 responsive shell and keyboard modal focus", async () =>
  run(api(), async ({ page }) => {
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `overflow at ${width}`,
      );
      await page.getByRole("button", { name: "Đăng nhập hoặc Đăng ký tài khoản" }).click();
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        assert.ok(
          await page.getByRole("dialog").evaluate((e) => e.contains(document.activeElement)),
        );
      }
      await page.keyboard.press("Escape");
      await absent(page.getByRole("dialog"));
    }
  }));
