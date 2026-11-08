import { test } from "node:test";
import { start, fixture, visible, assert } from "./system-harness.mjs";

test("weather follows fresh GPS on polling, displays failure without IP fallback", async () => {
  const app = await start(5273);
  const f = await fixture(
    app,
    async ({ url }) => {
      if (url.pathname === "/api/weather/current")
        return {
          body: {
            temperatureC: 28,
            humidityPercent: 70,
            windSpeedKmh: 5,
            currentRainMm: 0,
            weatherCondition: "Fixture sunny",
            locationName: url.searchParams.get("locationName") || "Fixture city",
          },
        };
      if (url.pathname === "/api/map/geocode/reverse")
        return { body: { location: "Synthetic GPS street", district: "Test district" } };
      if (url.pathname === "/api/forecasts/slots") return { body: [] };
      return { body: [] };
    },
    {
      permissions: ["geolocation"],
      geolocation: { latitude: 10.81, longitude: 106.61, accuracy: 10 },
    },
  );
  try {
    await f.page.clock.install();
    await f.open();
    await f.page.getByRole("button", { name: "Thời tiết", exact: true }).first().click();
    await visible(f.page.getByText("Synthetic GPS street", { exact: true }));
    assert.ok(
      f.requests.some((r) => r.query?.includes("lat=10.81") && r.query?.includes("lng=106.61")),
    );
    await f.page.context().setGeolocation({ latitude: 10.82, longitude: 106.62, accuracy: 10 });
    const refresh = f.page.waitForRequest((r) => r.url().includes("/weather/current?lat=10.82"));
    await f.page.clock.fastForward(31000);
    await refresh;
    await f.page.context().clearPermissions();
    await f.page.getByRole("button", { name: "Lấy vị trí GPS hiện tại", exact: true }).click();
    await visible(
      f.page.getByRole("status").filter({ hasText: "Không lấy được vị trí chính xác" }),
    );
    assert.equal(f.blocked.filter((url) => /ipwho|get\.geojs/.test(url)).length, 0);
    f.assertHealthy();
  } finally {
    await f.close();
    await app.close();
  }
});
