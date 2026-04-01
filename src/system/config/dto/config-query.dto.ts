import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "@/common/dto/base-query.dto";

/**
 * 系统配置查询参数
 */
export class ConfigQueryDto extends BaseQueryDto {
  @ApiProperty({ required: false, description: "关键字" })
  @IsOptional()
  @IsString()
  keywords?: string;
}
