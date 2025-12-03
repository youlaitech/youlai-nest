import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateDeptDto {
  @ApiProperty({ description: "部门名称", required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "部门编号", required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: "父节点id", required: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  parentId?: number;

  @ApiProperty({ description: "显示顺序", required: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  sort?: number;

  @ApiProperty({ description: "状态(1-正常 0-禁用)", required: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @IsIn([0, 1], { message: "状态只能是0或1" })
  status?: number;

  @ApiProperty({ description: "修改人ID", required: false })
  @IsOptional()
  @IsNumber()
  updateBy?: number;
}
