import { IsOptional, IsNumber, IsString, IsArray, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";

/**
 * 用户分页查询对象
 */
export class UserPageQueryDto {
  @ApiProperty({ description: "页码", default: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  pageNum: number = 1;

  @ApiProperty({ description: "每页大小", default: 10, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => Number(value))
  pageSize: number = 10;

  @ApiProperty({ description: "关键字(用户名/昵称/手机号)", required: false })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiProperty({ description: "用户状态(1-正常 0-禁用)", required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === undefined ? undefined : Number(value))
  status?: number;

  @ApiProperty({ description: "部门ID", required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => value === undefined ? undefined : Number(value))
  deptId?: number;

  @ApiProperty({ description: "角色ID集合", required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  roleIds?: number[];

  @ApiProperty({ description: "创建开始时间", required: false })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiProperty({ description: "创建结束时间", required: false })
  @IsOptional()
  @IsString()
  endTime?: string;
}
