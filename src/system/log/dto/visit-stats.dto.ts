import { ApiProperty } from "@nestjs/swagger";

/**
 * 访问汇总数据
 */
export class VisitSummaryDto {
  @ApiProperty({ description: "今日访客数" })
  todayUv: number;

  @ApiProperty({ description: "昨日访客数" })
  yesterdayUv: number;

  @ApiProperty({ description: "累计访客数" })
  totalUv: number;

  @ApiProperty({ description: "今日浏览量" })
  todayPv: number;

  @ApiProperty({ description: "昨日浏览量" })
  yesterdayPv: number;

  @ApiProperty({ description: "累计浏览量" })
  totalPv: number;

  @ApiProperty({ description: "访客增长率；昨日为 0 时为 null", nullable: true })
  uvGrowthRate: number | null;

  @ApiProperty({ description: "浏览量增长率；昨日为 0 时为 null", nullable: true })
  pvGrowthRate: number | null;
}

/**
 * 用户汇总数据
 */
export class UserSummaryDto {
  @ApiProperty({ description: "用户总数" })
  total: number;
}
