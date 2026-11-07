import { createHash } from "node:crypto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import {
  hashPassword,
  verifyPassword,
  issueSignedToken,
  verifySignedToken,
} from "./utils/auth-token.util";
import { OperatorAuthGuard } from "./guards/operator-auth.guard";

describe("Security contracts", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
    jest.useRealTimers();
  });
  it("salts passwords and rejects wrong and missing passwords", () => {
    const a = hashPassword("correct horse");
    expect(a).not.toBe(hashPassword("correct horse"));
    expect(verifyPassword("correct horse", a)).toBe(true);
    expect(verifyPassword("wrong", a)).toBe(false);
    expect(verifyPassword("wrong", null)).toBe(false);
  });
  it("supports legacy SHA256 passwords", () => {
    expect(
      verifyPassword(
        "legacy",
        createHash("sha256").update("legacy").digest("hex"),
      ),
    ).toBe(true);
  });
  it("rejects malformed stored password hashes [regression]", () => {
    expect(verifyPassword("any password", "zz:zz")).toBe(false);
  });
  it("checks signed token tampering expiry and secret rotation", () => {
    jest.useFakeTimers().setSystemTime(1000);
    const token = issueSignedToken("op", "operator", 100);
    expect(verifySignedToken(token)?.sub).toBe("op");
    expect(verifySignedToken(token + "x")).toBeNull();
    jest.setSystemTime(1101);
    expect(verifySignedToken(token)).toBeNull();
    jest.setSystemTime(1000);
    process.env.AUTH_TOKEN_SECRET = "changed";
    expect(verifySignedToken(token)).toBeNull();
  });
  it.each(["operator", "coordinator"] as const)(
    "accepts a valid %s bearer",
    (role) => {
      const req: any = {
        headers: { authorization: `Bearer ${issueSignedToken("staff", role)}` },
      };
      expect(
        new OperatorAuthGuard().canActivate({
          switchToHttp: () => ({ getRequest: () => req }),
        } as any),
      ).toBe(true);
      expect(req.operator.role).toBe(role);
    },
  );
  it("rejects citizen bearer on operator actions [regression]", () => {
    process.env.REQUIRE_OPERATOR_AUTH = "true";
    const req = {
      headers: { authorization: `Bearer ${issueSignedToken("citizen")}` },
    };
    expect(() =>
      new OperatorAuthGuard().canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
      } as any),
    ).toThrow(ForbiddenException);
  });
  it("requires credentials in strict mode and rejects invalid bearer even in demo mode", () => {
    const context = (headers: any) =>
      ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;
    process.env.REQUIRE_OPERATOR_AUTH = "true";
    expect(() => new OperatorAuthGuard().canActivate(context({}))).toThrow(
      ForbiddenException,
    );
    process.env.REQUIRE_OPERATOR_AUTH = "false";
    expect(() =>
      new OperatorAuthGuard().canActivate(
        context({ authorization: "Bearer broken" }),
      ),
    ).toThrow(UnauthorizedException);
    process.env.OPERATOR_API_KEY = "test-key";
    expect(
      new OperatorAuthGuard().canActivate(
        context({ "x-operator-key": "test-key" }),
      ),
    ).toBe(true);
    expect(new OperatorAuthGuard().canActivate(context({}))).toBe(true);
  });
});
