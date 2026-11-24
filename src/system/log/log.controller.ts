import { Controller, Get, Query, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../common/decorators/auth.decorator";
import { LogService } from "./log.service";
import { LogQueryDto } from "./dto/log-query.dto";
import { VisitTrendQueryDto } from "./dto/visit-trend-query.dto";

/**
 * 日志接口控制器
 */
@ApiTags("09.日志接口")
@Controller("logs")
export class LogController {
  constructor(private readonly logService: LogService) {}

  @ApiOperation({ summary: "日志分页列表" })
  @Get()
  @Permissions("sys:log:list")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  async getLogPage(@Query() query: LogQueryDto) {
    return await this.logService.getLogPage(query);
  }
}

/**
 * 统计接口控制器
 *
 * 访问统计按服务器配置的时区以自然日聚合，统计区间为闭区间。
 */
@ApiTags("10.统计接口")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly logService: LogService) {}

  @ApiOperation({ summary: "访问汇总" })
  @Get("visits/summary")
  async getVisitSummary() {
    return await this.logService.getVisitSummary();
  }

  @ApiOperation({ summary: "访问趋势" })
  @Get("visits/trend")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getVisitTrend(@Query() query: VisitTrendQueryDto) {
    return await this.logService.getVisitTrend(query.startDate, query.endDate);
  }

  @ApiOperation({ summary: "用户汇总" })
  @Get("users/summary")
  async getUserSummary() {
    return await this.logService.getUserSummary();
  }
}
