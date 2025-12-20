import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LogService } from "../log/log.service";

@ApiTags("11.统计分析")
@Controller("statistics")
export class StatisticsController {
  constructor(private readonly logService: LogService) {}

  @ApiOperation({ summary: "访问趋势统计" })
  @Get("visits/trend")
  async getVisitTrend(@Query("startDate") startDate: string, @Query("endDate") endDate: string) {
    return await this.logService.getVisitTrend(startDate, endDate);
  }

  @ApiOperation({ summary: "访问概览统计" })
  @Get("visits/overview")
  async getVisitOverview() {
    return await this.logService.getVisitStats();
  }
}
