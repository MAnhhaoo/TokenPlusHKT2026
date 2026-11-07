import { Test } from "@nestjs/testing";
import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import request = require("supertest");
import { ReportsController } from "../src/modules/reports/controllers/reports.controller";
import { ReportsService } from "../src/modules/reports/services/reports.service";
import { UsersController } from "../src/modules/users/controllers/users.controller";
import { UsersService } from "../src/modules/users/services/users.service";
import { AllExceptionsFilter } from "../src/common/filters/http-exception.filter";
import { TransformInterceptor } from "../src/common/interceptors/transform.interceptor";
import { issueSignedToken } from "../src/common/utils/auth-token.util";
describe("HTTP controllers with mocked providers", () => {
  let app: INestApplication;
  const reports = {
    create: jest.fn(async (x) => ({ id: "R", ...x })),
    approve: async () => ({ report: { status: "verified" } }),
    findOne: async () => {
      throw new NotFoundException("missing");
    },
  };
  const oldEnv = { ...process.env };
  beforeAll(async () => {
    process.env.REQUIRE_OPERATOR_AUTH = "true";
    process.env.OPERATOR_API_KEY = "http-key";
    const module = await Test.createTestingModule({
      controllers: [ReportsController, UsersController],
      providers: [
        { provide: ReportsService, useValue: reports },
        {
          provide: UsersService,
          useValue: {
            generateCsvContent: async () => '\uFEFF"Name"\r\n"User"',
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    process.env = oldEnv;
  });
  it("validation returns 400 envelope before provider call", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/reports")
      .send({ reportType: "invalid", severity: "invalid" })
      .expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      path: "/api/reports",
      message: expect.any(Array),
      timestamp: expect.any(String),
    });
    expect(reports.create).not.toHaveBeenCalled();
  });
  it("transforms numbers strips unknown fields and returns raw 201 payload", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/reports")
      .send({
        reportType: "flood",
        severity: "medium",
        reportedDepth: "24",
        injected: true,
      })
      .expect(201);
    expect(res.body).toEqual({
      id: "R",
      reportType: "flood",
      severity: "medium",
      reportedDepth: 24,
    });
  });
  it("rejects missing credentials and invalid bearer", async () => {
    await request(app.getHttpServer())
      .patch("/api/reports/R/approve")
      .expect(403);
    await request(app.getHttpServer())
      .patch("/api/reports/R/approve")
      .set("Authorization", "Bearer invalid")
      .expect(401);
  });
  it("accepts operator bearer with PATCH 200", async () => {
    const res = await request(app.getHttpServer())
      .patch("/api/reports/R/approve")
      .set("Authorization", `Bearer ${issueSignedToken("staff", "operator")}`)
      .expect(200);
    expect(res.body.report.status).toBe("verified");
  });
  it("rejects citizen bearer over HTTP [regression]", async () => {
    await request(app.getHttpServer())
      .patch("/api/reports/R/approve")
      .set("Authorization", `Bearer ${issueSignedToken("citizen")}`)
      .expect(403);
  });
  it("returns 404 envelopes for missing record and unknown route", async () => {
    for (const path of ["/api/reports/missing", "/api/unknown"]) {
      const res = await request(app.getHttpServer()).get(path).expect(404);
      expect(res.body).toMatchObject({
        statusCode: 404,
        path,
        message: expect.any(String),
      });
    }
  });
  it("exports CSV attachment with BOM", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/users/export-csv")
      .set("x-operator-key", "http-key")
      .expect(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment;");
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
  });
});
