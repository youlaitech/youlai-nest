import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

import { BaseQueryDto } from "src/common/dto/base-query.dto";

/**
 * 用户查询对象
 */
export class UserQueryDto extends BaseQueryDto {
  @ApiProperty({ description: "关键字(用户名/昵称/手机号)", required: false })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiProperty({ description: "用户状态(1-正常 0-禁用)", required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  status?: number;

  @ApiProperty({ description: "部门ID", required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  deptId?: string;

  @ApiProperty({ description: "角色ID集合", required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (Array.isArray(value)) return value.map((v) => String(v));
    return [String(value)];
  })
  @IsString({ each: true })
  roleIds?: string[];

  @ApiProperty({ description: "创建开始时间", required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: "创建结束时间", required: false })
  @IsOptional()
  @IsString()
  endTime?: string;
}
