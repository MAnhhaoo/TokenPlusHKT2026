import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  SignedTokenPayload,
  verifySignedToken,
} from "../utils/auth-token.util";

export interface AuthenticatedRequest {
  headers?: Record<string, string | string[] | undefined>;
  operator?: SignedTokenPayload;
}

/**
 * Guard kiểm soát quyền truy cập cho các tác vụ điều hành (Operator / Coordinator).
 * Khi bật REQUIRE_OPERATOR_AUTH=true, bắt buộc xác thực Bearer token hợp lệ hoặc x-operator-key.
 */
@Injectable()
export class OperatorAuthGuard implements CanActivate {
  /**
   * Kiểm tra thông tin xác thực của điều phối viên trên request hiện tại.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const headers = request?.headers ?? {};

    const authHeaderRaw = headers.authorization ?? headers.Authorization;
    const authHeader = Array.isArray(authHeaderRaw)
      ? authHeaderRaw[0]
      : authHeaderRaw;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      const verified = verifySignedToken(token);
      if (!verified) {
        throw new UnauthorizedException(
          "Token xác thực không hợp lệ hoặc đã hết hạn.",
        );
      }
      request.operator = verified;
      return true;
    }

    const operatorKeyRaw = headers["x-operator-key"];
    const operatorKey = Array.isArray(operatorKeyRaw)
      ? operatorKeyRaw[0]
      : operatorKeyRaw;
    const configuredKey = process.env.OPERATOR_API_KEY;
    if (
      configuredKey &&
      typeof operatorKey === "string" &&
      operatorKey === configuredKey
    ) {
      request.operator = {
        sub: "operator-key",
        role: "operator",
        iat: Date.now(),
        exp: Date.now() + 3600_000,
      };
      return true;
    }

    const strictAuth = process.env.REQUIRE_OPERATOR_AUTH === "true";
    if (strictAuth) {
      throw new ForbiddenException(
        "Yêu cầu quyền Điều phối viên (Bearer token hoặc x-operator-key) để thực hiện thao tác này.",
      );
    }

    request.operator = {
      sub: "operator-demo",
      role: "operator",
      iat: Date.now(),
      exp: Date.now() + 3600_000,
    };
    return true;
  }
}
