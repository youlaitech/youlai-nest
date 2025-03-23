import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class BaseDto {
  @ApiProperty({ type: String, format: "date-time" })
  @Type(() => Date)
  createTime: Date;

  @ApiProperty({ type: String, format: "date-time" })
  @Type(() => Date)
  updateTime: Date;

  @ApiProperty({ required: false })
  isDeleted?: number;

  @ApiProperty({ required: false })
  deptTreePath?: string;

  @ApiProperty({ required: false })
  createBy?: string;

  @ApiProperty({ required: false })
  updateBy?: string;
}
