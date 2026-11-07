import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, T> {
  /**
   * Chuyển tiếp dữ liệu phản hồi từ controller qua luồng Observable chuẩn.
   */
  intercept(_context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(map((data) => data));
  }
}
