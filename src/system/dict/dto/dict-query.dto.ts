import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "src/common/dto/base-query.dto";

export class DictQueryDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  keywords?: string;
}
