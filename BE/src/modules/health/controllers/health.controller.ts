import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Check whether the API process is running" })
  @ApiOkResponse({ description: "API process is healthy" })
  check() {
    return {
      status: "ok",
      version: process.env.K_REVISION || "local",
    };
  }
}
