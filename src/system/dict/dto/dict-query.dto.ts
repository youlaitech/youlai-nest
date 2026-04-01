import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "@/common/dto/base-query.dto";

/**
 * 字典查询参数
 */
export class DictQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;
}
