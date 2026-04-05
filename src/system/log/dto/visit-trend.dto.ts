import { ApiProperty } from "@nestjs/swagger";

/**
 * 访问趋势数据
 */
export class VisitTrendDto {
  @ApiProperty({ description: "日期列表" })
  dates: string[];

  @ApiProperty({ description: "浏览量(PV)" })
  pvList: number[];

  @ApiProperty({ description: "访客数(UV)" })
  uvList: number[];
}
