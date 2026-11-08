import { NestFactory } from "@nestjs/core";
import { Logger, RequestMethod, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";

/**
 * Khởi tạo ứng dụng NestJS SaigonDrain AI, cấu hình CORS, ValidationPipe và tài liệu Swagger.
 */
async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: "5mb" }));
  app.use(urlencoded({ extended: true, limit: "5mb" }));

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:5174"];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("SaigonDrain AI — Backend RESTful API (MVC)")
    .setDescription(
      "Hệ thống API điều hành chống ngập & dẫn đường an toàn TP.HCM (NestJS MVC + PostgreSQL + Open-Meteo Weather & Elevation + OSRM Routing + Photon/Nominatim Geocoding)",
    )
    .setVersion("1.0.0")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(
    `SaigonDrain AI Backend đang chạy tại: http://localhost:${port}/api`,
  );
  logger.log(`Swagger API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
