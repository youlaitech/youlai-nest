import { Controller, Get, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LogService } from "./log.service";
import { LogQueryDto } from "./dto/log-query.dto";

/**
 * 日志接口控制器
 */
@ApiTags("10.日志接口")
@Controller("logs")
export class LogController {
  constructor(private readonly logService: LogService) {}

  @ApiOperation({ summary: "日志分页列表" })
  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async getLogPage(@Query() query: LogQueryDto) {
    return await this.logService.getLogPage(query);
  }
}
