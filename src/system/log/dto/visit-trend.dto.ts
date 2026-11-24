import { ApiProperty } from "@nestjs/swagger";

/**
 * 单日访问量
 */
export class VisitTrendPointDto {
  @ApiProperty({ description: "日期 yyyy-MM-dd" })
  date: string;

  @ApiProperty({ description: "浏览量" })
  pv: number;

  @ApiProperty({ description: "访客数" })
  uv: number;
}

/**
 * 访问趋势数据
 */
export class VisitTrendDto {
  @ApiProperty({ description: "查询开始日期" })
  startDate: string;

  @ApiProperty({ description: "查询结束日期" })
  endDate: string;

  @ApiProperty({ description: "逐日访问量", type: [VisitTrendPointDto] })
  points: VisitTrendPointDto[];
}
