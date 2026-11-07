import { UsersService } from "./services/users.service";
import {
  hashPassword,
  verifySignedToken,
} from "../../common/utils/auth-token.util";
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
describe("Community user contracts", () => {
  const fixture = () => ({
    id: "U",
    name: 'A, "B"',
    initials: "AB",
    email: "a@example.test",
    phone: "090 123",
    district: "D",
    joinedAt: "today",
    lastActive: "now",
    reports: 0,
    verifiedReports: 0,
    rejectedReports: 0,
    trustScore: 85,
    identityVerified: true,
    status: "active",
    passwordHash: hashPassword("password"),
  });
  it("normalizes registration and excludes secrets from response and broadcast", async () => {
    const repo: any = {
      find: async () => [],
      create: (x: any) => x,
      save: async (x: any) => x,
    };
    const events: any = { broadcast: jest.fn() };
    const service = new UsersService(repo, events);
    const result = await service.register({
      name: " Test User ",
      email: " TEST@example.test ",
      phone: " 090123 ",
      district: " D ",
      password: "password",
    });
    expect(result.user).toMatchObject({
      name: "Test User",
      email: "test@example.test",
      phone: "090123",
    });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(verifySignedToken(result.token)?.role).toBe("citizen");
    const publicUser = events.broadcast.mock.calls[0][1].user;
    for (const key of ["email", "phone", "passwordHash"])
      expect(publicUser).not.toHaveProperty(key);
  });
  it("rejects normalized duplicate phone", async () => {
    const service = new UsersService({ find: async () => [fixture()] } as any);
    await expect(
      service.register({
        name: "Other",
        email: "b@example.test",
        phone: "090123",
        district: "D",
        password: "password",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it("rejects wrong password and blocked account", async () => {
    const user = fixture();
    const service = new UsersService({ find: async () => [user] } as any);
    await expect(
      service.login({ identifier: user.email, password: "wrong" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    user.status = "blocked";
    await expect(
      service.login({ identifier: user.email, password: "password" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("escapes CSV quotes commas and BOM without exporting credentials", async () => {
    const service = new UsersService({ find: async () => [fixture()] } as any);
    const csv = await service.generateCsvContent();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"A, ""B"""');
    expect(csv).not.toContain("a@example.test");
    expect(csv).not.toContain("passwordHash");
  });
});
