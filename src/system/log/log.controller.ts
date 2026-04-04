import { Controller, Get, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/auth.decorator";
import { LogService } from "./log.service";
import { LogQueryDto } from "./dto/log-query.dto";

/**
 * 日志接口控制器
 */
@ApiTags("09.日志接口")
@Controller("logs")
export class LogController {
  constructor(private readonly logService: LogService) {}

  @ApiOperation({ summary: "日志分页列表" })
  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async getLogPage(@Query() query: LogQueryDto) {
    return await this.logService.getLogPage(query);
  }

  @Public()
  @ApiOperation({ summary: "访问趋势统计" })
  @Get("analytics/trend")
  async getVisitTrend(@Query("startDate") startDate: string, @Query("endDate") endDate: string) {
    return await this.logService.getVisitTrend(startDate, endDate);
  }

  @Public()
  @ApiOperation({ summary: "访问统计概览" })
  @Get("analytics/overview")
  async getVisitOverview() {
    return await this.logService.getVisitStats();
  }
}
