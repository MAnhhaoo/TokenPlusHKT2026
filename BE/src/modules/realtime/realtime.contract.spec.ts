import { RealtimeService } from "./services/realtime.service";

describe("Realtime stream contracts", () => {
  afterEach(() => jest.useRealTimers());

  it("BE-RT01 emits welcome, business payload and heartbeat then stops after unsubscribe", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-07T00:00:00Z"));
    const service = new RealtimeService();
    const messages: any[] = [];
    const subscription = service
      .getStream()
      .subscribe((message) => messages.push(message));
    expect(messages.map((message) => message.type)).toEqual(["connected"]);
    service.broadcast("report.created", { id: "fixture-report" });
    expect(messages[1]).toMatchObject({
      type: "report.created",
      data: {
        event: "report.created",
        timestamp: "2026-11-07T00:00:00.000Z",
        data: { id: "fixture-report" },
      },
    });
    jest.advanceTimersByTime(25_000);
    expect(messages[2]).toMatchObject({
      type: "heartbeat",
      data: { data: { status: "alive" } },
    });
    expect(service.getStatus().totalBroadcasts).toBe(1);
    subscription.unsubscribe();
    service.broadcast("report.created", { id: "ignored" });
    jest.advanceTimersByTime(25_000);
    expect(messages).toHaveLength(3);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("BE-RT02 isolated service instances do not share events or counters", () => {
    const a = new RealtimeService(),
      b = new RealtimeService();
    a.broadcast("alert.created", { id: "fixture-alert" });
    expect(a.getStatus().totalBroadcasts).toBe(1);
    expect(b.getStatus().totalBroadcasts).toBe(0);
    expect(b.getStatus().endpoint).toBe("/api/realtime/stream");
  });
});
