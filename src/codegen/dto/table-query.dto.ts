import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "../../common/dto/base-query.dto";

/**
 * 数据库表查询参数
 */
export class TableQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;
}
