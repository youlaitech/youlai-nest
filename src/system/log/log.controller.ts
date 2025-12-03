import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LogService } from "./log.service";
import { LogPageQueryDto } from "./dto/log-page-query.dto";

@ApiTags("10.日志接口")
@Controller("logs")
export class LogController {
  constructor(private readonly logService: LogService) {}

  @ApiOperation({ summary: "日志分页列表" })
  @Get("page")
  async getLogPage(@Query() query: LogPageQueryDto) {
    return await this.logService.getLogPage(query);
  }

  @ApiOperation({ summary: "获取访问趋势" })
  @Get("visit-trend")
  async getVisitTrend(@Query("startDate") startDate: string, @Query("endDate") endDate: string) {
    return await this.logService.getVisitTrend(startDate, endDate);
  }

  @ApiOperation({ summary: "获取访问统计" })
  @Get("visit-stats")
  async getVisitStats() {
    return await this.logService.getVisitStats();
  }
}
