import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";

export class CreateDictItemDto {
  @ApiProperty({ description: "字典编码" })
  @IsString()
  dictCode: string;

  @ApiProperty({ description: "字典项标签" })
  @IsString()
  label: string;

  @ApiProperty({ description: "字典项值" })
  @IsString()
  value: string;

  @ApiProperty({ description: "排序" })
  @IsNumber()
  sort: number;

  @ApiProperty({ description: "状态(1-正常 0-停用)" })
  @IsNumber()
  status: number;

  @ApiProperty({ description: "标签类型" })
  @IsString()
  tagType: string;

  @ApiProperty({ description: "备注" })
  @IsString()
  @IsOptional()
  remark?: string;

  @ApiProperty({ description: "创建人ID" })
  @IsNumber()
  @IsOptional()
  createBy?: number;
}
