import { AlertsService } from "./services/alerts.service";
import { NotFoundException } from "@nestjs/common";
describe("Alert lifecycle", () => {
  it("creates updates and ends an alert with persisted events", async () => {
    let saved: any;
    const repo: any = {
      count: async () => 0,
      create: (x: any) => x,
      save: async (x: any) => (saved = x),
      findOne: async () => saved,
    };
    const events: any = { broadcast: jest.fn() };
    const service = new AlertsService(repo, events);
    const created = await service.create({
      area: "A",
      title: "Flood",
      message: "Avoid",
      level: "Cảnh báo",
      hazardType: "Flood",
      expiresAt: "23:00",
      channels: ["Web"],
    });
    expect(created).toMatchObject({ status: "active", id: "AL-0190" });
    expect(
      await service.update(created.id, { expiresAt: "23:30" }),
    ).toMatchObject({ expiresAt: "23:30" });
    expect((await service.endAlert(created.id)).alert.status).toBe("ended");
    expect(events.broadcast.mock.calls.map((x: any[]) => x[0])).toEqual([
      "alert.created",
      "alert.updated",
      "alert.ended",
    ]);
  });
  it("does not update missing alert", async () => {
    const service = new AlertsService({ findOne: async () => null } as any);
    await expect(service.update("missing", {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
