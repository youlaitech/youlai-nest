import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "src/common/dto/base-query.dto";

/**
 * 角色查询参数
 */
export class RoleQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;
}
