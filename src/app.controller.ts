import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AppService } from "./app.service";

/**
 * 应用入口控制器
 */
@ApiExcludeController()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
