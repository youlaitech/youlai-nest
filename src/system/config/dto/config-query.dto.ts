import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "src/common/dto/base-query.dto";

export class ConfigQueryDto extends BaseQueryDto {
  @ApiProperty({ required: false, description: "关键字" })
  @IsOptional()
  @IsString()
  keywords?: string;
}
