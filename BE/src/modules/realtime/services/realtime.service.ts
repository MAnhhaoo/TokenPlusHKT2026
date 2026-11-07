import { Injectable, MessageEvent } from "@nestjs/common";
import { Observable, Subject, interval, map, merge } from "rxjs";

export type RealtimeEventType =
  | "connected"
  | "heartbeat"
  | "weather.updated"
  | "report.created"
  | "report.approved"
  | "report.rejected"
  | "alert.created"
  | "alert.updated"
  | "alert.ended"
  | "user.updated";

export interface RealtimePayload<T = unknown> {
  event: RealtimeEventType;
  timestamp: string;
  data: T;
}

@Injectable()
export class RealtimeService {
  private readonly eventSubject = new Subject<RealtimePayload>();
  private lastEventAt: string = new Date().toISOString();
  private totalBroadcasts = 0;

  /**
   * Phát sự kiện thời gian thực tới tất cả các trình khách đang đăng ký kênh SSE.
   */
  broadcast<T>(event: RealtimeEventType, data: T): void {
    const payload: RealtimePayload<T> = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    this.lastEventAt = payload.timestamp;
    this.totalBroadcasts += 1;
    this.eventSubject.next(payload);
  }

  /**
   * Khởi tạo luồng sự kiện SSE kết hợp sự kiện chào mừng, luồng nghiệp vụ và nhịp tim (heartbeat).
   */
  getStream(): Observable<MessageEvent> {
    const welcome$: Observable<MessageEvent> = new Observable((subscriber) => {
      const timestamp = new Date().toISOString();
      const message = "Đã kết nối kênh Realtime SSE SaigonDrain AI";
      subscriber.next({
        type: "connected",
        data: {
          event: "connected",
          timestamp,
          message,
          data: { message },
        },
      });
    });

    const heartbeat$: Observable<MessageEvent> = interval(25000).pipe(
      map(() => {
        const timestamp = new Date().toISOString();
        return {
          type: "heartbeat",
          data: {
            event: "heartbeat",
            timestamp,
            data: { status: "alive" },
          },
        };
      }),
    );

    const events$: Observable<MessageEvent> = this.eventSubject
      .asObservable()
      .pipe(
        map((payload) => ({
          type: payload.event,
          data: payload,
        })),
      );

    return merge(welcome$, events$, heartbeat$);
  }

  /**
   * Trả về trạng thái hoạt động hiện tại và thống kê tổng số sự kiện của kênh SSE.
   */
  getStatus() {
    return {
      protocol: "SSE (Server-Sent Events)",
      endpoint: "/api/realtime/stream",
      status: "online",
      lastEventAt: this.lastEventAt,
      totalBroadcasts: this.totalBroadcasts,
    };
  }
}
