import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "src/common/dto/base-query.dto";

/**
 * 字典项查询参数
 */
export class DictItemQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;
}
