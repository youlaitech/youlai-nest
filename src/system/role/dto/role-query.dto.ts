import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "src/common/dto/base-query.dto";

export class RoleQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;
}
