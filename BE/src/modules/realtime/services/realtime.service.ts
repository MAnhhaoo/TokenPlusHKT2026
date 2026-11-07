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

  getStream(): Observable<MessageEvent> {
    const welcome$: Observable<MessageEvent> = new Observable((subscriber) => {
      subscriber.next({
        type: "connected",
        data: {
          event: "connected",
          timestamp: new Date().toISOString(),
          message: "Đã kết nối kênh Realtime SSE SaigonDrain AI",
        },
      });
    });

    const heartbeat$: Observable<MessageEvent> = interval(25000).pipe(
      map(() => ({
        type: "heartbeat",
        data: {
          event: "heartbeat",
          timestamp: new Date().toISOString(),
        },
      })),
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
