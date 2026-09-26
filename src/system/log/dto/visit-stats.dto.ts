import { ApiProperty } from "@nestjs/swagger";

/**
 * 访问统计数据
 */
export class VisitStatsDto {
  @ApiProperty({ description: "今日独立访客数 (UV)" })
  todayUvCount: number | null;

  @ApiProperty({ description: "累计独立访客数 (UV)" })
  totalUvCount: number | null;

  @ApiProperty({ description: "独立访客增长率", example: 12.34 })
  uvGrowthRate: number | null;

  @ApiProperty({ description: "今日页面浏览量 (PV)" })
  todayPvCount: number | null;

  @ApiProperty({ description: "累计页面浏览量 (PV)" })
  totalPvCount: number | null;

  @ApiProperty({ description: "页面浏览量增长率", example: 8.88 })
  pvGrowthRate: number | null;
}
